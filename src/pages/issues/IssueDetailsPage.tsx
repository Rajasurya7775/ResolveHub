import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { Issue, DiscussionMessage } from '../../types/issue';
import { apiFetchIssueById, apiFetchMessages, apiSendMessage, apiUpdateMessage } from '../../services/api/issueService';
import { useIssueMessagesWebSocket } from '../../hooks/useIssueMessagesWebSocket';
import { IssueAuditLogs } from '../../components/issues/IssueAuditLogs';

const PROJECT_OPTIONS = [
  'Nokia Production Dashboard',
  'Manufacturing Analytics',
  'Inventory Monitoring',
  'Network Monitoring'
];

const ISSUE_TYPE_OPTIONS = [
  'Front-end',
  'Backend',
  'Database',
  'Hardware',
  'Others'
];

const DEFAULT_THREAD_MESSAGES: DiscussionMessage[] = [
  {
    id: 'msg-seed-1',
    issueId: '',
    senderId: '38',
    senderName: 'Sivabalan',
    senderRole: 'Supporter',
    message: "Can you please check this issue? It's blocking the manufacturing dashboard.",
    markdown: "Can you please check this issue? It's blocking the manufacturing dashboard.",
    timestamp: 'Nov 17, 2026 • 04:20 PM',
    createdAt: '2026-11-17T16:20:00Z',
    attachment: {
      name: 'dashboard_error.log',
      size: '245 KB',
      url: '#'
    }
  },
  {
    id: 'msg-seed-2',
    issueId: '',
    senderId: '42',
    senderName: 'jeva',
    senderRole: 'Developer',
    message: "Sure, I'm looking into it. Will update you shortly.",
    markdown: "Sure, I'm looking into it. Will update you shortly.",
    timestamp: 'Nov 17, 2026 • 04:32 PM',
    createdAt: '2026-11-17T16:32:00Z',
    reaction: '👍 1'
  },
  {
    id: 'msg-seed-3',
    issueId: '',
    senderId: '38',
    senderName: 'Sivabalan',
    senderRole: 'Supporter',
    message: 'Thanks! Let me know if you need any logs. 😊',
    markdown: 'Thanks! Let me know if you need any logs. 😊',
    timestamp: 'Nov 17, 2026 • 04:36 PM',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  }
];

