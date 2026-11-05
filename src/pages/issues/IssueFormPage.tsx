import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { IssueProject, IssueCategory } from '../../types/issue';

export const IssueFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addIssue } = useIssues();
  const { currentUser } = useAuth();

  const [projectId, setProjectId] = useState<IssueProject>('Nokia Production Dashboard');
  const [issueType, setIssueType] = useState<IssueCategory>('Production Issue');
  const [occurrenceTime, setOccurrenceTime] = useState(() => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdIssueId, setCreatedIssueId] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Issue Title is mandatory.';
    if (!description.trim()) errs.description = 'Issue Description is mandatory.';
    if (!occurrenceTime.trim()) errs.occurrenceTime = 'Occurrence Time is mandatory.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    const created = addIssue({
      projectId,
      issueType,
      occurrenceTime,
      title: title.trim(),
      description: description.trim()
    });

    setCreatedIssueId(created.id);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setProjectId('Nokia Production Dashboard');
    setIssueType('Production Issue');
    setErrors({});
  };

  return (
    <div className="container-fluid px-0" style={{ maxWidth: '900px' }}>
      
      {/* Page Heading */}
      <div className="mb-4">
        <h4 className="fw-bold text-navy mb-1">Create Technical Incident</h4>
        <p className="text-secondary small mb-0">
          Logged-in Supporter: <strong className="text-navy">{currentUser?.name}</strong> ({currentUser?.employeeId})
        </p>
      </div>

      {/* Confirmation Banner */}
      {isSubmitted ? (
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center bg-white">
          <div
            className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: '64px', height: '64px' }}
          >
            <i className="bi bi-check-circle-fill fs-2"></i>
          </div>
          <h4 className="fw-bold text-navy mb-2">Issue Reported Successfully!</h4>
          <p className="text-secondary small mb-3">
            Ticket <span className="badge bg-primary fs-6 px-3 py-1.5">{createdIssueId}</span> has been logged with status <span className="badge bg-warning text-dark">Open</span> and routed to the Developer triage queue.
          </p>

          <div className="d-flex justify-content-center gap-3 mt-3">
            <button
              type="button"
              className="btn btn-outline-primary rounded-pill px-4"
              onClick={() => {
                handleReset();
                setIsSubmitted(false);
              }}
            >
              Report Another Issue
            </button>
            <button
              type="button"
              className="btn btn-primary-action px-4"
              onClick={() => navigate('/issues/my')}
            >
              View in My Issues
            </button>
          </div>
        </div>
      ) : (
        /* Issue Form Card */
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
          <form onSubmit={handleSubmit} noValidate>
            
            {/* Project Selection */}
            <div className="mb-3">
              <label className="form-label fw-semibold text-navy small">
                1. Project Selection <span className="text-danger">*</span>
              </label>
              <select
                className="form-select custom-select-control"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value as IssueProject)}
              >
                <option value="Nokia Production Dashboard">Nokia Production Dashboard</option>
                <option value="Manufacturing Analytics">Manufacturing Analytics</option>
                <option value="Inventory Monitoring">Inventory Monitoring</option>
                <option value="Network Monitoring">Network Monitoring</option>
              </select>
              <div className="form-text small text-muted">
                Select the target industrial application or telemetry system.
              </div>
            </div>

            {/* Row: Issue Type & Occurrence Time */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-navy small">
                  2. Issue Type <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as IssueCategory)}
                >
                  <option value="Production Issue">Production Issue</option>
                  <option value="Dashboard Issue">Dashboard Issue</option>
                  <option value="Network Issue">Network Issue</option>
                  <option value="Application Issue">Application Issue</option>
                  <option value="Hardware Issue">Hardware Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-navy small">
                  3. Occurrence Time <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.occurrenceTime ? 'is-invalid' : ''}`}
                  value={occurrenceTime}
                  onChange={(e) => setOccurrenceTime(e.target.value)}
                  placeholder="e.g. 2026-11-03 08:30 AM"
                />
                {errors.occurrenceTime && (
                  <div className="invalid-feedback small">{errors.occurrenceTime}</div>
                )}
              </div>
            </div>

            {/* Issue Title */}
            <div className="mb-3">
              <label className="form-label fw-semibold text-navy small">
                4. Issue Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                placeholder="Brief summary of the issue (e.g. PLC Node 4 dropped packet rate high)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && (
                <div className="invalid-feedback small">{errors.title}</div>
              )}
            </div>

            {/* Issue Description */}
            <div className="mb-4">
              <label className="form-label fw-semibold text-navy small">
                5. Issue Description <span className="text-danger">*</span>
              </label>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                rows={5}
                placeholder="Provide comprehensive details: steps to reproduce, affected work cells, error codes, and line impact..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description && (
                <div className="invalid-feedback small">{errors.description}</div>
              )}
            </div>

            {/* Initial Assignment Note */}
            <div className="bg-light p-3 rounded-3 border mb-4 small text-secondary">
              <i className="bi bi-info-circle-fill text-primary me-2"></i>
              Upon submission, status is set to <span className="badge bg-warning text-dark">Open</span> and Developer is set to <span className="badge bg-secondary">Unassigned</span>. You can track updates and discuss directly in the two-way thread.
            </div>

            {/* Action Buttons */}
            <div className="d-flex align-items-center justify-content-between pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={handleReset}
              >
                Reset
              </button>

              <button
                type="submit"
                className="btn btn-primary-action px-4 py-2"
              >
                Submit Incident
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};

