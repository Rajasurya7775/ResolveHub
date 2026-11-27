import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DiscussionMessage } from '../../types/issue';
import { User } from '../../types/user';

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface IssueCollaborationThreadProps {
  messages: DiscussionMessage[];
  currentUser: User | null;
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onEditMessage?: (messageId: string, updatedText: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  isSending: boolean;
  fetchError: string | null;
  sendError: string | null;
  isWebSocketConnected?: boolean;
  onRetryFetch?: () => void;
  onDismissSendError?: () => void;
}

interface ContextMenuState {
  message: DiscussionMessage;
  clickX: number;
  clickY: number;
}

/**
 * Parses message createdAt/updatedAt timestamps safely, treating naive ISO strings
 * from FastAPI as UTC when they do not overshoot local current time.
 */
function parseCreatedAtMs(createdAt?: string): number {
  if (!createdAt || typeof createdAt !== 'string' || !createdAt.trim()) {
    return NaN;
  }
  const trimmed = createdAt.trim();
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    return new Date(trimmed).getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(trimmed)) {
    const iso = trimmed.replace(' ', 'T');
    const utcMs = new Date(`${iso}Z`).getTime();
    if (!isNaN(utcMs) && utcMs <= Date.now() + 60_000) {
      return utcMs;
    }
    return new Date(iso).getTime();
  }
  return new Date(trimmed).getTime();
}

/**
 * Determines whether a discussion message belongs to the currently logged-in user
 * using the actual API sender fields and authenticated user context.
 */
export function isMessageFromCurrentUser(msg: DiscussionMessage, currentUser: User | null): boolean {
  if (!currentUser) return false;

  const msgSenderId = String(msg.senderId || '').trim();
  const userId = String(currentUser.id || '').trim();
  const empId = String(currentUser.employeeId || '').trim();

  if (msgSenderId) {
    if ((userId && msgSenderId === userId) || (empId && msgSenderId === empId)) {
      return true;
    }
    if (/^\d+$/.test(msgSenderId) && /^\d+$/.test(userId) && msgSenderId !== userId) {
      return false;
    }
  }

  const msgName = String(msg.senderName || '').trim().toLowerCase();
  const userName = String(currentUser.name || '').trim().toLowerCase();
  if (msgName && userName && msgName === userName) {
    return true;
  }

  return false;
}

/**
 * Evaluates 15-minute edit eligibility strictly from the backend API createdAt timestamp.
 */
export function isWithinEditWindow(createdAt?: string, nowMs: number = Date.now()): boolean {
  const createdMs = parseCreatedAtMs(createdAt);
  if (isNaN(createdMs) || createdMs <= 0) {
    return false;
  }
  return nowMs - createdMs <= MESSAGE_EDIT_WINDOW_MS;
}

/**
 * Returns local calendar date key (YYYY-MM-DD) and WhatsApp-style display label
 * ("Today", "Yesterday", or "Nov 18, 2026") for message grouping.
 */
function getDateGroupInfo(createdAt?: string): { key: string; label: string } {
  const ms = parseCreatedAtMs(createdAt);
  if (isNaN(ms)) {
    return { key: '', label: '' };
  }

  const msgDate = new Date(ms);
  const key = `${msgDate.getFullYear()}-${msgDate.getMonth() + 1}-${msgDate.getDate()}`;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const msgDayStart = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()).getTime();
  const diffDays = Math.round((todayStart - msgDayStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return { key, label: 'Today' };
  }
  if (diffDays === 1) {
    return { key, label: 'Yesterday' };
  }

  const label = msgDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return { key, label };
}

/**
 * Extracts time-only string (e.g. "04:20 PM") from backend createdAt / timestamp.
 */
