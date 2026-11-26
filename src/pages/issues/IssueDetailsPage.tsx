import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { Issue, DiscussionMessage, ProjectItem, DeveloperItem } from '../../types/issue';
import {
  apiFetchIssueById,
  apiFetchMessagesWithStatus,
  apiSendMessage,
  apiUpdateMessage,
  apiFetchProjects,
  apiFetchDevelopers
} from '../../services/api/issueService';
import { useIssueMessagesWebSocket } from '../../hooks/useIssueMessagesWebSocket';
import {
  IssueCollaborationThread,
  isWithinEditWindow
} from '../../components/issues/IssueCollaborationThread';

const SHIFT_OPTIONS = ['Shift-A', 'Shift-B', 'Shift-C', 'General'];

const ISSUE_TYPE_OPTIONS = [
  'Front-end',
  'Backend',
  'Database',
  'Hardware',
  'Others'
];

const ISSUE_STATUS_OPTIONS = [
  'Open',
  'In progress',
  'Pending',
  'On Hold',
  'Escalated',
  'Resolved'
];

const ISSUE_PRIORITY_OPTIONS = [
  'P0 – Critical',
  'P1 – High',
  'P2 – Moderate',
  'P3 – Low',
  'P4 – Negligible'
];

function normalizeShiftForSelect(rawShift?: string): string {
  const val = String(rawShift || '').trim();
  if (!val) return '';
  const upper = val.toUpperCase();
  if (upper === 'A' || upper === 'SHIFT-A' || upper === 'SHIFT A') return 'Shift-A';
  if (upper === 'B' || upper === 'SHIFT-B' || upper === 'SHIFT B') return 'Shift-B';
  if (upper === 'C' || upper === 'SHIFT-C' || upper === 'SHIFT C') return 'Shift-C';
  if (upper === 'GENERAL') return 'General';
  return val;
}

function normalizeIssueTypeForSelect(rawType?: string): string {
  const val = String(rawType || '').trim();
  if (!val) return '';
  const upper = val.toUpperCase();
  if (upper === 'FRONTEND' || upper === 'FRONT-END') return 'Front-end';
  if (upper === 'BACKEND') return 'Backend';
  if (upper === 'DATABASE') return 'Database';
  if (upper === 'HARDWARE') return 'Hardware';
  if (upper === 'OTHERS') return 'Others';
  return val;
}