export const IssueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { getIssueById, updateIssue, deleteIssue } = useIssues();
  const { currentUser } = useAuth();

  // Determine back route from location state
  const fromState = (location.state as any)?.from;
  const sourceState = (location.state as any)?.source;
  const isDevUser = String(currentUser?.role || '').toLowerCase().includes('dev');
  const sourceHint: 'my-issues' | 'previous-issues' =
    sourceState === 'previous-issues' ||
      fromState === 'previous-issues' ||
      fromState === '/support/previous-issues' ||
      fromState === '/developer/all' ||
      fromState === 'developer-all'
      ? 'previous-issues'
      : 'my-issues';

  const backLabel =
    fromState === 'previous-issues'
      ? 'Previous Issues'
      : fromState === 'developer-assigned'
        ? 'Assigned Issues'
        : fromState === 'developer-all'
          ? 'All Issues'
          : isDevUser
            ? 'Assigned Issues'
            : 'My Issues';
  const backPath =
    fromState === 'previous-issues'
      ? '/support/previous-issues'
      : fromState === 'developer-assigned'
        ? '/developer/assigned'
        : fromState === 'developer-all'
          ? '/developer/all'
          : isDevUser
            ? '/developer/assigned'
            : '/support/my-issues';

  // Load initial issue from context or location state
  const initialIssue = (location.state as any)?.issue || (id ? getIssueById(id) : undefined);
  const [issue, setIssue] = useState<Issue | undefined>(initialIssue);
  const [isLoading, setIsLoading] = useState<boolean>(!initialIssue);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(initialIssue?.title || '');
  const [editProject, setEditProject] = useState<string>(initialIssue?.projectId || PROJECT_OPTIONS[0]);
  const [editType, setEditType] = useState<string>(initialIssue?.issueType || ISSUE_TYPE_OPTIONS[0]);
  const [editDesc, setEditDesc] = useState<string>(initialIssue?.description || '');
  const [editOccurrence, setEditOccurrence] = useState<string>(initialIssue?.occurrenceTime || '');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  // Discussion state - initialized with reference thread messages
  const [messages, setMessages] = useState<DiscussionMessage[]>(() =>
    DEFAULT_THREAD_MESSAGES.map((m) => ({ ...m, issueId: id || '' }))
  );
  const [messageText, setMessageText] = useState<string>('');
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Message Editing state (15-minute edit window)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editMessageError, setEditMessageError] = useState<string | null>(null);

  // 1. Fetch live issue details from backend API on mount / ID change
  const fetchLiveIssue = async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);

    const res = await apiFetchIssueById(id, sourceHint);
    if (res.success && res.data) {
      setIssue(res.data);
      setEditTitle(res.data.title);
      setEditProject(res.data.projectId);
      setEditType(res.data.issueType);
      setEditDesc(res.data.description);
      setEditOccurrence(res.data.occurrenceTime);
    } else if (!issue) {
      // Check context one more time
      const cached = getIssueById(id);
      if (cached) {
        setIssue(cached);
        setEditTitle(cached.title);
        setEditProject(cached.projectId);
        setEditType(cached.issueType);
        setEditDesc(cached.description);
        setEditOccurrence(cached.occurrenceTime);
      } else {
        setFetchError(res.message || `Issue #${id} could not be found on server.`);
      }
    }
    setIsLoading(false);
  };

  // 2. Fetch live messages from backend API
  const fetchLiveMessages = async () => {
    if (!id) return;
    const msgs = await apiFetchMessages(id);
    if (msgs && msgs.length > 0) {
      setMessages(msgs);
    } else {
      setMessages(DEFAULT_THREAD_MESSAGES.map((m) => ({ ...m, issueId: id })));
    }
  };

  useEffect(() => {
    fetchLiveIssue();
    fetchLiveMessages();
  }, [id]);

  // 3. Real-time WebSocket & Cross-Tab Synchronization
  const { broadcastMessage } = useIssueMessagesWebSocket({
    issueId: id,
    onNewMessage: (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    },
    onMessagesUpdated: (allMsgs) => {
      if (allMsgs && allMsgs.length > 0) {
        setMessages(allMsgs);
      }
    }
  });

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, showAuditLogs]);

  const handleBack = () => {
    navigate(backPath);
  };

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;
    if (!editTitle.trim() || !editDesc.trim()) return;

    setSaveError('');
    try {
      await updateIssue(
        issue.id,
        {
          title: editTitle.trim(),
          projectId: editProject,
          issueType: editType,
          description: editDesc.trim(),
          shortDescription: editDesc.length > 85 ? `${editDesc.substring(0, 85)}...` : editDesc,
          occurrenceTime: editOccurrence
        },
        sourceHint
      );

      setIssue((prev) =>
        prev
          ? {
            ...prev,
            title: editTitle.trim(),
            projectId: editProject,
            issueType: editType,
            description: editDesc.trim(),
            occurrenceTime: editOccurrence
          }
          : undefined
      );

      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes.');
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !id) return;

    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);

    const isDeveloper = String(currentUser?.role || '').toLowerCase().includes('dev');
    const senderRole = isDeveloper ? 'Developer' : 'Supporter';

    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

    const optimisticMsg: DiscussionMessage = {
      id: `temp-${Date.now()}`,
      issueId: id,
      senderId: String(currentUser?.id || '38'),
      senderName: currentUser?.name || 'Sivabalan',
      senderRole,
      message: text,
      markdown: text,
      createdAt: now.toISOString(),
      timestamp: formattedTimestamp
    };

    // Immediately display optimistic message in UI
    setMessages((prev) => [...prev, optimisticMsg]);
    // Real-time broadcast to other tabs/windows and active WebSocket immediately
    broadcastMessage(optimisticMsg);

    try {
      const res = await apiSendMessage(id, text, currentUser?.id, currentUser?.name);
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? res.message! : m))
        );
        broadcastMessage(res.message);
      } else {
        await fetchLiveMessages();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 15-Minute Edit Window Constants & Helpers
  const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  const getRemainingEditMinutes = useCallback((createdAt?: string): number => {
    if (!createdAt) return 15;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return 15;
    const elapsed = Date.now() - createdTime;
    const remaining = Math.max(0, EDIT_WINDOW_MS - elapsed);
    return Math.ceil(remaining / 60000);
  }, [EDIT_WINDOW_MS]);

  const isWithin15Minutes = useCallback((createdAt?: string): boolean => {
    if (!createdAt) return true;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return true;
    const elapsed = Date.now() - createdTime;
    return elapsed >= 0 && elapsed <= EDIT_WINDOW_MS;
  }, [EDIT_WINDOW_MS]);

  const checkIsSender = useCallback((msg: DiscussionMessage): boolean => {
    if (currentUser) {
      if (currentUser.id && String(msg.senderId) === String(currentUser.id)) return true;
      if (currentUser.employeeId && String(msg.senderId) === String(currentUser.employeeId)) return true;
      if (currentUser.name && msg.senderName?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()) return true;
    }
    if (isDevUser) {
      return Boolean(msg.senderRole?.toLowerCase().includes('dev') || msg.senderName?.toLowerCase().includes('jeva'));
    }
    return Boolean(msg.senderRole?.toLowerCase().includes('supp') || msg.senderName?.toLowerCase().includes('sivabalan'));
  }, [currentUser, isDevUser]);

  const handleStartEdit = (msg: DiscussionMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.markdown || msg.message || '');
    setEditMessageError(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
    setEditMessageError(null);
  };

  const handleSaveMessageEdit = async (msgId: string) => {
    if (!id || !editingText.trim()) return;
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    if (!isWithin15Minutes(targetMsg.createdAt)) {
      setEditMessageError('Edit window has expired. Messages can only be edited within the first 15 minutes.');
      return;
    }

    setIsSavingEdit(true);
    setEditMessageError(null);

    const updatedContent = editingText.trim();
    const updatedMsg: DiscussionMessage = {
      ...targetMsg,
      message: updatedContent,
      markdown: updatedContent,
      isEdited: true,
      editedAt: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? updatedMsg : m))
    );

    // Broadcast across tabs
    broadcastMessage(updatedMsg);

    try {
      await apiUpdateMessage(id, msgId, updatedContent);
    } catch (err) {
      console.error('Failed to update message on backend:', err);
    } finally {
      setIsSavingEdit(false);
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleDelete = () => {
    if (!issue) return;
    if (window.confirm(`Are you sure you want to delete ${issue.issueNumber || issue.id}: "${issue.title}"?`)) {
      deleteIssue(issue.id, sourceHint);
      navigate(backPath);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-white rounded-3 p-5 shadow-sm">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading issue details...</span>
        </div>
        <h6 className="fw-bold text-navy mb-1">Loading Issue...</h6>
        <p className="text-secondary small mb-0">Fetching live issue data from backend API</p>
      </div>
    );
  }

  if (fetchError || !issue) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-white rounded-3 p-5 text-center shadow-sm">
        <div
          className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-3"
          style={{ width: '64px', height: '64px' }}
        >
          <i className="bi bi-exclamation-triangle-fill fs-2"></i>
        </div>
        <h5 className="fw-bold text-navy mb-2">Issue Not Found</h5>
        <p className="text-secondary small mb-4" style={{ maxWidth: '420px' }}>
          {fetchError || `We couldn't locate incident ticket in your active records.`}
        </p>
        <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleBack}>
          <i className="bi bi-arrow-left me-1.5"></i>Return to {backLabel}
        </button>
      </div>
    );
  }

  const isEditable = issue.status === 'Open';

  // Safe Project Name Extraction
  const projectNameDisplay =
    typeof issue.projectName === 'string' && issue.projectName
      ? issue.projectName
      : typeof issue.projectId === 'string' && issue.projectId
        ? issue.projectId
        : ((issue.projectName as any)?.project_name ||
          (issue.projectId as any)?.project_name ||
          (issue.projectName as any)?.name ||
          'Dolorem Service');

  // Priority formatting
  const rawPriority = issue.priority || 'P2 – Moderate';
  const isP0 = rawPriority.includes('P0');
  const isP1 = rawPriority.includes('P1');

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ gap: '0.85rem' }}>

      {/* ================= 1. TOP HEADER & BREADCRUMB COMMAND BAR ================= */}
      <div className="bg-white rounded-3 border border-light-subtle shadow-sm px-3.5 py-2.5 flex-shrink-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2.5">

          {/* Left: Back button + Ticket Identity + Status + Priority + Shift */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light bg-white border rounded-pill px-3 py-1.5 text-navy small fw-semibold shadow-2xs d-inline-flex align-items-center gap-2"
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left"></i>
              <span>Back to {backLabel}</span>
            </button>

            {/* Solid Vivid Blue Pill Badge for Ticket Number */}
            <span
              className="badge bg-primary px-3 py-1.5 rounded-pill fw-bold text-white shadow-2xs"
              style={{ fontSize: '0.82rem', letterSpacing: '0.2px' }}
            >
              {issue.issueNumber || issue.id}
            </span>

            {/* Amber Status Pill Badge */}
            <span
              className="badge rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
              style={{
                backgroundColor: '#fff7ed',
                color: '#ea580c',
                border: '1px solid #fed7aa',
                fontSize: '0.78rem'
              }}
            >
              <i className="bi bi-record-circle"></i>
              {issue.status}
            </span>

            {/* Soft Blue / Priority Pill Badge */}
            <span
              className="badge rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
              style={{
                backgroundColor: isP0 ? '#fef2f2' : isP1 ? '#fffbeb' : '#eff6ff',
                color: isP0 ? '#dc2626' : isP1 ? '#d97706' : '#2563eb',
                border: `1px solid ${isP0 ? '#fecaca' : isP1 ? '#fef3c7' : '#bfdbfe'}`,
                fontSize: '0.78rem'
              }}
            >
              <i className="bi bi-tag-fill"></i>
              {rawPriority}
            </span>

            {/* Soft Blue / Operational Shift Pill Badge */}
            <span
              className="badge rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
              style={{
                backgroundColor: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                fontSize: '0.78rem'
              }}
            >
              <i className="bi bi-info-circle"></i>
              {issue.shift || 'Shift-B'}
            </span>
          </div>

          {/* Right: Actions (Refresh, Edit, Delete) */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light bg-white border rounded-pill px-3 py-1.5 text-secondary small fw-medium shadow-2xs d-inline-flex align-items-center gap-1.5"
              onClick={() => {
                fetchLiveIssue();
                fetchLiveMessages();
              }}
              title="Refresh live ticket data"
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span className="d-none d-md-inline">Refresh</span>
            </button>

            {isEditable && !isEditing && (
              <button
                type="button"
                className="btn btn-outline-primary rounded-pill px-3 py-1.5 small fw-semibold shadow-2xs d-inline-flex align-items-center gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-pencil-square"></i>
                <span>Edit Issue</span>
              </button>
            )}

            {isEditable && (
              <button
                type="button"
                className="btn btn-outline-danger rounded-pill px-3 py-1.5 small fw-semibold shadow-2xs d-inline-flex align-items-center gap-1.5"
                onClick={handleDelete}
                title="Delete Open Ticket"
              >
                <i className="bi bi-trash3"></i>
                <span className="d-none d-md-inline">Delete</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Notifications for updates */}
      {saveSuccess && (
        <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between shadow-xs flex-shrink-0 mb-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <strong>Incident ticket updated successfully on server!</strong>
          </div>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setSaveSuccess(false)}></button>
        </div>
      )}

      {saveError && (
        <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between shadow-xs flex-shrink-0 mb-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
            <span>{saveError}</span>
          </div>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setSaveError('')}></button>
        </div>
      )}

      {/* ================= 2. MAIN TWO-COLUMN CONTENT AREA ================= */}
      <div className="flex-grow-1 min-h-0 overflow-y-auto overflow-lg-hidden">
        <div className="row g-3 h-100 min-h-0 details-split-container">

          {/* ================= LEFT COLUMN (~59%): INCIDENT OVERVIEW & SECTIONS ================= */}
          <div className="col-12 col-lg-7 d-flex flex-column details-column h-100 min-h-0">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100 d-flex flex-column overflow-hidden">
              <div className="p-3.5 p-xl-4 overflow-y-auto flex-grow-1">

                {isEditing ? (
                  /* ================= INLINE EDIT MODE ================= */
                  <form onSubmit={handleSaveEdit}>
                    <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                      <h6 className="fw-bold text-navy mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-pencil-square text-primary"></i>
                        Edit Incident Information
                      </h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-secondary text-decoration-none p-0"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Incident Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold text-secondary mb-1">Target Project</label>
                        <select
                          className="form-select"
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value)}
                        >
                          {PROJECT_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold text-secondary mb-1">Issue Type</label>
                        <select
                          className="form-select"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                        >
                          {ISSUE_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Occurrence Time</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editOccurrence}
                        onChange={(e) => setEditOccurrence(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Detailed Description *</label>
                      <textarea
                        className="form-control"
                        rows={6}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        required
                      />
                    </div>

                    <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary-action btn-sm px-4"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ================= READ-ONLY DETAILS VIEW (MATCHING APPROVED DESIGN) ================= */
                  <div>

                    {/* Title & Reporter Header */}
                    <div className="mb-3 pb-2">
                      <h4 className="fw-bold text-navy mb-2 lh-sm" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                        {issue.title}
                      </h4>

                      <div className="d-flex flex-wrap align-items-center text-secondary small" style={{ fontSize: '0.82rem' }}>
                        <span className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-person text-primary"></i>
                          Reported by <strong className="text-navy">{issue.reportedBy || 'Supporter'}{issue.reportedById ? `(${issue.reportedById})` : '(47)'}</strong>
                        </span>
                        <span className="text-muted mx-2">|</span>
                        <span className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-calendar3 text-muted"></i>
                          {issue.reportedDate || '2026-11-18'}
                        </span>
                        {issue.occurrenceTime && (
                          <>
                            <span className="text-muted mx-2">|</span>
                            <span className="d-flex align-items-center gap-1.5">
                              <i className="bi bi-clock text-muted"></i>
                              Time: {issue.occurrenceTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 4 Overview KPI Metric Cards in 1 Row */}
                    <div className="row g-2.5 mb-4">
                      {/* Card 1: Project */}
                      <div className="col-6 col-sm-3">
                        <div
                          className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between"
                          style={{ backgroundColor: '#f0f7ff', border: '1px solid #dbeafe' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-briefcase text-primary fs-5"></i>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Project</span>
                          </div>
                          <strong
                            className="text-navy small d-block text-truncate fw-bold"
                            style={{ fontSize: '0.88rem' }}
                            title={projectNameDisplay}
                          >
                            {projectNameDisplay}
                          </strong>
                        </div>
                      </div>

                      {/* Card 2: Issue Type */}
                      <div className="col-6 col-sm-3">
                        <div
                          className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between"
                          style={{ backgroundColor: '#faf5ff', border: '1px solid #f3e8ff' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-layers fs-5" style={{ color: '#9333ea' }}></i>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Issue Type</span>
                          </div>
                          <strong className="text-navy small d-block text-truncate fw-bold" style={{ fontSize: '0.88rem' }}>
                            {issue.issueType || 'General'}
                          </strong>
                        </div>
                      </div>

                      {/* Card 3: Operational Shift */}
                      <div className="col-6 col-sm-3">
                        <div
                          className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between"
                          style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-gear fs-5" style={{ color: '#0d9488' }}></i>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Operational Shift</span>
                          </div>
                          <strong className="text-navy small d-block text-truncate fw-bold" style={{ fontSize: '0.88rem' }}>
                            {issue.shift || 'Shift-B'}
                          </strong>
                        </div>
                      </div>

                      {/* Card 4: Current Status */}
                      <div className="col-6 col-sm-3">
                        <div
                          className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between"
                          style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-activity fs-5" style={{ color: '#d97706' }}></i>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Current Status</span>
                          </div>
                          <div>
                            <span
                              className="badge rounded-pill px-3 py-1 fw-bold"
                              style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.78rem' }}
                            >
                              {issue.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Incident Description & Observations */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-navy mb-2 d-flex align-items-center" style={{ fontSize: '0.92rem' }}>
                        <i className="bi bi-file-earmark-text text-primary me-2 fs-5"></i>
                        Incident Description & Observations
                      </h6>
                      <div
                        className="rounded-3 p-3 text-navy"
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          minHeight: '80px',
                          fontSize: '0.9rem',
                          whiteSpace: 'pre-line',
                          lineHeight: '1.5'
                        }}
                      >
                        {issue.description || 'dfdf'}
                      </div>
                    </div>

                    {/* Section 2: Root Cause Analysis (RCA) & Diagnostics */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-navy mb-2 d-flex align-items-center" style={{ fontSize: '0.92rem' }}>
                        <i className="bi bi-clipboard2-pulse text-primary me-2 fs-5"></i>
                        Root Cause Analysis (RCA) & Diagnostics
                      </h6>

                      <div
                        className="rounded-3 p-3"
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          minHeight: '85px'
                        }}
                      >
                        <div className="mb-2">
                          <span
                            className="badge bg-success text-white px-2.5 py-1 rounded-pill fw-semibold d-inline-flex align-items-center gap-1.5"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <i className="bi bi-check-circle-fill"></i>
                            RCA Verified
                          </span>
                        </div>
                        <div className="text-navy lh-base" style={{ fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                          {issue.rca || issue.description || 'dfdf'}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Developer Triage & Assignment */}
                    <div className="mb-2">
                      <h6 className="fw-bold text-navy mb-2 d-flex align-items-center" style={{ fontSize: '0.92rem' }}>
                        <i className="bi bi-people text-primary me-2 fs-5"></i>
                        Developer Triage & Assignment
                      </h6>

                      <div
                        className="rounded-3 p-3"
                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                      >
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                          <div>
                            <span className="text-secondary small d-block mb-1.5 fw-medium" style={{ fontSize: '0.72rem' }}>
                              Assigned Developer
                            </span>
                            {issue.acceptedDeveloper && issue.acceptedDeveloper !== 'Unassigned' ? (
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-2xs"
                                  style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                                >
                                  {issue.acceptedDeveloper.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <strong className="text-navy small d-block">{issue.acceptedDeveloper}</strong>
                                  {issue.acceptedDeveloperId && (
                                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                      ID: {issue.acceptedDeveloperId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span
                                className="badge rounded-pill px-3 py-1.5 fw-medium"
                                style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.78rem' }}
                              >
                                Unassigned (Queue Pending)
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-secondary small d-block mb-1.5 fw-medium" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-calendar3 me-1"></i>Accepted Timestamp
                            </span>
                            <span className="fw-bold text-navy" style={{ fontSize: '0.88rem' }}>
                              {issue.acceptedDate || 'Pending acceptance'}
                            </span>
                          </div>

                          <div>
                            <span
                              className="badge rounded-pill px-3 py-1.5 fw-semibold"
                              style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontSize: '0.78rem'
                              }}
                            >
                              Engineering Queue
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~41%): INCIDENT COLLABORATION THREAD ================= */}
          <div className="col-12 col-lg-5 d-flex flex-column details-column h-100 min-h-0">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100 d-flex flex-column overflow-hidden">
              <div className="nav nav-tabs nav-fill bg-light flex-shrink-0" role="group" aria-label="Issue activity">
                <button
                  type="button"
                  className={`nav-link small ${showAuditLogs ? 'text-secondary' : 'active text-primary'}`}
                  aria-pressed={!showAuditLogs}
                  aria-controls="issue-messages"
                  onClick={() => setShowAuditLogs(false)}
                >
                  <i className="bi bi-chat-dots me-1" aria-hidden="true"></i>
                  Messages
                </button>
                <button
                  type="button"
                  className={`nav-link small ${showAuditLogs ? 'active text-primary' : 'text-secondary'}`}
                  aria-pressed={showAuditLogs}
                  aria-controls="issue-audit-panel"
                  onClick={() => setShowAuditLogs(true)}
                >
                  <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                  Audit Logs
                </button>
              </div>

              <div id="issue-audit-panel" className={showAuditLogs ? 'd-flex flex-column flex-grow-1 min-h-0' : 'd-none'}>
                {showAuditLogs && <IssueAuditLogs key={`${sourceHint}:${issue.id}`} issueId={issue.id} scope={sourceHint} />}
              </div>
              <div id="issue-messages" style={{ display: showAuditLogs ? 'none' : 'contents' }}>
              {/* Thread Header */}
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white flex-shrink-0">
                <div className="d-flex align-items-center gap-2.5">
                  <i className="bi bi-chat-dots-fill text-primary fs-5"></i>
                  <div>
                    <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.95rem' }}>
                      Incident Collaboration Thread
                    </h6>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      2-way Sync between Supporters and Developers
                    </small>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
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

              {/* Scrollable Message List / Empty State */}
              <div className="p-3.5 overflow-y-auto flex-grow-1 d-flex flex-column gap-3.5 bg-white">
                {messages.length === 0 ? (
                  <div className="my-auto text-center py-5 px-3">
                    {/* Two-bubble illustration matching reference */}
                    <svg
                      width="92"
                      height="74"
                      viewBox="0 0 100 80"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mb-3"
                    >
                      {/* Left Sky Blue Bubble */}
                      <path
                        d="M15 15C15 9.47715 19.4772 5 25 5H55C60.5228 5 65 9.47715 65 15V35C65 40.5228 60.5228 45 55 45H32L20 54V45H25C19.4772 45 15 40.5228 15 35V15Z"
                        fill="#93C5FD"
                      />
                      <rect x="25" y="17" width="28" height="3.5" rx="1.75" fill="white" />
                      <rect x="25" y="25" width="20" height="3.5" rx="1.75" fill="white" />
                      {/* Right Powder Blue Bubble */}
                      <path
                        d="M42 32C42 26.4772 46.4772 22 52 22H78C83.5228 22 88 26.4772 88 32V50C88 55.5228 83.5228 60 78 60H75V67L64 60H52C46.4772 60 42 55.5228 42 50V32Z"
                        fill="#BFDBFE"
                      />
                      <rect x="52" y="34" width="26" height="3.5" rx="1.75" fill="white" />
                      <rect x="52" y="42" width="18" height="3.5" rx="1.75" fill="white" />
                      {/* Accent Sparkles */}
                      <circle cx="82" cy="14" r="2.5" fill="#60A5FA" />
                      <circle cx="88" cy="18" r="1.5" fill="#93C5FD" />
                    </svg>

                    <h6 className="fw-bold text-navy mb-1" style={{ fontSize: '0.95rem' }}>
                      No messages yet in this discussion.
                    </h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>
                      Start the collaboration by sending a message below.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSenderMsg = checkIsSender(msg);
                    const isDeveloper =
                      msg.senderRole?.toLowerCase().includes('dev') ||
                      msg.senderName?.toLowerCase().includes('jeva') ||
                      msg.senderName?.toLowerCase().includes('arun');

                    const avatarLetter = (msg.senderName || 'U').charAt(0).toUpperCase();
                    const isCurrentlyEditing = editingMessageId === msg.id;
                    const isEditable = isSenderMsg && isWithin15Minutes(msg.createdAt);
                    const remainingMins = getRemainingEditMinutes(msg.createdAt);

                    return (
                      <div
                        key={msg.id}
                        className={`d-flex ${isSenderMsg ? 'justify-content-end' : 'justify-content-start'} w-100 mb-3`}
                      >
                        <div
                          className={`d-flex align-items-start gap-2.5 ${isSenderMsg ? 'flex-row-reverse' : 'flex-row'}`}
                          style={{ maxWidth: '85%' }}
                        >
                          {/* Avatar */}
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-2xs flex-shrink-0"
                            style={{
                              width: '38px',
                              height: '38px',
                              fontSize: '0.95rem',
                              backgroundColor: isSenderMsg ? '#0d6efd' : (isDeveloper ? '#8b5cf6' : '#0284c7')
                            }}
                          >
                            {avatarLetter}
                          </div>

                          {/* Content on Left / Right */}
                          <div className={`d-flex flex-column ${isSenderMsg ? 'align-items-end' : 'align-items-start'} min-w-0 flex-grow-1`}>
                            {/* Top Meta Line: Sender Name + Role Badge + Timestamp */}
                            <div className={`d-flex align-items-center gap-2 mb-1.5 ${isSenderMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="fw-bold text-navy" style={{ fontSize: '0.9rem' }}>
                                {isSenderMsg ? `${msg.senderName} (You)` : msg.senderName}
                              </span>
                              <span
                                className="badge rounded-pill px-2.5 py-0.5 fw-semibold"
                                style={{
                                  fontSize: '0.72rem',
                                  backgroundColor: isDeveloper ? '#f3e8ff' : '#dbeafe',
                                  color: isDeveloper ? '#7c3aed' : '#2563eb'
                                }}
                              >
                                {isDeveloper ? 'Developer' : 'Supporter'}
                              </span>
                              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                                {msg.timestamp}
                                {msg.isEdited && <span className="ms-1 text-muted fst-italic">(edited)</span>}
                              </span>
                            </div>

                            {/* Message Bubble Container */}
                            <div
                              className="rounded-3 p-3 shadow-2xs position-relative"
                              style={{
                                backgroundColor: isSenderMsg ? '#0d6efd' : (isDeveloper ? '#faf5ff' : '#eff6ff'),
                                color: isSenderMsg ? '#ffffff' : '#1e293b',
                                border: isSenderMsg ? '1px solid #0d6efd' : `1px solid ${isDeveloper ? '#f3e8ff' : '#dbeafe'}`,
                                fontSize: '0.88rem',
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-line',
                                borderTopRightRadius: isSenderMsg ? '4px' : '14px',
                                borderTopLeftRadius: !isSenderMsg ? '4px' : '14px',
                                borderBottomLeftRadius: '14px',
                                borderBottomRightRadius: '14px',
                                minWidth: '180px'
                              }}
                            >
                              {isCurrentlyEditing ? (
                                /* Inline Editing UI */
                                <div className="w-100" style={{ minWidth: '240px' }}>
                                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                                    <span className="fw-semibold small" style={{ color: isSenderMsg ? '#ffffff' : '#1e293b', fontSize: '0.78rem' }}>
                                      <i className="bi bi-pencil me-1"></i> Edit Message
                                    </span>
                                    <span className="badge rounded-pill bg-white text-primary px-2 py-0.5 fw-semibold" style={{ fontSize: '0.7rem' }}>
                                      {remainingMins}m left
                                    </span>
                                  </div>

                                  <textarea
                                    className="form-control form-control-sm mb-2 shadow-sm text-navy"
                                    rows={3}
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    style={{
                                      fontSize: '0.88rem',
                                      backgroundColor: '#ffffff',
                                      color: '#0f172a',
                                      border: '1px solid #cbd5e1'
                                    }}
                                    autoFocus
                                  />

                                  {editMessageError && (
                                    <div className="alert alert-danger py-1 px-2 small mb-2" style={{ fontSize: '0.75rem' }}>
                                      {editMessageError}
                                    </div>
                                  )}

                                  <div className="d-flex align-items-center justify-content-end gap-1.5">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light py-1 px-2.5 fw-medium"
                                      style={{ fontSize: '0.78rem' }}
                                      onClick={handleCancelEdit}
                                      disabled={isSavingEdit}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning py-1 px-3 fw-bold d-inline-flex align-items-center gap-1 shadow-sm text-dark"
                                      style={{ fontSize: '0.78rem' }}
                                      onClick={() => handleSaveMessageEdit(msg.id)}
                                      disabled={!editingText.trim() || isSavingEdit}
                                    >
                                      {isSavingEdit ? (
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                      ) : (
                                        <>
                                          <i className="bi bi-check-lg"></i> Save Changes
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div>{msg.markdown || msg.message}</div>

                                  {/* Attached file capsule if present */}
                                  {msg.attachment && (
                                    <div className="mt-2.5">
                                      <div
                                        className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-white border shadow-2xs text-navy"
                                        style={{ borderColor: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer' }}
                                        title="Download attachment"
                                      >
                                        <i className="bi bi-paperclip text-secondary"></i>
                                        <span className="fw-medium text-navy">{msg.attachment.name}</span>
                                        {msg.attachment.size && <span className="text-muted">({msg.attachment.size})</span>}
                                        <i className="bi bi-download text-secondary ms-1"></i>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Meta Actions Below Bubble: 15-Minute Edit & Reactions */}
                            <div className={`d-flex align-items-center gap-2 mt-1 ${isSenderMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* 15-Minute Edit Button: Available only for Sender within 15 mins */}
                              {isSenderMsg && isEditable && !isCurrentlyEditing && (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-primary p-0 text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleStartEdit(msg)}
                                  title={`Edit message (${remainingMins}m remaining in the 15-min edit window)`}
                                >
                                  <i className="bi bi-pencil-square"></i>
                                  <span>Edit</span>
                                  <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}>({remainingMins}m left)</span>
                                </button>
                              )}

                              {/* Reaction badge below bubble if present */}
                              {msg.reaction && (
                                <div
                                  className="d-inline-flex align-items-center gap-1 px-2.5 py-0.5 rounded-pill bg-white border shadow-2xs"
                                  style={{ borderColor: '#e2e8f0', fontSize: '0.75rem', backgroundColor: '#ffffff' }}
                                >
                                  <span>{msg.reaction}</span>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Message Composer Box matching reference pill style */}
              <div className="p-3 bg-white border-top flex-shrink-0">
                <form onSubmit={handleSendMessage}>
                  <div
                    className="d-flex align-items-center gap-2 rounded-pill p-1.5 ps-2 bg-white"
                    style={{ border: '1px solid #cbd5e1' }}
                  >
                    <button
                      type="button"
                      className="btn rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 border-0"
                      style={{ width: '34px', height: '34px', backgroundColor: '#eef2f6', color: '#64748b' }}
                      title="Attach file"
                    >
                      <i className="bi bi-paperclip fs-5"></i>
                    </button>

                    <input
                      type="text"
                      className="form-control border-0 bg-transparent shadow-none px-2 small text-navy"
                      placeholder="Type a message to collaborate with engineers..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      disabled={isSending}
                      style={{ fontSize: '0.86rem' }}
                    />

                    <button
                      type="submit"
                      className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 border-0 shadow-sm"
                      style={{ width: '36px', height: '36px', backgroundColor: '#0d6efd' }}
                      disabled={!messageText.trim() || isSending}
                      title="Send message"
                    >
                      {isSending ? (
                        <span className="spinner-border spinner-border-sm text-white" role="status"></span>
                      ) : (
                        <i className="bi bi-send-fill text-white" style={{ fontSize: '0.9rem', marginLeft: '1px' }}></i>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
export default IssueDetailsPage;
