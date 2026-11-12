import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentShift } from '../../utils/shiftUtils';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const currentShift = getCurrentShift();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim()
    });

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ maxWidth: '850px' }}>
      
      {/* Title */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
        <div>
          <h5 className="fw-bold text-navy mb-0">Supporter Profile</h5>
          <small className="text-secondary">Personal account and operational shift identity</small>
        </div>

        {!isEditing && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1"
            onClick={() => setIsEditing(true)}
          >
            <i className="bi bi-pencil-square me-1.5"></i>Edit Profile
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="alert alert-success py-1.5 px-3 rounded-3 small d-flex align-items-center mb-3 flex-shrink-0">
          <i className="bi bi-check-circle-fill me-2 fs-6"></i>
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Main Profile Card: Fits inside fixed height */}
      <div className="bg-white rounded-3 border border-light-subtle shadow-sm p-3.5 flex-grow-1 overflow-y-auto">
        
        {/* User Identity Banner */}
        <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom">
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: '54px', height: '54px', fontSize: '1.4rem' }}
          >
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h5 className="fw-bold text-navy mb-1 fs-6">{currentUser?.name}</h5>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-primary px-2.5 py-0.5 rounded-pill small">
                {currentUser?.role}
              </span>
              {currentUser?.roleType && (
                <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2.5 py-0.5 rounded-pill small">
                  <i className="bi bi-diagram-3 me-1"></i>
                  {currentUser.roleType}
                </span>
              )}
              <span className="badge bg-light text-secondary border px-2 py-0.5 rounded-pill small">
                {currentUser?.employeeId}
              </span>
              <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded-pill small">
                <i className="bi bi-circle-fill me-1" style={{ fontSize: '6px' }}></i>
                {currentUser?.accountStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Form / Details View */}
        {isEditing ? (
          <form onSubmit={handleSave}>
            <div className="row g-3">
              
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-navy mb-1">Full Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted mb-1">
                  Employee ID <span className="text-secondary">(Locked)</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light"
                  value={currentUser?.employeeId}
                  disabled
                  readOnly
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-navy mb-1">Email Address</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-navy mb-1">Phone Number</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted mb-1">
                  Role <span className="text-secondary">(Locked)</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light"
                  value={currentUser?.role}
                  disabled
                  readOnly
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted mb-1">Account Status</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light"
                  value={currentUser?.accountStatus}
                  disabled
                  readOnly
                />
              </div>

            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-sm btn-light border px-3"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-primary px-3">
                Save Profile
              </button>
            </div>
          </form>
        ) : (
          <div className="row g-3">
            
            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Full Name</div>
              <div className="fw-semibold text-navy small">{currentUser?.name}</div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Employee ID</div>
              <div className="fw-semibold text-navy small">{currentUser?.employeeId}</div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Corporate Email</div>
              <div className="fw-semibold text-navy small">{currentUser?.email}</div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Phone Number</div>
              <div className="fw-semibold text-navy small">{currentUser?.phone || 'Not configured'}</div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Assigned Role</div>
              <div className="fw-semibold text-navy small">{currentUser?.role}</div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Active Shift</div>
              <div className="fw-semibold text-navy small">
                {currentShift.shift}
              </div>
            </div>

            <div className="col-12 col-sm-6">
              <div className="text-muted small mb-0.5" style={{ fontSize: '0.74rem' }}>Account Status</div>
              <div>
                <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded-pill small">
                  {currentUser?.accountStatus}
                </span>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
