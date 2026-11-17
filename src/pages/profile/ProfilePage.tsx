import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Optionally ensure latest profile data on mount
  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    updateProfile({
      name: name.trim(),
      email: email.trim()
    });

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Safe data extraction mapped to the 6 allowed fields
  const fullName = currentUser?.name || (currentUser as any)?.full_name || '—';
  const userEmail = currentUser?.email || '—';
  const employeeId = currentUser?.employeeId || (currentUser as any)?.employee_id || '—';
  const userId = currentUser?.id || (currentUser as any)?.user_id || '—';
  const role = currentUser?.role || 'Developer';
  const rawStatus = currentUser?.accountStatus || (currentUser as any)?.account_status || 'ACTIVE';
  const accountStatus = String(rawStatus).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : String(rawStatus);

  const isDev = String(role).toLowerCase().includes('dev');
  const initial = fullName && fullName !== '—' ? fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="profile-page-wrapper d-flex flex-column gap-3 pb-4">
      {/* Top Header & Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-1">
        <div>
          <h4 className="fw-bold text-navy mb-0" style={{ letterSpacing: '-0.3px' }}>
            {isDev ? 'Developer Profile' : 'Support Profile'}
          </h4>
          <p className="text-secondary small mb-0 mt-0.5">
            Personal account and operational shift identity
          </p>
        </div>
        <div className="d-flex align-items-center gap-1.5 text-secondary small">
          <i className="bi bi-house"></i>
          <span>/</span>
          <span className="text-navy fw-medium">Profile</span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="alert alert-success py-2 px-3 rounded-3 small d-flex align-items-center shadow-sm mb-0">
          <i className="bi bi-check-circle-fill me-2 fs-5 text-success"></i>
          <span className="fw-semibold">Profile details updated successfully!</span>
        </div>
      )}

      {/* Profile Hero Banner */}
      <div className="profile-hero-banner text-white">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 position-relative" style={{ zIndex: 1 }}>
          {/* Left Avatar & Identity */}
          <div className="d-flex align-items-center gap-3 gap-md-4">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-circle">
                {initial}
              </div>
              <div 
                className="profile-avatar-camera-btn" 
                title="Profile photo"
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-camera"></i>
              </div>
            </div>

            <div>
              {/* Name & Badges */}
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1.5">
                <h3 className="fw-bold text-white mb-0 me-1" style={{ fontSize: '1.65rem', letterSpacing: '-0.4px' }}>
                  {fullName}
                </h3>
                <span 
                  className="badge rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
                  style={{ backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '0.8rem' }}
                >
                  <i className={isDev ? "bi bi-code-slash" : "bi bi-headset"}></i>
                  {role}
                </span>
                <span 
                  className="badge rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5"
                  style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.8rem' }}
                >
                  <span 
                    style={{ 
                      width: '7px', 
                      height: '7px', 
                      borderRadius: '50%', 
                      backgroundColor: '#16a34a', 
                      display: 'inline-block' 
                    }}
                  ></span>
                  {accountStatus}
                </span>
              </div>

              {/* Meta Row: Email | Employee ID | User ID */}
              <div className="d-flex flex-wrap align-items-center text-white-50 small mt-1" style={{ fontSize: '0.86rem' }}>
                <span className="d-inline-flex align-items-center text-white text-opacity-75">
                  <i className="bi bi-envelope me-1.5 text-white-50"></i>
                  {userEmail}
                </span>
                <span className="profile-meta-sep">|</span>
                <span className="d-inline-flex align-items-center text-white text-opacity-75">
                  <i className="bi bi-person-vcard me-1.5 text-white-50"></i>
                  {employeeId}
                </span>
                <span className="profile-meta-sep">|</span>
                <span className="d-inline-flex align-items-center text-white text-opacity-75">
                  <i className="bi bi-person me-1.5 text-white-50"></i>
                  User ID: {userId}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action: Edit Profile */}
          <button
            type="button"
            className="btn btn-light rounded-pill px-3.5 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm border-0"
            style={{ color: '#1d4ed8', fontSize: '0.88rem' }}
            onClick={() => setIsEditing(true)}
          >
            <i className="bi bi-pencil-square"></i>
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="row g-3">
        {/* User ID */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="profile-stat-card">
            <div className="profile-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <i className="bi bi-people fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small fw-medium">User ID</div>
              <div className="fw-bold text-navy fs-5 mt-0.5">{userId}</div>
            </div>
          </div>
        </div>

        {/* Employee ID */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="profile-stat-card">
            <div className="profile-stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
              <i className="bi bi-person-vcard fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small fw-medium">Employee ID</div>
              <div className="fw-bold text-navy fs-5 mt-0.5">{employeeId}</div>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="profile-stat-card">
            <div className="profile-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <i className="bi bi-person fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small fw-medium">Role</div>
              <div className="fw-bold text-navy fs-5 mt-0.5">{role}</div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="profile-stat-card">
            <div className="profile-stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <i className="bi bi-check-circle fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small fw-medium">Account Status</div>
              <div className="fw-bold text-success fs-5 mt-0.5">{accountStatus}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Section: Account Information & Profile Summary */}
      <div className="row g-3">
        {/* Left Column: Account Information */}
        <div className="col-12 col-lg-7">
          <div className="profile-card-section">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <i className="bi bi-info-circle text-primary fs-5"></i>
              <h5 className="fw-bold text-navy mb-0 fs-6">Account Information</h5>
            </div>

            <div className="d-flex flex-column">
              {/* Full Name */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-person text-secondary me-2.5 fs-6"></i>
                  <span>Full Name</span>
                </div>
                <div className="profile-info-value">{fullName}</div>
              </div>

              {/* Email */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-envelope text-secondary me-2.5 fs-6"></i>
                  <span>Email</span>
                </div>
                <div className="profile-info-value">{userEmail}</div>
              </div>

              {/* Employee ID */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-person-vcard text-secondary me-2.5 fs-6"></i>
                  <span>Employee ID</span>
                </div>
                <div className="profile-info-value">{employeeId}</div>
              </div>

              {/* User ID */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-hash text-secondary me-2.5 fs-6"></i>
                  <span>User ID</span>
                </div>
                <div className="profile-info-value">{userId}</div>
              </div>

              {/* Role */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-people text-secondary me-2.5 fs-6"></i>
                  <span>Role</span>
                </div>
                <div>
                  <span 
                    className="badge rounded-pill px-2.5 py-1 fw-semibold d-inline-flex align-items-center gap-1.5"
                    style={{ backgroundColor: '#e0edff', color: '#2563eb', fontSize: '0.8rem' }}
                  >
                    <i className={isDev ? "bi bi-code-slash" : "bi bi-headset"}></i>
                    {role}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-shield-check text-secondary me-2.5 fs-6"></i>
                  <span>Account Status</span>
                </div>
                <div>
                  <span 
                    className="badge rounded-pill px-2.5 py-1 fw-bold d-inline-flex align-items-center gap-1.5"
                    style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.8rem' }}
                  >
                    <span 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#16a34a', 
                        display: 'inline-block' 
                      }}
                    ></span>
                    {accountStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Summary */}
        <div className="col-12 col-lg-5">
          <div className="profile-card-section">
            <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
              <i className="bi bi-person text-primary fs-5"></i>
              <h5 className="fw-bold text-navy mb-0 fs-6">Profile Summary</h5>
            </div>

            {/* Account Type Callout */}
            <div className="profile-summary-callout">
              <div className="profile-summary-callout-icon">
                <i className={isDev ? "bi bi-code-slash" : "bi bi-headset"}></i>
              </div>
              <div>
                <div className="fw-bold text-navy mb-1" style={{ fontSize: '0.94rem' }}>
                  {isDev ? 'Developer Account' : 'Support Account'}
                </div>
                <div className="text-secondary small" style={{ lineHeight: '1.45' }}>
                  {isDev 
                    ? 'An active developer account in ResolveHub with access to development and issue management features.'
                    : 'An active support account in ResolveHub with access to issue resolution and tracking features.'}
                </div>
              </div>
            </div>

            {/* Summary Key-Value Rows */}
            <div className="d-flex flex-column">
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-person text-secondary me-2 fs-6"></i>
                  <span>User ID</span>
                </div>
                <div className="profile-info-value">{userId}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-person-vcard text-secondary me-2 fs-6"></i>
                  <span>Employee ID</span>
                </div>
                <div className="profile-info-value">{employeeId}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-layers text-secondary me-2 fs-6"></i>
                  <span>Role</span>
                </div>
                <div className="profile-info-value">{role}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <i className="bi bi-check-circle text-secondary me-2 fs-6"></i>
                  <span>Status</span>
                </div>
                <div>
                  <span 
                    className="badge rounded-pill px-2.5 py-1 fw-bold"
                    style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.8rem' }}
                  >
                    {accountStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header border-bottom py-3 px-4 bg-light">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '34px', height: '34px', backgroundColor: '#e0edff', color: '#2563eb' }}
                  >
                    <i className="bi bi-pencil-square"></i>
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold text-navy mb-0">Edit Profile</h6>
                    <small className="text-secondary">Update your personal account credentials</small>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close" 
                  aria-label="Close" 
                  onClick={() => setIsEditing(false)}
                ></button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-navy mb-1">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-navy mb-1">
                        Corporate Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Employee ID <span className="text-secondary">(Locked)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={employeeId}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        User ID <span className="text-secondary">(Locked)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={userId}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Role <span className="text-secondary">(Locked)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={role}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Account Status <span className="text-secondary">(Locked)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={accountStatus}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light px-4 py-3 border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-pill px-3.5"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-sm btn-primary rounded-pill px-4 fw-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
