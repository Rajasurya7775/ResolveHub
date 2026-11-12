import React, { useState } from 'react';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { getCurrentShift } from '../../utils/shiftUtils';
import { IssueProject, IssueCategory } from '../../types/issue';
import { ShiftType } from '../../types/user';

interface ReportIssueModalProps {
  onClose: () => void;
  onSuccess?: (newIssueId: string) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ onClose, onSuccess }) => {
  const { addIssue } = useIssues();
  const { currentUser } = useAuth();
  const currentShift = getCurrentShift();

  const [projectId, setProjectId] = useState<IssueProject>('Nokia Production Dashboard');
  const [issueType, setIssueType] = useState<IssueCategory>('Production Issue');
  const [shift, setShift] = useState<ShiftType>(currentShift.shift);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Issue Title is mandatory.';
    if (!description.trim()) errs.description = 'Issue Description is mandatory.';
    if (!occurrenceTime.trim()) errs.occurrenceTime = 'Occurrence Time is mandatory.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        issueType,
        occurrenceTime,
        shift,
        title: title.trim(),
        description: description.trim()
      });
      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess(created.id);
      } else {
        onClose();
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setProjectId('Nokia Production Dashboard');
    setIssueType('Production Issue');
    setShift(currentShift.shift);
    setErrors({});
  };

  return (
    <div
      className="modal show fade d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 align-items-center">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center">
                <i className="bi bi-plus-circle-fill fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-navy fs-6 mb-0">Report New Technical Issue</h5>
                <small className="text-secondary">
                  Logged by: <strong className="text-navy">{currentUser?.name}</strong> ({currentUser?.employeeId})
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
              
              {/* Row 1: Project & Type */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-navy small mb-1">
                    1. Target Project <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value as IssueProject)}
                  >
                    <option value="Nokia Production Dashboard">Nokia Production Dashboard</option>
                    <option value="Manufacturing Analytics">Manufacturing Analytics</option>
                    <option value="Inventory Monitoring">Inventory Monitoring</option>
                    <option value="Network Monitoring">Network Monitoring</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-navy small mb-1">
                    2. Issue Type <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm"
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
              </div>

              {/* Row 2: Occurrence Time & Shift Selection */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-7">
                  <label className="form-label fw-semibold text-navy small mb-1">
                    3. Occurrence Time <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${errors.occurrenceTime ? 'is-invalid' : ''}`}
                    value={occurrenceTime}
                    onChange={(e) => setOccurrenceTime(e.target.value)}
                    placeholder="e.g. 2026-11-03 08:30 AM"
                  />
                  {errors.occurrenceTime && (
                    <div className="invalid-feedback small">{errors.occurrenceTime}</div>
                  )}
                </div>

                <div className="col-12 col-md-5">
                  <label className="form-label fw-semibold text-navy small mb-1">
                    Shift Assignment <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={shift}
                    onChange={(e) => setShift(e.target.value as ShiftType)}
                  >
                    <option value="Shift A">Shift A</option>
                    <option value="Shift B">Shift B</option>
                    <option value="Shift C">Shift C</option>
                  </select>
                </div>
              </div>

              {/* Issue Title */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-navy small mb-1">
                  4. Issue Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="Concise summary (e.g., Telemetry packet spike on Node 4B)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {errors.title && (
                  <div className="invalid-feedback small">{errors.title}</div>
                )}
              </div>

              {/* Issue Description */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-navy small mb-1">
                  5. Full Issue Description <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`form-control form-control-sm ${errors.description ? 'is-invalid' : ''}`}
                  rows={4}
                  placeholder="Detailed description: error messages, affected sensors or cells, and impact on operations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && (
                  <div className="invalid-feedback small">{errors.description}</div>
                )}
              </div>

              {/* Information pill */}
              <div className="p-2.5 rounded-3 bg-light border small text-secondary d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill text-primary"></i>
                <span>
                  Initial status will be set to <span className="badge bg-warning text-dark">Open</span> and assigned to Developer queue.
                </span>
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
                Reset
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
                    'Submit Ticket'
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