function toDateTimeLocalValue(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

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

  // Dynamic dropdown lists from existing APIs
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingDevelopers, setIsLoadingDevelopers] = useState<boolean>(false);
  const [optionsError, setOptionsError] = useState<string>('');

  // Edit Mode state (covers all 10 Create Issue fields)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editProject, setEditProject] = useState<string>('');
  const [editShift, setEditShift] = useState<string>('');
  const [editOccurrence, setEditOccurrence] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editType, setEditType] = useState<string>('');
  const [editRca, setEditRca] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('Unassigned');
  const [editAssignedToId, setEditAssignedToId] = useState<string>('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');

  // Discussion state (no hardcoded seed messages)
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const populateEditFormFromIssue = useCallback(
    (target: Issue, projectList: ProjectItem[], devList: DeveloperItem[]) => {
      // Match Project by ID or Name
      const matchedProj = projectList.find(
        (p) =>
          String(p.id) === String(target.projectId) ||
          p.name === target.projectName ||
          p.name === target.projectId
      );
      setEditProject(
        matchedProj
          ? String(matchedProj.id || matchedProj.name)
          : String(target.projectId || target.projectName || '')
      );

      setEditShift(normalizeShiftForSelect(target.shift));
      setEditOccurrence(toDateTimeLocalValue(target.occurrenceTime));
      setEditTitle(target.title || '');
      setEditDesc(target.description || '');
      setEditType(normalizeIssueTypeForSelect(target.issueType));
      setEditRca(target.rca || '');
      setEditStatus(target.status || '');
      setEditPriority(target.priority || '');

      // Match Developer by ID, Employee ID, or Name
      const targetDevId = target.acceptedDeveloperId || target.assignedToId;
      const targetDevName = target.acceptedDeveloper || target.assignedTo;
      if (!targetDevName || targetDevName === 'Unassigned') {
        setEditAssignedTo('Unassigned');
        setEditAssignedToId(targetDevId ? String(targetDevId) : '');
      } else {
        const matchedDev = devList.find(
          (d) =>
            (targetDevId && (String(d.id) === String(targetDevId) || d.employeeId === String(targetDevId))) ||
            d.name === targetDevName
        );
        if (matchedDev) {
          setEditAssignedTo(matchedDev.name);
          setEditAssignedToId(String(matchedDev.id));
        } else {
          setEditAssignedTo(targetDevName);
          setEditAssignedToId(targetDevId ? String(targetDevId) : '');
        }
      }
      setEditErrors({});
    },
    []
  );

  // Fetch Projects & Developers via existing cached APIs
  const loadDropdownOptions = useCallback(async () => {
    setIsLoadingProjects(true);
    setIsLoadingDevelopers(true);
    setOptionsError('');

    const [projRes, devRes] = await Promise.all([
      apiFetchProjects(),
      apiFetchDevelopers('developer')
    ]);

    const errs: string[] = [];
    if (projRes.success) {
      setProjects(projRes.data);
    } else {
      setProjects([]);
      errs.push(projRes.message || 'Failed to load projects.');
    }
    setIsLoadingProjects(false);

    if (devRes.success) {
      setDevelopers(devRes.data);
    } else {
      setDevelopers([]);
      errs.push(devRes.message || 'Failed to load developers.');
    }
    setIsLoadingDevelopers(false);

    if (errs.length > 0) {
      setOptionsError(errs.join(' '));
    }

    return {
      projects: projRes.success ? projRes.data : [],
      developers: devRes.success ? devRes.data : []
    };
  }, []);

  // 1. Fetch live issue details from backend API on mount / ID change
  const fetchLiveIssue = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);

    const res = await apiFetchIssueById(id, sourceHint);
    if (res.success && res.data) {
      setIssue(res.data);
      populateEditFormFromIssue(res.data, projects, developers);
    } else {
      const cached = getIssueById(id);
      if (cached) {
        setIssue(cached);
        populateEditFormFromIssue(cached, projects, developers);
      } else {
        setFetchError(res.message || `Issue #${id} could not be found on server.`);
      }
    }
    setIsLoading(false);
  }, [id, sourceHint, getIssueById, populateEditFormFromIssue, projects, developers]);

  // 2. Fetch live messages from backend API
  const fetchLiveMessages = useCallback(async () => {
    if (!id) return;
    setMessagesLoading(true);
    setMessagesError(null);
    const res = await apiFetchMessagesWithStatus(id);
    setMessagesLoading(false);

    if (res.success) {
      setMessages(res.data);
    } else {
      setMessages([]);
      setMessagesError(res.message || 'Unable to load discussion messages.');
    }
  }, [id]);

  // Initial load on mount / id change
  useEffect(() => {
    let active = true;
    (async () => {
      const opts = await loadDropdownOptions();
      if (!active || !id) return;

      setIsLoading(true);
      setFetchError(null);
      const res = await apiFetchIssueById(id, sourceHint);
      if (!active) return;

      if (res.success && res.data) {
        setIssue(res.data);
        populateEditFormFromIssue(res.data, opts.projects, opts.developers);
      } else {
        const cached = getIssueById(id);
        if (cached) {
          setIssue(cached);
          populateEditFormFromIssue(cached, opts.projects, opts.developers);
        } else {
          setFetchError(res.message || `Issue #${id} could not be found on server.`);
        }
      }
      setIsLoading(false);
    })();

    fetchLiveMessages();

    return () => {
      active = false;
    };
  }, [id, sourceHint]);

  // 3. Real-time Message WebSocket (connect once resolved issue UUID is ready to avoid duplicate hits)
  const resolvedIssueId = issue?.id;
  const { isConnected: isMessagesWsConnected, broadcastMessage } = useIssueMessagesWebSocket({
    issueId: resolvedIssueId,
    enabled: Boolean(resolvedIssueId),
    onNewMessage: (newMsg) => {
      setMessages((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === newMsg.id);
        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          if (
            existing.markdown === newMsg.markdown &&
            existing.message === newMsg.message &&
            existing.isEdited === newMsg.isEdited &&
            existing.updatedAt === newMsg.updatedAt
          ) {
            return prev;
          }
          const next = [...prev];
          next[existingIdx] = { ...existing, ...newMsg };
          return next;
        }
        return [...prev, newMsg];
      });
    },
    onMessageUpdated: (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg, isEdited: true } : m))
      );
    },
    onMessagesUpdated: (allMsgs) => {
      if (allMsgs && allMsgs.length > 0) {
        setMessages((prev) => {
          const pendingOptimistic = prev.filter((m) => m.id.startsWith('temp-'));
          const deduped = [...allMsgs];
          pendingOptimistic.forEach((opt) => {
            if (!deduped.some((m) => m.id === opt.id)) {
              deduped.push(opt);
            }
          });
          return deduped;
        });
      }
    }
  });

  const handleBack = () => {
    const historyIdx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof historyIdx === 'number' && historyIdx > 0) {
      navigate(-1);
    } else {
      navigate(isDevUser ? '/developer/assigned' : '/support/my-issues');
    }
  };

  const handleOpenEdit = async () => {
    setSaveError('');
    setEditErrors({});
    if (issue) {
      populateEditFormFromIssue(issue, projects, developers);
    }
    setIsEditing(true);
    if (projects.length === 0 || developers.length === 0) {
      const opts = await loadDropdownOptions();
      if (issue) {
        populateEditFormFromIssue(issue, opts.projects, opts.developers);
      }
    }
  };

  const handleDeveloperChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setEditAssignedTo(val);
    if (val === 'Unassigned') {
      setEditAssignedToId('');
      return;
    }
    const found = developers.find((d) => d.name === val || String(d.id) === val);
    setEditAssignedToId(found ? String(found.id) : '');
  };

  const validateEditForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!editProject.trim()) errs.projectId = 'Project selection is mandatory.';
    if (!editShift.trim()) errs.shift = 'Shift is mandatory.';
    if (!editOccurrence.trim()) errs.occurrenceTime = 'Occurrence time is mandatory.';
    if (!editTitle.trim()) {
      errs.title = 'Issue Title is mandatory.';
    } else if (editTitle.trim().length > 100) {
      errs.title = 'Issue Title cannot exceed 100 characters.';
    }
    if (!editDesc.trim()) {
      errs.description = 'Issue Details are mandatory.';
    } else if (editDesc.trim().length > 1000) {
      errs.description = 'Issue Details cannot exceed 1000 characters.';
    }
    if (!editType.trim()) errs.issueType = 'Issue Type is mandatory.';
    if (!editStatus.trim()) errs.status = 'Issue Status is mandatory.';
    if (!editPriority.trim()) errs.priority = 'Issue Priority is mandatory.';
    if (editRca.length > 1000) errs.rca = 'RCA cannot exceed 1000 characters.';
    return errs;
  };

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    setSaveError('');
    const errs = validateEditForm();
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setEditErrors({});
    setIsSaving(true);

    try {
      const selectedProjectObj = projects.find(
        (p) => String(p.id || p.name) === editProject || p.name === editProject
      );

      await updateIssue(
        issue.id,
        {
          projectId: editProject,
          projectName: selectedProjectObj?.name || editProject,
          shift: editShift,
          occurrenceTime: editOccurrence,
          title: editTitle.trim(),
          description: editDesc.trim(),
          shortDescription: editDesc.trim().length > 85 ? `${editDesc.trim().substring(0, 85)}...` : editDesc.trim(),
          issueType: editType,
          rca: editRca.trim(),
          status: editStatus as Issue['status'],
          priority: editPriority,
          assignedTo: editAssignedTo,
          acceptedDeveloper: editAssignedTo,
          assignedToId: editAssignedTo === 'Unassigned' ? '' : editAssignedToId,
          acceptedDeveloperId: editAssignedTo === 'Unassigned' ? '' : editAssignedToId
        },
        sourceHint
      );

      // Refresh displayed issue information directly from backend after successful update
      await fetchLiveIssue();
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save changes on server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !id) return;

    const text = messageText.trim();
    setMessageText('');
    setSendError(null);
    setIsSending(true);

    const senderRole = currentUser?.role || '';
    const now = new Date();
    const formattedTimestamp = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const optimisticMsg: DiscussionMessage = {
      id: `temp-${Date.now()}`,
      issueId: id,
      senderId: String(currentUser?.id || currentUser?.employeeId || ''),
      senderName: currentUser?.name || 'Unknown User',
      senderRole,
      message: text,
      markdown: text,
      createdAt: now.toISOString(),
      timestamp: formattedTimestamp
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const targetIssueId = resolvedIssueId || id;
      const res = await apiSendMessage(
        targetIssueId,
        text,
        currentUser?.id || currentUser?.employeeId,
        currentUser?.name
      );

      if (res.success && res.message) {
        const confirmedMsg = res.message;
        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m.id === confirmedMsg.id);
          if (alreadyExists) {
            return prev.filter((m) => m.id !== optimisticMsg.id);
          }
          return prev.map((m) => (m.id === optimisticMsg.id ? confirmedMsg : m));
        });
        broadcastMessage(confirmedMsg, 'NEW_MESSAGE');
      } else {
        // Revert optimistic message and surface API error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setMessageText(text);
        setSendError(res.error || 'Failed to send message to server.');
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMessageText(text);
      setSendError(err?.message || 'Failed to send message to server.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Edit Message (enforces 15-minute window and updates via backend API)
  const handleEditMessage = async (
    messageId: string,
    updatedText: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetIssueId = resolvedIssueId || id;
    if (!targetIssueId) {
      return { success: false, error: 'Missing issue identifier.' };
    }

    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.createdAt) {
      return { success: false, error: 'Message creation timestamp unavailable.' };
    }

    if (!isWithinEditWindow(targetMsg.createdAt)) {
      return { success: false, error: 'The 15-minute editing window has expired.' };
    }

    const res = await apiUpdateMessage(targetIssueId, messageId, updatedText);
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update message on server.' };
    }

    if (res.message) {
      const updatedMsg: DiscussionMessage = {
        ...targetMsg,
        ...res.message,
        message: res.message.markdown || updatedText,
        markdown: res.message.markdown || updatedText,
        isEdited: true
      };
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updatedMsg : m)));
      broadcastMessage(updatedMsg, 'MESSAGE_UPDATED');
    } else {
      await fetchLiveMessages();
      const updatedMsg: DiscussionMessage = {
        ...targetMsg,
        message: updatedText,
        markdown: updatedText,
        updatedAt: new Date().toISOString(),
        isEdited: true
      };
      broadcastMessage(updatedMsg, 'MESSAGE_UPDATED');
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!issue) return;
    setDeleteError('');
    if (window.confirm(`Are you sure you want to delete ${issue.issueNumber || issue.id}: "${issue.title}"?`)) {
      const deleted = await deleteIssue(issue.id, sourceHint);
      if (deleted) {
        navigate(backPath);
      } else {
        setDeleteError('Failed to delete issue on server. Please try again.');
      }
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
          {fetchError || `We couldn't locate this incident ticket in your active records.`}
        </p>
        <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleBack}>
          <i className="bi bi-arrow-left me-1.5"></i>Back
        </button>
      </div>
    );
  }

  const isDeletable = issue.status === 'Open';

  // Safe Project Name Extraction
  const projectNameDisplay =
    typeof issue.projectName === 'string' && issue.projectName
      ? issue.projectName
      : typeof issue.projectId === 'string' && issue.projectId
        ? issue.projectId
        : ((issue.projectName as any)?.project_name ||
          (issue.projectId as any)?.project_name ||
          (issue.projectName as any)?.name ||
          '—');

  // Priority formatting
  const rawPriority = issue.priority || '—';
  const isP0 = rawPriority.includes('P0');
  const isP1 = rawPriority.includes('P1');

  // Ensure select options always contain the current issue value even if backend format varies
  const shiftOptionsList = editShift && !SHIFT_OPTIONS.includes(editShift)
    ? [editShift, ...SHIFT_OPTIONS]
    : SHIFT_OPTIONS;
  const typeOptionsList = editType && !ISSUE_TYPE_OPTIONS.includes(editType)
    ? [editType, ...ISSUE_TYPE_OPTIONS]
    : ISSUE_TYPE_OPTIONS;
  const statusOptionsList = editStatus && !ISSUE_STATUS_OPTIONS.includes(editStatus)
    ? [editStatus, ...ISSUE_STATUS_OPTIONS]
    : ISSUE_STATUS_OPTIONS;
  const priorityOptionsList = editPriority && !ISSUE_PRIORITY_OPTIONS.includes(editPriority)
    ? [editPriority, ...ISSUE_PRIORITY_OPTIONS]
    : ISSUE_PRIORITY_OPTIONS;

  const hasCurrentProjectOption =
    !editProject ||
    projects.some((p) => String(p.id || p.name) === editProject || p.name === editProject);

  const hasCurrentDevOption =
    !editAssignedTo ||
    editAssignedTo === 'Unassigned' ||
    developers.some((d) => d.name === editAssignedTo);

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
              <span>Back</span>
            </button>

            <span
              className="badge bg-primary px-3 py-1.5 rounded-pill fw-bold text-white shadow-2xs"
              style={{ fontSize: '0.82rem', letterSpacing: '0.2px' }}
            >
              {issue.issueNumber || issue.id}
            </span>

            {issue.status && (
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
            )}

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
              {issue.shift || '—'}
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

            {!isEditing && (
              <button
                type="button"
                className="btn btn-outline-primary rounded-pill px-3 py-1.5 small fw-semibold shadow-2xs d-inline-flex align-items-center gap-1.5"
                onClick={handleOpenEdit}
              >
                <i className="bi bi-pencil-square"></i>
                <span>Edit Issue</span>
              </button>
            )}

            {isDeletable && (
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

      {/* Notifications for updates / errors */}
      {saveSuccess && (
        <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between shadow-xs flex-shrink-0 mb-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <strong>Incident ticket updated successfully on server!</strong>
          </div>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setSaveSuccess(false)}></button>
        </div>
      )}

      {(saveError || deleteError) && (
        <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between shadow-xs flex-shrink-0 mb-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
            <span>{saveError || deleteError}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-sm"
            onClick={() => {
              setSaveError('');
              setDeleteError('');
            }}
          ></button>
        </div>
      )}

      {/* ================= 2. MAIN TWO-COLUMN CONTENT AREA ================= */}
      <div className="flex-grow-1 min-h-0 overflow-y-auto overflow-lg-hidden">
        <div className="row g-3 h-100 min-h-0 details-split-container">

          {/* ================= LEFT COLUMN (~59%): INCIDENT OVERVIEW & FULL EDIT FORM ================= */}
          <div className="col-12 col-lg-7 d-flex flex-column details-column h-100 min-h-0">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100 d-flex flex-column overflow-hidden">
              <div className="p-3.5 p-xl-4 overflow-y-auto flex-grow-1">

                {isEditing ? (
                  /* ================= COMPLETE EDIT MODE (ALL 10 CREATE ISSUE FIELDS) ================= */
                  <form onSubmit={handleSaveEdit} noValidate>
                    <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
                      <h6 className="fw-bold text-navy mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-pencil-square text-primary"></i>
                        Edit Incident Information
                      </h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-secondary text-decoration-none p-0"
                        onClick={() => {
                          setIsEditing(false);
                          setSaveError('');
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>

                    {optionsError && (
                      <div className="alert alert-warning py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between mb-3">
                        <span>{optionsError}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark py-0 px-2"
                          onClick={loadDropdownOptions}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Row 1: 1. Project & 2. Shift */}
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="form-label small fw-semibold text-navy mb-0">
                            Project <span className="text-danger">*</span>
                          </label>
                          {isLoadingProjects && (
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }} />
                              Loading...
                            </span>
                          )}
                        </div>
                        <select
                          className={`form-select form-select-sm ${editErrors.projectId ? 'is-invalid' : ''}`}
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value)}
                          disabled={isSaving || isLoadingProjects}
                        >
                          <option value="">-- Select Project --</option>
                          {!hasCurrentProjectOption && (
                            <option value={editProject}>{projectNameDisplay || editProject}</option>
                          )}
                          {projects.map((p) => (
                            <option key={String(p.id)} value={String(p.id || p.name)}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {editErrors.projectId && (
                          <div className="invalid-feedback small">{editErrors.projectId}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-navy mb-1">
                          Shift <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select form-select-sm ${editErrors.shift ? 'is-invalid' : ''}`}
                          value={editShift}
                          onChange={(e) => setEditShift(e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">-- Select Shift --</option>
                          {shiftOptionsList.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {editErrors.shift && (
                          <div className="invalid-feedback small">{editErrors.shift}</div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: 3. Occurrence Time & 4. Issue Type */}
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-navy mb-1">
                          Issue Occurrence Time <span className="text-danger">*</span>
                        </label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light text-muted">
                            <i className="bi bi-calendar-event"></i>
                          </span>
                          <input
                            type="datetime-local"
                            className={`form-control form-control-sm ${editErrors.occurrenceTime ? 'is-invalid' : ''}`}
                            value={editOccurrence}
                            onChange={(e) => setEditOccurrence(e.target.value)}
                            disabled={isSaving}
                          />
                        </div>
                        {editErrors.occurrenceTime && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.74rem' }}>
                            {editErrors.occurrenceTime}
                          </div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-navy mb-1">
                          Issue Type <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select form-select-sm ${editErrors.issueType ? 'is-invalid' : ''}`}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">-- Select Issue Type --</option>
                          {typeOptionsList.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {editErrors.issueType && (
                          <div className="invalid-feedback small">{editErrors.issueType}</div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: 5. Status, 6. Priority & 7. Assigned To */}
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-navy mb-1">
                          Issue Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select form-select-sm ${editErrors.status ? 'is-invalid' : ''}`}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">-- Select Status --</option>
                          {statusOptionsList.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                        {editErrors.status && (
                          <div className="invalid-feedback small">{editErrors.status}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-navy mb-1">
                          Issue Priority <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select form-select-sm ${editErrors.priority ? 'is-invalid' : ''}`}
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">-- Select Priority --</option>
                          {priorityOptionsList.map((pr) => (
                            <option key={pr} value={pr}>{pr}</option>
                          ))}
                        </select>
                        {editErrors.priority && (
                          <div className="invalid-feedback small">{editErrors.priority}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="form-label small fw-semibold text-navy mb-0">
                            Assigned To
                          </label>
                          {isLoadingDevelopers && (
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }} />
                              Loading...
                            </span>
                          )}
                        </div>
                        <select
                          className="form-select form-select-sm"
                          value={editAssignedTo}
                          onChange={handleDeveloperChange}
                          disabled={isSaving || isLoadingDevelopers}
                        >
                          <option value="Unassigned">Unassigned</option>
                          {!hasCurrentDevOption && (
                            <option value={editAssignedTo}>{editAssignedTo}</option>
                          )}
                          {developers.map((d) => (
                            <option key={String(d.id)} value={d.name}>
                              {d.name} {d.employeeId ? `(${d.employeeId})` : ''} {d.roleType ? `[${d.roleType}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 8. Issue Title */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label small fw-semibold text-navy mb-0">
                          Issue Title <span className="text-danger">*</span>
                        </label>
                        <span
                          className={`small ${editTitle.length >= 100 ? 'text-danger fw-bold' : 'text-muted'}`}
                          style={{ fontSize: '0.74rem' }}
                        >
                          {editTitle.length}/100
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={100}
                        className={`form-control form-control-sm ${editErrors.title ? 'is-invalid' : ''}`}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={isSaving}
                      />
                      {editErrors.title && (
                        <div className="invalid-feedback small">{editErrors.title}</div>
                      )}
                    </div>

                    {/* 9. Issue Details / Description */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label small fw-semibold text-navy mb-0">
                          Issue Details <span className="text-danger">*</span>
                        </label>
                        <span
                          className={`small ${editDesc.length >= 1000 ? 'text-danger fw-bold' : 'text-muted'}`}
                          style={{ fontSize: '0.74rem' }}
                        >
                          {editDesc.length}/1000
                        </span>
                      </div>
                      <textarea
                        className={`form-control form-control-sm ${editErrors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        maxLength={1000}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        disabled={isSaving}
                      />
                      {editErrors.description && (
                        <div className="invalid-feedback small">{editErrors.description}</div>
                      )}
                    </div>

                    {/* 10. Root Cause Analysis (RCA) */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label small fw-semibold text-navy mb-0">
                          Root Cause Analysis (RCA)
                        </label>
                        <span
                          className={`small ${editRca.length >= 1000 ? 'text-danger fw-bold' : 'text-muted'}`}
                          style={{ fontSize: '0.74rem' }}
                        >
                          {editRca.length}/1000
                        </span>
                      </div>
                      <textarea
                        className={`form-control form-control-sm ${editErrors.rca ? 'is-invalid' : ''}`}
                        rows={3}
                        maxLength={1000}
                        placeholder="Enter root cause analysis findings (optional)..."
                        value={editRca}
                        onChange={(e) => setEditRca(e.target.value)}
                        disabled={isSaving}
                      />
                      {editErrors.rca && (
                        <div className="invalid-feedback small">{editErrors.rca}</div>
                      )}
                    </div>

                    <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                        onClick={() => {
                          setIsEditing(false);
                          setSaveError('');
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary-action btn-sm px-4"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ================= READ-ONLY DETAILS VIEW ================= */
                  <div>

                    {/* Title & Reporter Header */}
                    <div className="mb-3 pb-2">
                      <h4 className="fw-bold text-navy mb-2 lh-sm" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                        {issue.title || 'Untitled Issue'}
                      </h4>

                      <div className="d-flex flex-wrap align-items-center text-secondary small" style={{ fontSize: '0.82rem' }}>
                        <span className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-person text-primary"></i>
                          Reported by{' '}
                          <strong className="text-navy">
                            {issue.reportedBy || 'Unknown'}
                            {/* {issue.reportedBy ? ` (${issue.issue_created_by_name})` : ''} */}
                            {issue.reportedById ? ` (${issue.reportedById})` : ''}
                          </strong>
                        </span>
                        {issue.reportedDate && (
                          <>
                            <span className="text-muted mx-2">|</span>
                            <span className="d-flex align-items-center gap-1.5">
                              <i className="bi bi-calendar3 text-muted"></i>
                              {issue.reportedDate}
                            </span>
                          </>
                        )}
                        {issue.occurrenceTime && (
                          <>
                            <span className="text-muted mx-2">|</span>
                            <span className="d-flex align-items-center gap-1.5">
                              <i className="bi bi-clock text-muted"></i>
                              Occurrence: {issue.occurrenceTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Overview Metric Cards */}
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
                            {issue.issueType || '—'}
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
                            {issue.shift || '—'}
                          </strong>
                        </div>
                      </div>

                      {/* Card 4: Current Status & Priority */}
                      <div className="col-6 col-sm-3">
                        <div
                          className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between"
                          style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-activity fs-5" style={{ color: '#d97706' }}></i>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Status & Priority</span>
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-1">
                            <span
                              className="badge rounded-pill px-2.5 py-1 fw-bold"
                              style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem' }}
                            >
                              {issue.status || '—'}
                            </span>
                            {issue.priority && (
                              <span className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>
                                {issue.priority}
                              </span>
                            )}
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
                          lineHeight: '1.5',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {issue.description || 'No description provided.'}
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
                          backgroundColor: issue.rca ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${issue.rca ? '#bbf7d0' : '#e2e8f0'}`,
                          minHeight: '75px'
                        }}
                      >
                        {issue.rca ? (
                          <>
                            <div className="mb-2">
                              <span
                                className="badge bg-success text-white px-2.5 py-1 rounded-pill fw-semibold d-inline-flex align-items-center gap-1.5"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-check-circle-fill"></i>
                                RCA Recorded
                              </span>
                            </div>
                            <div
                              className="text-navy lh-base"
                              style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
                            >
                              {issue.rca}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted small fst-italic">
                            No root cause analysis recorded yet.
                          </span>
                        )}
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
                                Unassigned
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
            <IssueCollaborationThread
              messages={messages}
              currentUser={currentUser}
              messageText={messageText}
              onMessageTextChange={setMessageText}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              isLoading={messagesLoading}
              isSending={isSending}
              fetchError={messagesError}
              sendError={sendError}
              isWebSocketConnected={isMessagesWsConnected}
              onRetryFetch={fetchLiveMessages}
              onDismissSendError={() => setSendError(null)}
            />
          </div>

        </div>
      </div>

    </div>
  );
};

export default IssueDetailsPage;
