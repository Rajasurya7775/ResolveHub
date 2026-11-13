import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { getCurrentShift } from '../../utils/shiftUtils';
import { ProjectItem, DeveloperItem } from '../../types/issue';
import { apiFetchProjects, apiFetchDevelopers } from '../../services/api/issueService';

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

const getInitialDateTime = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultShift = (): string => {
  const current = getCurrentShift().shift;
  if (current.includes('A')) return 'Shift-A';
  if (current.includes('B')) return 'Shift-B';
  if (current.includes('C')) return 'Shift-C';
  return 'General';
};

export const IssueFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addIssue } = useIssues();
  const { currentUser } = useAuth();

  // Dynamic lists from APIs
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingDevelopers, setIsLoadingDevelopers] = useState(false);

  // 10 Required Fields matching specifications:
  // 1. Project (Dropdown from API /issues/projects)
  const [projectId, setProjectId] = useState<string>('Nokia Production Dashboard');
  // 2. Shift (Shift-A, Shift-B, Shift-C, General)
  const [shift, setShift] = useState<string>(getDefaultShift);
  // 3. Issue Occurrence time (calendar with time)
  const [occurrenceTime, setOccurrenceTime] = useState<string>(getInitialDateTime);
  // 4. Issue Title (limit of 0/100)
  const [title, setTitle] = useState<string>('');
  // 5. Issue Details (limit of 0/1000)
  const [description, setDescription] = useState<string>('');
  // 6. Issue Type (Front-end, Backend, Database, Hardware, Others)
  const [issueType, setIssueType] = useState<string>('Front-end');
  // 7. RCA (If available)
  const [rca, setRca] = useState<string>('');
  // 8. Issue Status (Open, In progress, Pending, On Hold, Escalated, Resolved)
  const [status, setStatus] = useState<string>('Open');
  // 9. Issue Priority (P0 – Critical, P1 – High, P2 – Moderate, P3 – Low, P4 – Negligible)
  const [priority, setPriority] = useState<string>('P2 – Moderate');
  // 10. Assigned To (fetch from API /issues/developers)
  const [assignedTo, setAssignedTo] = useState<string>('Unassigned');
  const [assignedToId, setAssignedToId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdIssueId, setCreatedIssueId] = useState('');

  // Fetch Projects and Developers from Backend APIs
  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setIsLoadingProjects(true);
      setIsLoadingDevelopers(true);

      const [projRes, devRes] = await Promise.all([
        apiFetchProjects(),
        apiFetchDevelopers()
      ]);

      if (isMounted) {
        if (projRes.data && projRes.data.length > 0) {
          setProjects(projRes.data);
          setProjectId(String(projRes.data[0].id || projRes.data[0].name));
        }
        setIsLoadingProjects(false);

        if (devRes.data && devRes.data.length > 0) {
          setDevelopers(devRes.data);
        }
        setIsLoadingDevelopers(false);
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeveloperChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setAssignedTo(val);
    const found = developers.find((d) => d.name === val || String(d.id) === val);
    if (found) {
      setAssignedToId(String(found.id));
    } else {
      setAssignedToId('');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!projectId.trim()) errs.projectId = 'Project selection is mandatory.';
    if (!shift.trim()) errs.shift = 'Shift is mandatory.';
    if (!occurrenceTime.trim()) errs.occurrenceTime = 'Occurrence time is mandatory.';
    if (!title.trim()) {
      errs.title = 'Issue Title is mandatory.';
    } else if (title.trim().length > 100) {
      errs.title = 'Issue Title cannot exceed 100 characters.';
    }
    if (!description.trim()) {
      errs.description = 'Issue Details are mandatory.';
    } else if (description.trim().length > 1000) {
      errs.description = 'Issue Details cannot exceed 1000 characters.';
    }
    if (!issueType.trim()) errs.issueType = 'Issue Type is mandatory.';
    if (!status.trim()) errs.status = 'Issue Status is mandatory.';
    if (!priority.trim()) errs.priority = 'Issue Priority is mandatory.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const created = await addIssue({
        projectId,
        shift,
        occurrenceTime,
        title: title.trim(),
        description: description.trim(),
        issueType,
        rca: rca.trim() ? rca.trim() : undefined,
        status,
        priority,
        assignedTo: assignedTo !== 'Unassigned' ? assignedTo : undefined,
        assignedToId: assignedToId || undefined
      });

      setIsSubmitting(false);
      setCreatedIssueId(created.id);
      setIsSubmitted(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Failed to submit issue to server.');
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setRca('');
    setShift(getDefaultShift());
    setOccurrenceTime(getInitialDateTime());
    setIssueType('Front-end');
    setStatus('Open');
    setPriority('P2 – Moderate');
    setAssignedTo('Unassigned');
    setAssignedToId('');
    if (projects.length > 0) {
      setProjectId(String(projects[0].id || projects[0].name));
    }
    setErrors({});
    setSubmitError('');
  };

  return (
    <div className="container-fluid px-0" style={{ maxWidth: '900px' }}>
      
      {/* Page Heading */}
      <div className="mb-4">
        <h4 className="fw-bold text-navy mb-1">Create Technical Incident</h4>
        <p className="text-secondary small mb-0">
          Logged-in Supporter: <strong className="text-navy">{currentUser?.name || 'Supporter'}</strong> ({currentUser?.employeeId || 'EMP'})
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
            Ticket <span className="badge bg-primary fs-6 px-3 py-1.5">{createdIssueId}</span> has been logged with status{' '}
            <span className="badge bg-warning text-dark">{status}</span> and priority{' '}
            <span className="badge bg-danger-subtle text-danger-emphasis">{priority}</span>.
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
          
          {submitError && (
            <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            
            {/* Row 1: 1. Project & 2. Shift */}
            <div className="row g-3 mb-3">
              
              {/* 1. Project (Dropdown from API /issues/projects) */}
              <div className="col-12 col-md-6">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-semibold text-navy small mb-0">
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
                  className={`form-select ${errors.projectId ? 'is-invalid' : ''}`}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={String(p.id)} value={String(p.id || p.name)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <div className="invalid-feedback small">{errors.projectId}</div>
                )}
              </div>

              {/* 2. Shift (Shift-A, Shift-B, Shift-C, General) */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-navy small mb-1">
                  Shift <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.shift ? 'is-invalid' : ''}`}
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.shift && (
                  <div className="invalid-feedback small">{errors.shift}</div>
                )}
              </div>

            </div>

            {/* Row 2: 3. Occurrence Time & 6. Issue Type */}
            <div className="row g-3 mb-3">
              
              {/* 3. Issue Occurrence time (calendar with time) */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-navy small mb-1">
                  Issue Occurrence Time <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">
                    <i className="bi bi-calendar-event"></i>
                  </span>
                  <input
                    type="datetime-local"
                    className={`form-control ${errors.occurrenceTime ? 'is-invalid' : ''}`}
                    value={occurrenceTime}
                    onChange={(e) => setOccurrenceTime(e.target.value)}
                  />
                </div>
                {errors.occurrenceTime && (
                  <div className="text-danger small mt-1" style={{ fontSize: '0.74rem' }}>{errors.occurrenceTime}</div>
                )}
              </div>

              {/* 6. Issue Type (Front-end, Backend, Database, Hardware, Others) */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-navy small mb-1">
                  Issue Type <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.issueType ? 'is-invalid' : ''}`}
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                >
                  {ISSUE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.issueType && (
                  <div className="invalid-feedback small">{errors.issueType}</div>
                )}
              </div>

            </div>

            {/* Row 3: 8. Status, 9. Priority, 10. Assigned To */}
            <div className="row g-3 mb-3">
              
              {/* 8. Issue Status (Open, In progress, Pending, On Hold, Escalated, Resolved) */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-navy small mb-1">
                  Issue Status <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {ISSUE_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <div className="invalid-feedback small">{errors.status}</div>
                )}
              </div>

              {/* 9. Issue Priority (P0 – Critical, P1 – High, P2 – Moderate, P3 – Low, P4 – Negligible) */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-navy small mb-1">
                  Issue Priority <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.priority ? 'is-invalid' : ''}`}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {ISSUE_PRIORITY_OPTIONS.map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <div className="invalid-feedback small">{errors.priority}</div>
                )}
              </div>

              {/* 10. Assigned To (Dropdown from API /issues/developers) */}
              <div className="col-12 col-md-4">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-semibold text-navy small mb-0">
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
                  className="form-select"
                  value={assignedTo}
                  onChange={handleDeveloperChange}
                >
                  <option value="Unassigned">Unassigned</option>
                  {developers.map((d) => (
                    <option key={String(d.id)} value={d.name}>
                      {d.name} {d.employeeId ? `(${d.employeeId})` : ''} {d.roleType ? `[${d.roleType}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* 4. Issue Title with limit of 0/100 */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold text-navy small mb-0">
                  Issue Title <span className="text-danger">*</span>
                </label>
                <span
                  className={`small ${title.length >= 100 ? 'text-danger fw-bold' : 'text-muted'}`}
                  style={{ fontSize: '0.74rem' }}
                >
                  {title.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                placeholder="Enter concise incident title (e.g. Telemetry sensor timeout on Node 4B)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && (
                <div className="invalid-feedback small">{errors.title}</div>
              )}
            </div>

            {/* 5. Issue Details with limit of 0/1000 */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold text-navy small mb-0">
                  Issue Details <span className="text-danger">*</span>
                </label>
                <span
                  className={`small ${description.length >= 1000 ? 'text-danger fw-bold' : 'text-muted'}`}
                  style={{ fontSize: '0.74rem' }}
                >
                  {description.length}/1000
                </span>
              </div>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                rows={5}
                maxLength={1000}
                placeholder="Provide comprehensive details, error logs, affected production units, reproduction steps, and operational impact..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description && (
                <div className="invalid-feedback small">{errors.description}</div>
              )}
            </div>

            {/* 7. RCA (Root Cause Analysis - If available) */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold text-navy small mb-0">
                  Root Cause Analysis (RCA)
                </label>
                <span className="badge bg-secondary-subtle text-secondary small fw-normal">
                  If available / Optional
                </span>
              </div>
              <textarea
                className="form-control"
                rows={3}
                maxLength={1000}
                placeholder="Enter initial root cause analysis findings (if already diagnosed or known)..."
                value={rca}
                onChange={(e) => setRca(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="d-flex align-items-center justify-content-end gap-2 pt-3 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary-action px-4 py-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-1.5"></i>Create Incident Ticket
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};
