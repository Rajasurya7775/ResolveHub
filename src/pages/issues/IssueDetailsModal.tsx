import React, { useState, useEffect, useRef } from 'react';
import { Issue, IssueProject, IssueCategory } from '../../types/issue';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';

interface IssueDetailsModalProps {
  issue: Issue;
  onClose: () => void;
}

export const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({ issue, onClose }) => {
  const { updateIssue, getDiscussion, addDiscussionMessage } = useIssues();
  const { currentUser } = useAuth();

  // Local state for editing fields
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editProject, setEditProject] = useState<IssueProject>(issue.projectId);
  const [editType, setEditType] = useState<IssueCategory>(issue.issueType);
  const [editDesc, setEditDesc] = useState(issue.description);
  const [editOccurrence, setEditOccurrence] = useState(issue.occurrenceTime);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Discussion thread message input
  const [messageText, setMessageText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const messages = getDiscussion(issue.id);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDesc.trim()) return;

    updateIssue(issue.id, {
      title: editTitle.trim(),
      projectId: editProject,
      issueType: editType,
      description: editDesc.trim(),
      shortDescription:
        editDesc.length > 85 ? `${editDesc.substring(0, 85)}...` : editDesc,
      occurrenceTime: editOccurrence
    });

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    addDiscussionMessage(issue.id, messageText);
    setMessageText('');
  };

  const isEditable = issue.status === 'Open';

  return (
    <div
      className="modal show fade d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '1150px' }}>
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          
          {/* Modal Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 align-items-center">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary fw-bold px-2.5 py-1 rounded-pill">
                {issue.id}
              </span>
              <StatusBadge status={issue.status} size="sm" />
              <span className="text-secondary small fw-medium">
                Reported by <strong className="text-navy">{issue.reportedBy}</strong> ({issue.reportedById}) on {issue.reportedDate}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              {isEditable && !isEditing && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill px-3"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="bi bi-pencil me-1"></i>Edit Details
                </button>
              )}
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>
          </div>

          {/* Modal Body: 55% Left + 45% Right */}
          <div className="modal-body p-0">
            <div className="row g-0 h-100">
              
              {/* ================= LEFT SECTION (55%): ISSUE DETAILS ================= */}
              <div
                className="col-12 col-lg-7 p-4 border-end overflow-y-auto"
                style={{ maxHeight: '72vh', backgroundColor: '#FFFFFF' }}
              >
                {saveSuccess && (
                  <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center mb-3">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Issue details updated successfully!
                  </div>
                )}

                {isEditing ? (
                  /* Edit Form for Supporter */
                  <form onSubmit={handleSaveEdit}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="fw-bold text-navy mb-0">Edit Issue Information</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-secondary text-decoration-none p-0"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Issue Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-secondary">Project</label>
                        <select
                          className="form-select form-select-sm"
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value as IssueProject)}
                        >
                          <option value="Nokia Production Dashboard">Nokia Production Dashboard</option>
                          <option value="Manufacturing Analytics">Manufacturing Analytics</option>
                          <option value="Inventory Monitoring">Inventory Monitoring</option>
                          <option value="Network Monitoring">Network Monitoring</option>
                        </select>
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold text-secondary">Issue Type</label>
                        <select
                          className="form-select form-select-sm"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as IssueCategory)}
                        >
                          <option value="Production Issue">Production Issue</option>
                          <option value="Dashboard Issue">Dashboard Issue</option>
                          <option value="Network Issue">Network Issue</option>
                          <option value="Application Issue">Application Issue</option>
                          <option value="Hardware Issue">Hardware Issue</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Occurrence Time</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editOccurrence}
                        onChange={(e) => setEditOccurrence(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Full Description</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={5}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        required
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Read-Only Details View */
                  <div>
                    {/* Title */}
                    <h5 className="fw-bold text-navy mb-2 lh-sm">{issue.title}</h5>

                    {/* Metadata chips */}
                    <div className="d-flex flex-wrap gap-2 mb-4">
                      <span className="badge bg-light text-secondary border px-2.5 py-1">
                        <i className="bi bi-kanban me-1 text-primary"></i>
                        {issue.projectId}
                      </span>
                      <span className="badge bg-light text-secondary border px-2.5 py-1">
                        <i className="bi bi-tag me-1 text-primary"></i>
                        {issue.issueType}
                      </span>
                      <span className="badge bg-light text-secondary border px-2.5 py-1">
                        <i className="bi bi-clock me-1 text-primary"></i>
                        Occurred: {issue.occurrenceTime}
                      </span>
                    </div>

                    {/* Full Description */}
                    <div className="mb-4">
                      <label className="text-uppercase text-muted fw-bold small d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        Full Issue Description
                      </label>
                      <div className="p-3 bg-light rounded-3 border text-secondary small lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                        {issue.description}
                      </div>
                    </div>

                    {/* Developer Assignment & Status Card */}
                    <div className="card border rounded-3 p-3 bg-light-subtle mb-4">
                      <div className="row g-3">
                        <div className="col-sm-6">
                          <span className="text-muted small d-block mb-1">Accepted Developer</span>
                          {issue.acceptedDeveloper === 'Unassigned' ? (
                            <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1 fw-semibold">
                              Unassigned
                            </span>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                                style={{ width: '28px', height: '28px', fontSize: '0.78rem' }}
                              >
                                {issue.acceptedDeveloper.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-semibold text-navy small">{issue.acceptedDeveloper}</div>
                                {issue.acceptedDeveloperId && (
                                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {issue.acceptedDeveloperId}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="col-sm-6">
                          <span className="text-muted small d-block mb-1">Accepted Date</span>
                          <span className="small text-navy fw-medium">
                            {issue.acceptedDate || 'Pending developer acceptance'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RCA & Resolution Section (if resolved) */}
                    {issue.status === 'Resolved' && (
                      <div className="card border-success border-opacity-50 rounded-3 p-3 bg-success bg-opacity-10 mb-3">
                        <div className="d-flex align-items-center gap-2 text-success fw-bold mb-2">
                          <i className="bi bi-check-circle-fill"></i>
                          <span>Root Cause Analysis (RCA)</span>
                        </div>
                        <p className="small text-navy mb-2 lh-base">
                          {issue.rca || 'RCA documented and verified by engineering team.'}
                        </p>
                        {issue.resolvedDate && (
                          <div className="small text-success fw-medium">
                            <i className="bi bi-calendar-check me-1"></i>
                            Resolved Date: {issue.resolvedDate}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Non-editable notice for Supporters */}
                    <div className="text-muted small d-flex align-items-center gap-1.5 mt-3 pt-2 border-top" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-info-circle text-primary"></i>
                      <span>
                        Note: Status transitions, developer assignment, and RCA fields are controlled exclusively by Developers & Administrators.
                      </span>
                    </div>

                  </div>
                )}
              </div>

              {/* ================= RIGHT SECTION (45%): DISCUSSION THREAD ================= */}
              <div
                className="col-12 col-lg-5 p-3 d-flex flex-column"
                style={{ backgroundColor: '#F8FAFC', maxHeight: '72vh' }}
              >
                {/* Thread Header */}
                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-chat-left-dots-fill text-primary"></i>
                    <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                      Issue Discussion Thread
                    </h6>
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary small">
                    {messages.length} message{messages.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Messages Scrollable List */}
                <div className="flex-grow-1 overflow-y-auto px-1 py-2" style={{ minHeight: '300px' }}>
                  {messages.length === 0 ? (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center text-muted p-4">
                      <i className="bi bi-chat-square-text fs-1 mb-2 opacity-50"></i>
                      <p className="small mb-1 fw-semibold">No messages in this thread yet</p>
                      <span className="small" style={{ fontSize: '0.75rem' }}>
                        Start the conversation below to communicate with developers.
                      </span>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe =
                        msg.senderId === currentUser?.employeeId ||
                        (currentUser?.role === 'Supporter' && msg.senderRole === 'Supporter');

                      return (
                        <div
                          key={msg.id}
                          className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}
                        >
                          <div className="d-flex align-items-center gap-1 mb-1">
                            <span className="fw-bold text-navy" style={{ fontSize: '0.78rem' }}>
                              {msg.senderName}
                            </span>
                            <span
                              className={`badge ${
                                msg.senderRole === 'Supporter'
                                  ? 'bg-primary-subtle text-primary'
                                  : 'bg-purple-subtle text-purple'
                              } px-1.5 py-0.5 rounded-pill`}
                              style={{
                                fontSize: '0.65rem',
                                backgroundColor: msg.senderRole === 'Supporter' ? '#E0EDFF' : '#F3E8FF',
                                color: msg.senderRole === 'Supporter' ? '#0D6EFD' : '#7E22CE'
                              }}
                            >
                              {msg.senderRole}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                              • {msg.timestamp}
                            </span>
                          </div>

                          <div
                            className={`p-2.5 small ${
                              isMe ? 'chat-bubble-supporter text-white' : 'chat-bubble-developer bg-white shadow-sm'
                            }`}
                            style={{
                              maxWidth: '88%',
                              lineHeight: 1.45,
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.85rem'
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

                {/* Message Input Bottom Form */}
                <form onSubmit={handleSendMessage} className="mt-2 pt-2 border-top">
                  <div className="input-group">
                    <textarea
                      className="form-control form-control-sm rounded-start-3"
                      rows={2}
                      placeholder="Type a message to developers... (Enter to type)"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary px-3 d-flex align-items-center gap-1"
                      disabled={!messageText.trim()}
                    >
                      <i className="bi bi-send-fill"></i>
                      <span className="d-none d-sm-inline">Send</span>
                    </button>
                  </div>
                  <div className="text-muted text-end mt-1" style={{ fontSize: '0.7rem' }}>
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </form>

              </div>

            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-light px-4 py-2.5">
            <button type="button" className="btn btn-sm btn-secondary rounded-pill px-3" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

