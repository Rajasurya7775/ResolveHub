import React, { useState, useEffect } from 'react';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { getCurrentShift } from '../../utils/shiftUtils';
import { ProjectItem, DeveloperItem } from '../../types/issue';
import { apiFetchProjects, apiFetchDevelopers } from '../../services/api/issueService';

interface ReportIssueModalProps {
  onClose: () => void;
  onSuccess?: (newIssueId: string) => void;
}

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

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ onClose, onSuccess }) => {
  const { addIssue } = useIssues();
  const { currentUser } = useAuth();

  // Dynamic lists from APIs
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingDevelopers, setIsLoadingDevelopers] = useState(false);

  // Form Fields matching user's exact requirements:
  // 1. Project
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
      if (onSuccess) {
        onSuccess(created.id);
      } else {
        onClose();
      }
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
    <div
      className="modal show fade d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 align-items-center">
            <div className="d-flex align-items-center gap-2.5">
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center">
                <i className="bi bi-plus-circle-fill fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-navy fs-6 mb-0">Report Technical Incident</h5>
                <small className="text-secondary">
                  Logged by: <strong className="text-navy">{currentUser?.name || 'Supporter'}</strong> ({currentUser?.employeeId || 'EMP'})
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4 bg-white" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              
              {submitError && (
                <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
                  <span>{submitError}</span>
                </div>
              )}

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
                    className={`form-select form-select-sm ${errors.projectId ? 'is-invalid' : ''}`}
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
                    className={`form-select form-select-sm ${errors.shift ? 'is-invalid' : ''}`}
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

              {/* Row 2: 3. Issue Occurrence Time & 6. Issue Type */}
              <div className="row g-3 mb-3">
                
                {/* 3. Issue Occurrence time (calendar with time) */}
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-navy small mb-1">
                    Issue Occurrence Time <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light text-muted">
                      <i className="bi bi-calendar-event"></i>
                    </span>
                    <input
                      type="datetime-local"
                      className={`form-control form-control-sm ${errors.occurrenceTime ? 'is-invalid' : ''}`}
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
                    className={`form-select form-select-sm ${errors.issueType ? 'is-invalid' : ''}`}
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
                    className={`form-select form-select-sm ${errors.status ? 'is-invalid' : ''}`}
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
                    className={`form-select form-select-sm ${errors.priority ? 'is-invalid' : ''}`}
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
                    className="form-select form-select-sm"
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
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
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
                  className={`form-control form-control-sm ${errors.description ? 'is-invalid' : ''}`}
                  rows={4}
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
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-semibold text-navy small mb-0">
                    Root Cause Analysis (RCA)
                  </label>
                  <span className="badge bg-secondary-subtle text-secondary small fw-normal">
                    If available / Optional
                  </span>
                </div>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  maxLength={1000}
                  placeholder="Enter initial root cause analysis findings (if already diagnosed or known)..."
                  value={rca}
                  onChange={(e) => setRca(e.target.value)}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light px-4 py-2.5 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
              </button>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border rounded-pill px-3"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-sm btn-primary-action px-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill me-1.5"></i>Submit Issue
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