function formatTimeOnly(createdAt?: string, fallbackTimestamp?: string): string {
  const ms = parseCreatedAtMs(createdAt);
  if (!isNaN(ms)) {
    return new Date(ms).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  if (fallbackTimestamp) {
    const bulletSplit = fallbackTimestamp.split('•');
    if (bulletSplit.length > 1) {
      return bulletSplit[bulletSplit.length - 1].trim();
    }
    return fallbackTimestamp;
  }

  return '';
}

export const IssueCollaborationThread: React.FC<IssueCollaborationThreadProps> = ({
  messages,
  currentUser,
  messageText,
  onMessageTextChange,
  onSendMessage,
  onEditMessage,
  isLoading,
  isSending,
  fetchError,
  sendError,
  isWebSocketConnected = false,
  onRetryFetch,
  onDismissSendError
}) => {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // WhatsApp-style right-click context menu state (Edit only)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; ready: boolean }>({
    left: 0,
    top: 0,
    ready: false
  });
  const [isEditHovered, setIsEditHovered] = useState<boolean>(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Automatically expire 15-minute edit eligibility in real time
  useEffect(() => {
    const remainingWindows = messages
      .filter((m) => isMessageFromCurrentUser(m, currentUser) && m.createdAt)
      .map((m) => {
        const createdMs = parseCreatedAtMs(m.createdAt);
        if (isNaN(createdMs)) return -1;
        return createdMs + MESSAGE_EDIT_WINDOW_MS - Date.now();
      })
      .filter((rem) => rem > 0);

    if (remainingWindows.length === 0) return;

    const nearestExpiryMs = Math.min(...remainingWindows);
    const delay = Math.min(Math.max(nearestExpiryMs + 250, 1000), 15000);

    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, delay);

    return () => clearTimeout(timer);
  }, [messages, currentUser, nowMs]);

  const canMessageBeEdited = (msg: DiscussionMessage, checkNowMs: number): boolean => {
    return (
      !msg.id.startsWith('temp-') &&
      editingMessageId !== msg.id &&
      Boolean(onEditMessage) &&
      isMessageFromCurrentUser(msg, currentUser) &&
      isWithinEditWindow(msg.createdAt, checkNowMs)
    );
  };

  const contextMsg = contextMenu?.message;
  const canEditContextMsg = Boolean(contextMsg && canMessageBeEdited(contextMsg, nowMs));

  // Automatically close open menu if 15-minute window expires while menu is open
  useEffect(() => {
    if (contextMenu && !canEditContextMsg) {
      setContextMenu(null);
    }
  }, [contextMenu, canEditContextMsg]);

  // Position context menu safely inside viewport bounds without overflowing the screen
  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const rect = contextMenuRef.current.getBoundingClientRect();
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = contextMenu.clickX;
    if (left + rect.width + margin > vw) {
      left = contextMenu.clickX - rect.width;
    }
    left = Math.max(margin, Math.min(left, Math.max(margin, vw - rect.width - margin)));

    let top = contextMenu.clickY;
    if (top + rect.height + margin > vh) {
      top = contextMenu.clickY - rect.height;
    }
    top = Math.max(margin, Math.min(top, Math.max(margin, vh - rect.height - margin)));

    setMenuPosition({ left, top, ready: true });
  }, [contextMenu]);

  // Close context menu when clicking outside, pressing Escape, scrolling, resizing, or blurring window
  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsidePointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const handleCloseMenu = () => {
      setContextMenu(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('resize', handleCloseMenu);
    window.addEventListener('blur', handleCloseMenu);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('resize', handleCloseMenu);
      window.removeEventListener('blur', handleCloseMenu);
    };
  }, [contextMenu]);

  const handleThreadContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea')) {
      if (contextMenu) setContextMenu(null);
      return;
    }
    e.preventDefault();
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  const handleMessageContextMenu = (e: React.MouseEvent, msg: DiscussionMessage) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea')) {
      if (contextMenu) setContextMenu(null);
      return;
    }

    // Always block the browser's default context menu on messages
    e.preventDefault();
    e.stopPropagation();

    const currentNow = Date.now();
    setNowMs(currentNow);

    // Show Edit menu ONLY for the logged-in user's own messages within 15 minutes
    if (!canMessageBeEdited(msg, currentNow)) {
      setContextMenu(null);
      return;
    }

    setIsEditHovered(false);
    setMenuPosition({
      left: e.clientX,
      top: e.clientY,
      ready: false
    });
    setContextMenu({
      message: msg,
      clickX: e.clientX,
      clickY: e.clientY
    });
  };

  const handleStartEdit = (msg: DiscussionMessage) => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    setContextMenu(null);
    if (!isMessageFromCurrentUser(msg, currentUser) || !isWithinEditWindow(msg.createdAt, currentNow)) {
      return;
    }
    setEditingMessageId(msg.id);
    setEditingText(msg.markdown || msg.message || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
    setEditError(null);
  };

  const handleSaveEdit = async (msg: DiscussionMessage) => {
    const currentNow = Date.now();
    setNowMs(currentNow);

    if (!isMessageFromCurrentUser(msg, currentUser)) {
      setEditError('You can only edit your own messages.');
      return;
    }

    if (!isWithinEditWindow(msg.createdAt, currentNow)) {
      setEditError('The 15-minute editing window for this message has expired.');
      return;
    }

    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditError('Message cannot be empty.');
      return;
    }

    const originalText = (msg.markdown || msg.message || '').trim();
    if (trimmed === originalText) {
      handleCancelEdit();
      return;
    }

    if (!onEditMessage) return;

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const result = await onEditMessage(msg.id, trimmed);
      if (result.success) {
        setEditingMessageId(null);
        setEditingText('');
        setEditError(null);
      } else {
        setEditError(result.error || 'Failed to update message.');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update message.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  let lastDateKey = '';

  const contextMenuNode =
    contextMenu &&
    contextMsg &&
    canEditContextMsg &&
    typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={contextMenuRef}
            role="menu"
            className="bg-white border py-1"
            style={{
              position: 'fixed',
              left: `${menuPosition.left}px`,
              top: `${menuPosition.top}px`,
              visibility: menuPosition.ready ? 'visible' : 'hidden',
              zIndex: 2050,
              minWidth: '150px',
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)'
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="btn btn-link text-decoration-none text-navy w-100 text-start px-3 py-2 d-flex align-items-center gap-2.5 rounded-0 border-0 shadow-none"
              style={{
                fontSize: '0.84rem',
                fontWeight: 500,
                backgroundColor: isEditHovered ? '#f1f5f9' : 'transparent',
                transition: 'background-color 0.12s ease'
              }}
              onMouseEnter={() => setIsEditHovered(true)}
              onMouseLeave={() => setIsEditHovered(false)}
              onClick={() => handleStartEdit(contextMsg)}
            >
              <i className="bi bi-pencil text-primary" style={{ fontSize: '0.88rem' }}></i>
              <span>Edit</span>
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="card border-0 shadow-sm rounded-3 bg-white h-100 d-flex flex-column overflow-hidden position-relative">
      {/* Thread Header */}
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between gap-2 bg-white flex-shrink-0">
        <div className="d-flex align-items-center gap-2.5 min-w-0">
          <i className="bi bi-chat-dots-fill text-primary fs-5 flex-shrink-0"></i>
          <div className="min-w-0">
            <h6 className="fw-bold text-navy mb-0 text-truncate" style={{ fontSize: '0.95rem' }}>
              Incident Collaboration Thread
            </h6>
            <small className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>
              Right-click your message to edit within 15 min
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
          <span
            className="badge rounded-pill px-2.5 py-1 fw-semibold d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: isWebSocketConnected ? '#ecfdf5' : '#f1f5f9',
              color: isWebSocketConnected ? '#059669' : '#64748b',
              border: `1px solid ${isWebSocketConnected ? '#a7f3d0' : '#e2e8f0'}`,
              fontSize: '0.72rem'
            }}
            title={
              isWebSocketConnected
                ? 'Message WebSocket connected'
                : 'Message WebSocket disconnected — attempting reconnect'
            }
          >
            <span
              className="rounded-circle"
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: isWebSocketConnected ? '#10b981' : '#94a3b8'
              }}
            ></span>
            <span>{isWebSocketConnected ? 'WS Live' : 'Connecting...'}</span>
          </span>

          <span
            className="badge rounded-pill px-3 py-1.5 fw-medium"
            style={{
              backgroundColor: '#eef2f6',
              color: '#334155',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem'
            }}
          >
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="alert alert-warning rounded-0 border-0 border-bottom py-2 px-3 mb-0 small d-flex align-items-center justify-content-between gap-2 flex-shrink-0">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
            <span className="text-truncate" title={fetchError}>{fetchError}</span>
          </div>
          {onRetryFetch && (
            <button
              type="button"
              className="btn btn-sm btn-outline-dark py-0 px-2 flex-shrink-0"
              onClick={onRetryFetch}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Scrollable Message List */}
      <div
        ref={messageListRef}
        onContextMenu={handleThreadContextMenu}
        className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-2.5 bg-light bg-opacity-50 min-h-0"
        style={{ overscrollBehavior: 'contain' }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="my-auto text-center py-5 px-3">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
              <span className="visually-hidden">Loading messages...</span>
            </div>
            <p className="text-secondary small mb-0" style={{ fontSize: '0.82rem' }}>
              Loading discussion messages...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto text-center py-5 px-3">
            <div
              className="rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: '56px', height: '56px' }}
            >
              <i className="bi bi-chat-square-text fs-4"></i>
            </div>
            <h6 className="fw-bold text-navy mb-1" style={{ fontSize: '0.95rem' }}>
              No messages yet in this discussion.
            </h6>
            <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>
              Start the collaboration by sending a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const { key: dateKey, label: dateLabel } = getDateGroupInfo(msg.createdAt);
            const showDateHeader = Boolean(dateKey && dateLabel && dateKey !== lastDateKey);
            if (dateKey) {
              lastDateKey = dateKey;
            }

            const isSender = isMessageFromCurrentUser(msg, currentUser);
            const displayName = msg.senderName || (isSender ? currentUser?.name : '') || 'Unknown User';
            const avatarLetter = displayName.charAt(0).toUpperCase();
            const isCurrentlyEditing = editingMessageId === msg.id;
            const isMenuTargeted = contextMenu?.message.id === msg.id;
            const canEditBubble = canMessageBeEdited(msg, nowMs);
            const timeOnly = formatTimeOnly(msg.createdAt, msg.timestamp);

            return (
              <React.Fragment key={msg.id}>
                {/* WhatsApp-style Date Grouping Header (Today / Yesterday / Date) */}
                {showDateHeader && (
                  <div className="d-flex justify-content-center my-1.5">
                    <span
                      className="badge rounded-pill px-3 py-1 fw-semibold shadow-2xs"
                      style={{
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        fontSize: '0.72rem'
                      }}
                    >
                      {dateLabel}
                    </span>
                  </div>
                )}

                <div
                  className={`d-flex align-items-end gap-2 ${
                    isSender ? 'justify-content-end' : 'justify-content-start'
                  }`}
                >
                  {/* Receiver Avatar on LEFT */}
                  {!isSender && (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-2xs flex-shrink-0 mb-3"
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '0.85rem',
                        backgroundColor: '#475569'
                      }}
                      title={displayName}
                    >
                      {avatarLetter}
                    </div>
                  )}

                  {/* Message Column */}
                  <div
                    className={`d-flex flex-column ${isSender ? 'align-items-end' : 'align-items-start'}`}
                    style={{ maxWidth: 'min(82%, 440px)', minWidth: 0 }}
                  >
                    {/* Sender Name Only (No Role Badges) */}
                    <div
                      className={`d-flex align-items-center gap-1.5 mb-1 ${
                        isSender ? 'justify-content-end' : 'justify-content-start'
                      }`}
                    >
                      <span className="fw-semibold text-navy" style={{ fontSize: '0.78rem' }}>
                        {displayName}
                      </span>
                    </div>

                    {/* Message Bubble or Inline Edit Form */}
                    {isCurrentlyEditing ? (
                      <div
                        className="p-2.5 rounded-3 bg-white border shadow-sm w-100"
                        style={{ borderColor: '#93c5fd', minWidth: '240px' }}
                      >
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows={3}
                          value={editingText}
                          onChange={(e) => {
                            setEditingText(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          disabled={isSavingEdit}
                          autoFocus
                          style={{ fontSize: '0.86rem', resize: 'vertical' }}
                        />

                        {!isWithinEditWindow(msg.createdAt, nowMs) && (
                          <div className="text-danger small mb-2" style={{ fontSize: '0.74rem' }}>
                            <i className="bi bi-clock-history me-1"></i>
                            The 15-minute editing window has expired.
                          </div>
                        )}

                        {editError && (
                          <div className="text-danger small mb-2" style={{ fontSize: '0.74rem' }}>
                            <i className="bi bi-exclamation-circle me-1"></i>
                            {editError}
                          </div>
                        )}

                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border rounded-pill px-2.5 py-0.5"
                            style={{ fontSize: '0.76rem' }}
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill px-3 py-0.5 fw-semibold"
                            style={{ fontSize: '0.76rem' }}
                            onClick={() => handleSaveEdit(msg)}
                            disabled={
                              isSavingEdit ||
                              !editingText.trim() ||
                              !isWithinEditWindow(msg.createdAt, nowMs)
                            }
                          >
                            {isSavingEdit ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Saving
                              </>
                            ) : (
                              'Save'
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                        className="px-3 py-2.5 shadow-2xs"
                        style={{
                          backgroundColor: isSender ? '#0d6efd' : '#ffffff',
                          color: isSender ? '#ffffff' : '#1e293b',
                          border: isMenuTargeted
                            ? '2px solid #93c5fd'
                            : isSender
                              ? '1px solid #0d6efd'
                              : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          borderBottomRightRadius: isSender ? '4px' : '16px',
                          borderBottomLeftRadius: isSender ? '16px' : '4px',
                          fontSize: '0.87rem',
                          lineHeight: 1.48,
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '100%',
                          cursor: canEditBubble ? 'context-menu' : 'default',
                          transition: 'box-shadow 0.12s ease'
                        }}
                        title={canEditBubble ? 'Right-click to edit' : undefined}
                      >
                        {msg.markdown || msg.message}

                        {msg.attachment && (
                          <div className="mt-2">
                            <div
                              className="d-inline-flex align-items-center gap-2 px-2.5 py-1 rounded-pill border"
                              style={{
                                backgroundColor: isSender ? 'rgba(255,255,255,0.16)' : '#f8fafc',
                                borderColor: isSender ? 'rgba(255,255,255,0.35)' : '#cbd5e1',
                                fontSize: '0.78rem'
                              }}
                            >
                              <i className="bi bi-paperclip"></i>
                              <span className="fw-medium text-truncate" style={{ maxWidth: '180px' }}>
                                {msg.attachment.name}
                              </span>
                              {msg.attachment.size && <span className="opacity-75">({msg.attachment.size})</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reaction badge if returned by API */}
                    {msg.reaction && (
                      <div
                        className="d-inline-flex align-items-center gap-1 px-2 py-0.5 rounded-pill bg-white border mt-1 shadow-2xs"
                        style={{ borderColor: '#e2e8f0', fontSize: '0.74rem' }}
                      >
                        <span>{msg.reaction}</span>
                      </div>
                    )}

                    {/* Time-only Timestamp & Edited Indicator BELOW the Message Bubble */}
                    {(timeOnly || msg.isEdited) && (
                      <div
                        className={`d-flex flex-wrap align-items-center gap-1.5 mt-1 text-secondary ${
                          isSender ? 'justify-content-end' : 'justify-content-start'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {msg.isEdited && (
                          <span
                            className="fw-medium fst-italic"
                            style={{ color: isSender ? '#2563eb' : '#64748b' }}
                          >
                            Edited
                          </span>
                        )}
                        {msg.isEdited && timeOnly && <span>•</span>}
                        {timeOnly && <span>{timeOnly}</span>}
                      </div>
                    )}
                  </div>

                  {/* Sender Avatar on RIGHT */}
                  {isSender && (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-2xs flex-shrink-0 mb-3"
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '0.85rem',
                        backgroundColor: '#0d6efd'
                      }}
                      title={displayName}
                    >
                      {avatarLetter}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {contextMenuNode}

      {/* Send Error Alert */}
      {sendError && (
        <div className="alert alert-danger rounded-0 border-0 border-top py-1.5 px-3 mb-0 small d-flex align-items-center justify-content-between gap-2 flex-shrink-0">
          <div className="d-flex align-items-center gap-1.5 min-w-0">
            <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
            <span className="text-truncate" title={sendError}>{sendError}</span>
          </div>
          {onDismissSendError && (
            <button
              type="button"
              className="btn-close btn-close-sm flex-shrink-0"
              aria-label="Dismiss send error"
              onClick={onDismissSendError}
            />
          )}
        </div>
      )}

      {/* Bottom Message Composer */}
      <div className="p-2.5 p-sm-3 bg-white border-top flex-shrink-0">
        <form onSubmit={onSendMessage}>
          <div
            className="d-flex align-items-center gap-2 rounded-pill px-3 py-1 bg-white"
            style={{ border: '1px solid #cbd5e1' }}
          >
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none px-1 small text-navy"
              placeholder="Type a message to collaborate..."
              value={messageText}
              onChange={(e) => onMessageTextChange(e.target.value)}
              disabled={isSending}
              style={{ fontSize: '0.86rem' }}
            />

            <button
              type="submit"
              className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 border-0 shadow-sm"
              style={{ width: '34px', height: '34px', backgroundColor: '#0d6efd' }}
              disabled={!messageText.trim() || isSending}
              title="Send message"
            >
              {isSending ? (
                <span className="spinner-border spinner-border-sm text-white" role="status"></span>
              ) : (
                <i className="bi bi-send-fill text-white" style={{ fontSize: '0.85rem', marginLeft: '1px' }}></i>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueCollaborationThread;
