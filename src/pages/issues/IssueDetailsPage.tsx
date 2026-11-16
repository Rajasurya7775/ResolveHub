import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Issue, DiscussionMessage } from '../../types/issue';
import { apiFetchIssueById, apiFetchMessages } from '../../services/api/issueService';

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

export const IssueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { getIssueById, updateIssue, deleteIssue, addDiscussionMessage } = useIssues();
  const { currentUser } = useAuth();

  // Determine back route from location state
  const fromState = (location.state as any)?.from;
  const isDevUser = String(currentUser?.role || '').toLowerCase().includes('dev');
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

  // Discussion state
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live issue details from backend API on mount / ID change
  const fetchLiveIssue = async () => {
    if (!id) return;
    setIsLoading(true);
    setFetchError(null);

    const res = await apiFetchIssueById(id);
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
    }
  };

  useEffect(() => {
    fetchLiveIssue();
    fetchLiveMessages();
  }, [id]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      await updateIssue(issue.id, {
        title: editTitle.trim(),
        projectId: editProject,
        issueType: editType,
        description: editDesc.trim(),
        shortDescription: editDesc.length > 85 ? `${editDesc.substring(0, 85)}...` : editDesc,
        occurrenceTime: editOccurrence
      });

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

    try {
      await addDiscussionMessage(id, text);
      // Immediately reflect local message
      const optimisticMsg: DiscussionMessage = {
        id: `msg-${Date.now()}`,
        issueId: id,
        senderId: currentUser?.employeeId || 'EMP',
        senderName: currentUser?.name || 'Supporter',
        senderRole: currentUser?.role || 'Support',
        message: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, optimisticMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = () => {
    if (!issue) return;
    if (window.confirm(`Are you sure you want to delete ${issue.id}: "${issue.title}"?`)) {
      deleteIssue(issue.id);
      navigate(backPath);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-white rounded-3 p-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading issue details...</span>
        </div>
        <h6 className="fw-bold text-navy mb-1">Loading Issue #{id}...</h6>
        <p className="text-secondary small mb-0">Fetching live issue data from backend API</p>
      </div>
    );
  }

  if (fetchError || !issue) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-white rounded-3 p-5 text-center">
        <div
          className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-3"
          style={{ width: '64px', height: '64px' }}
        >
          <i className="bi bi-exclamation-triangle-fill fs-2"></i>
        </div>
        <h5 className="fw-bold text-navy mb-2">Issue Not Found</h5>
        <p className="text-secondary small mb-4" style={{ maxWidth: '420px' }}>
          {fetchError || `We couldn't locate incident ticket ${id} in your active records.`}
        </p>
        <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleBack}>
          <i className="bi bi-arrow-left me-1.5"></i>Return to {backLabel}
        </button>
      </div>
    );
  }

  const isEditable = issue.status === 'Open';

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ gap: '0.75rem' }}>
      
      {/* ================= 1. TOP HEADER & BREADCRUMB COMMAND BAR ================= */}
      <div className="bg-white rounded-3 border border-light-subtle shadow-sm px-3 py-2 flex-shrink-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2.5">
          
          {/* Left: Back button + Ticket Identity + Status + Priority */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5"
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left"></i>
              <span>Back to {backLabel}</span>
            </button>

            <div className="vr text-muted d-none d-sm-block" style={{ height: '18px', opacity: 0.35 }}></div>

            <span className="badge bg-primary fs-6 px-3 py-1 rounded-pill fw-bold">
              {issue.id}
            </span>

            <StatusBadge status={issue.status} size="md" />

            {issue.priority && (
              <span
                className={`badge rounded-pill px-2.5 py-1 fw-semibold small ${
                  issue.priority.includes('P0')
                    ? 'bg-danger text-white'
                    : issue.priority.includes('P1')
                    ? 'bg-warning text-dark'
                    : 'bg-primary-subtle text-primary border border-primary-subtle'
                }`}
                style={{ fontSize: '0.76rem' }}
              >
                <i className="bi bi-flag-fill me-1"></i>
                {issue.priority}
              </span>
            )}

            <span className="badge bg-light text-navy border rounded-pill px-2.5 py-1 small" style={{ fontSize: '0.76rem' }}>
              <i className="bi bi-clock me-1 text-primary"></i>
              {issue.shift || 'Shift A'}
            </span>
          </div>

          {/* Right: Actions (Edit, Refresh, Delete) */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light border btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5 text-secondary"
              onClick={() => {
                fetchLiveIssue();
                fetchLiveMessages();
              }}
              title="Refresh from backend API"
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span className="d-none d-md-inline">Refresh</span>
            </button>

            {isEditable && !isEditing && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-pencil-square"></i>
                <span>Edit Issue</span>
              </button>
            )}

            {isEditable && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1.5"
                onClick={handleDelete}
                title="Delete Open Ticket"
              >
                <i className="bi bi-trash"></i>
                <span className="d-none d-md-inline">Delete</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Success Notification for edits */}
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

      {/* ================= 2. MAIN FULL-SCREEN CONTENT AREA: TWO COLUMN LAYOUT ================= */}
      <div className="flex-grow-1 min-h-0 overflow-y-auto overflow-lg-hidden">
        <div className="row g-2.5 h-100 min-h-0 details-split-container">
          
          {/* ================= LEFT COLUMN (60%): ISSUE OVERVIEW & DETAILS ================= */}
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
                  /* ================= READ-ONLY DETAILS VIEW ================= */
                  <div>
                    
                    {/* Title & Reporter Header */}
                    <div className="mb-3 pb-3 border-bottom">
                      <h4 className="fw-bold text-navy mb-2 lh-sm" style={{ fontSize: '1.45rem', letterSpacing: '-0.3px' }}>
                        {issue.title}
                      </h4>

                      <div className="d-flex flex-wrap align-items-center gap-2 text-secondary small">
                        <span className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-person-circle text-primary"></i>
                          Reported by <strong className="text-navy">{issue.reportedBy}</strong>
                          {issue.reportedById && <span className="text-muted">({issue.reportedById})</span>}
                        </span>
                        <span className="text-muted">&bull;</span>
                        <span className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-calendar-event text-muted"></i>
                          {issue.reportedDate}
                        </span>
                        {issue.occurrenceTime && (
                          <>
                            <span className="text-muted">&bull;</span>
                            <span className="d-flex align-items-center gap-1.5">
                              <i className="bi bi-alarm text-muted"></i>
                              Time: {issue.occurrenceTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metadata Chips Grid */}
                    <div className="row g-2.5 mb-3.5">
                      <div className="col-6 col-sm-3">
                        <div className="p-2.5 rounded-3 bg-light border">
                          <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.7rem' }}>PROJECT</span>
                          <strong className="text-navy small d-block text-truncate" title={issue.projectId}>
                            {issue.projectId}
                          </strong>
                        </div>
                      </div>

                      <div className="col-6 col-sm-3">
                        <div className="p-2.5 rounded-3 bg-light border">
                          <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.7rem' }}>ISSUE TYPE</span>
                          <span className="badge bg-secondary-subtle text-secondary-emphasis">
                            {issue.issueType}
                          </span>
                        </div>
                      </div>

                      <div className="col-6 col-sm-3">
                        <div className="p-2.5 rounded-3 bg-light border">
                          <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.7rem' }}>OPERATIONAL SHIFT</span>
                          <span className="badge bg-primary-subtle text-primary">
                            {issue.shift || 'Shift A'}
                          </span>
                        </div>
                      </div>

                      <div className="col-6 col-sm-3">
                        <div className="p-2.5 rounded-3 bg-light border">
                          <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.7rem' }}>CURRENT STATUS</span>
                          <StatusBadge status={issue.status} size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Full Description Section */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-navy mb-2 d-flex align-items-center gap-2 small">
                        <i className="bi bi-card-text text-primary"></i>
                        INCIDENT DESCRIPTION & OBSERVATIONS
                      </h6>
                      <div
                        className="p-3 rounded-3 bg-light bg-opacity-75 border text-navy lh-base"
                        style={{ fontSize: '0.92rem', whiteSpace: 'pre-line' }}
                      >
                        {issue.description}
                      </div>
                    </div>

                    {/* RCA (Root Cause Analysis) Section */}
                    <div className="mb-4">
                      <h6 className="fw-bold text-navy mb-2 d-flex align-items-center gap-2 small">
                        <i className="bi bi-shield-check text-success"></i>
                        ROOT CAUSE ANALYSIS (RCA) & DIAGNOSTICS
                      </h6>
                      
                      {issue.rca ? (
                        <div className="card border-success border-opacity-50 rounded-3 p-3 bg-success bg-opacity-10">
                          <div className="d-flex align-items-center justify-content-between mb-1.5">
                            <span className="badge bg-success text-white small px-2.5 py-1">
                              <i className="bi bi-check2-circle me-1"></i>RCA Verified
                            </span>
                            {issue.resolvedDate && (
                              <span className="text-success small fw-medium">
                                Resolved: {issue.resolvedDate}
                              </span>
                            )}
                          </div>
                          <p className="small text-navy mb-0 lh-base">
                            {issue.rca}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-3 bg-light border border-dashed text-secondary small d-flex align-items-center gap-2">
                          <i className="bi bi-info-circle text-muted fs-5"></i>
                          <span>
                            No Root Cause Analysis has been logged yet. RCA is documented during developer triage and resolution.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Developer Assignment & Engineering Triage Card */}
                    <div className="card border rounded-3 p-3 bg-light bg-opacity-50 mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="text-muted small fw-semibold">DEVELOPER TRIAGE & ASSIGNMENT</span>
                        <span className="badge bg-info-subtle text-info-emphasis small">
                          Engineering Queue
                        </span>
                      </div>
                      
                      <div className="row g-2 align-items-center">
                        <div className="col-12 col-sm-6">
                          <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>ASSIGNED DEVELOPER</span>
                          {issue.acceptedDeveloper === 'Unassigned' ? (
                            <span className="badge bg-secondary-subtle text-secondary px-3 py-1.5 fw-semibold">
                              Unassigned (Queue Pending)
                            </span>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-xs"
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
                          )}
                        </div>

                        <div className="col-12 col-sm-6">
                          <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>ACCEPTED TIMESTAMP</span>
                          <span className="small text-navy fw-medium">
                            {issue.acceptedDate || 'Pending acceptance'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>
          </div>

          {/* ================= RIGHT COLUMN (40%): LIVE DISCUSSION THREAD ================= */}
          <div className="col-12 col-lg-5 d-flex flex-column details-column h-100 min-h-0">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100 d-flex flex-column overflow-hidden">
              
              {/* Thread Header */}
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light flex-shrink-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-1.5 d-flex align-items-center justify-content-center">
                    <i className="bi bi-chat-dots-fill"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.9rem' }}>
                      Incident Collaboration Thread
                    </h6>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                      2-way sync between Supporters and Developers
                    </small>
                  </div>
                </div>
                <span className="badge bg-secondary-subtle text-secondary small">
                  {messages.length} msg{messages.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Scrollable Message List */}
              <div
                className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-2.5"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                {messages.length === 0 ? (
                  <div className="my-auto text-center py-5 text-muted">
                    <i className="bi bi-chat-square-text fs-2 d-block mb-2 text-secondary opacity-50"></i>
                    <p className="small mb-1 fw-medium text-navy">No messages yet in this discussion.</p>
                    <span className="small text-muted" style={{ fontSize: '0.76rem' }}>
                      Start the collaboration by sending a message below.
                    </span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf =
                      msg.senderId === currentUser?.employeeId ||
                      msg.senderName === currentUser?.name;
                    const isDev =
                      msg.senderRole?.toLowerCase().includes('dev') ||
                      msg.senderName?.toLowerCase().includes('arun');

                    return (
                      <div
                        key={msg.id}
                        className={`d-flex flex-column ${isSelf ? 'align-items-end' : 'align-items-start'}`}
                      >
                        {/* Sender info line */}
                        <div className="d-flex align-items-center gap-1.5 mb-1 px-1">
                          <span className="fw-bold text-navy" style={{ fontSize: '0.76rem' }}>
                            {msg.senderName}
                          </span>
                          <span
                            className={`badge px-1.5 py-0 rounded-pill ${
                              isDev ? 'bg-purple-subtle text-purple' : 'bg-primary-subtle text-primary'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {msg.senderRole}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className="p-2.5 rounded-3 shadow-xs"
                          style={{
                            maxWidth: '85%',
                            backgroundColor: isSelf ? '#0D6EFD' : '#FFFFFF',
                            color: isSelf ? '#FFFFFF' : '#1E293B',
                            border: isSelf ? 'none' : '1px solid #E2E8F0',
                            fontSize: '0.85rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Message Composer Box */}
              <div className="p-2.5 bg-white border-top flex-shrink-0">
                <form onSubmit={handleSendMessage} className="d-flex gap-2 align-items-center">
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill px-3"
                    placeholder="Type a message to collaborate with engineers..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-action rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0"
                    style={{ width: '34px', height: '34px' }}
                    disabled={!messageText.trim() || isSending}
                    title="Send message (Enter)"
                  >
                    <i className="bi bi-send-fill fs-6"></i>
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
export default IssueDetailsPage;

