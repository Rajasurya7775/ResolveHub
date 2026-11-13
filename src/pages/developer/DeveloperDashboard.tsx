import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { getCurrentShift } from '../../utils/shiftUtils';

export const DeveloperDashboard: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Live timestamp
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shiftInfo = getCurrentShift(currentTime);
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Route protection
  if (!isAuthenticated || !currentUser) {
    navigate('/login');
    return null;
  }

  // Support users cannot access Developer console
  if (currentUser.role === 'Support' || currentUser.role === 'Supporter') {
    navigate('/home');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* Top Navbar */}
      <header className="bg-white border-bottom px-4 py-2.5 d-flex align-items-center justify-content-between shadow-sm flex-shrink-0">
        <div className="d-flex align-items-center gap-3">
          <BrandLogo size="md" />
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill fw-semibold small">
            Developer Workspace
          </span>
        </div>

        {/* Center: Shift, Date & Live Time Widget */}
        <div className="d-none d-md-flex align-items-center gap-2 gap-md-3 px-3 py-1.5 rounded-pill bg-light border border-light-subtle shadow-xs">
          <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fw-semibold d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.78rem' }}>
            <span className="rounded-circle bg-primary" style={{ width: '6px', height: '6px' }}></span>
            <span>{shiftInfo.shift}</span>
          </span>
          <div className="vr text-muted" style={{ height: '14px', opacity: 0.35 }}></div>
          <div className="text-secondary small fw-medium" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-calendar3 text-muted me-1"></i>
            <span className="text-navy">{formattedDate}</span>
          </div>
          <div className="vr text-muted" style={{ height: '14px', opacity: 0.35 }}></div>
          <div className="text-navy font-monospace fw-bold small" style={{ fontSize: '0.82rem' }}>
            <i className="bi bi-clock text-primary me-1"></i>
            <span>{formattedTime}</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}
            >
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="text-start d-none d-sm-block">
              <div className="fw-bold text-navy small lh-1">{currentUser.name || 'Developer'}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                {currentUser.employeeId} &bull; {currentUser.roleType || 'Engineer'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm rounded-3 px-3 d-flex align-items-center gap-1.5"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 p-4 container-xl my-auto">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-8">
            
            {/* Work in Progress Hero Banner */}
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center mb-4 bg-white position-relative overflow-hidden">
              <div
                className="position-absolute top-0 start-0 w-100"
                style={{ height: '4px', background: 'linear-gradient(90deg, #0D6EFD, #6610f2, #0dcaf0)' }}
              />

              <div className="mb-3">
                <div
                  className="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '72px', height: '72px' }}
                >
                  <i className="bi bi-cone-striped fs-1 text-warning"></i>
                </div>
                <div className="d-inline-block d-block mb-1">
                  <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-semibold">
                    MODULE IN PROGRESS
                  </span>
                </div>
                <h2 className="fw-bold text-navy mb-2" style={{ fontSize: '2rem' }}>
                  Developer Console
                </h2>
                <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '520px', fontSize: '0.96rem' }}>
                  The Developer incident resolution and code triage console is currently under active development. You are logged in with verified Developer authorization.
                </p>
              </div>

              {/* Developer Profile Card */}
              <div className="bg-light rounded-3 p-3.5 text-start border mb-4">
                <div className="fw-bold text-navy mb-2.5 d-flex align-items-center gap-2 small">
                  <i className="bi bi-person-badge-fill text-primary"></i>
                  AUTHENTICATED DEVELOPER SESSION
                </div>
                <div className="row g-3">
                  <div className="col-12 col-sm-6 col-md-3">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>DEVELOPER NAME</span>
                    <strong className="text-navy">{currentUser.name}</strong>
                  </div>
                  <div className="col-12 col-sm-6 col-md-3">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>EMPLOYEE ID</span>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis">{currentUser.employeeId}</span>
                  </div>
                  <div className="col-12 col-sm-6 col-md-3">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>ROLE TYPE</span>
                    <span className="badge bg-primary-subtle text-primary">{currentUser.roleType || 'Developer'}</span>
                  </div>
                  <div className="col-12 col-sm-6 col-md-3">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>SYSTEM ROLE</span>
                    <span className="badge bg-success-subtle text-success">{currentUser.role}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>EMAIL ADDRESS</span>
                    <span className="text-navy small">{currentUser.email}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="text-muted d-block small" style={{ fontSize: '0.72rem' }}>ACCOUNT STATUS</span>
                    <span className="badge bg-success-subtle text-success">{currentUser.accountStatus || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Developer Capabilities Preview */}
              <div className="row g-3 text-start">
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 border bg-white h-100">
                    <div className="text-primary mb-2">
                      <i className="bi bi-bug fs-4"></i>
                    </div>
                    <h6 className="fw-bold text-navy mb-1" style={{ fontSize: '0.9rem' }}>Issue Triage Queue</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>
                      Accept assigned production issues, analyze logs, and coordinate fixes with shift supporters.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 border bg-white h-100">
                    <div className="text-success mb-2">
                      <i className="bi bi-file-earmark-diff fs-4"></i>
                    </div>
                    <h6 className="fw-bold text-navy mb-1" style={{ fontSize: '0.9rem' }}>RCA Documentation</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>
                      Publish Root Cause Analysis, resolution notes, and bug hotfix documentation directly to the repository.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 border bg-white h-100">
                    <div className="text-purple mb-2">
                      <i className="bi bi-chat-left-dots fs-4" style={{ color: '#8B5CF6' }}></i>
                    </div>
                    <h6 className="fw-bold text-navy mb-1" style={{ fontSize: '0.9rem' }}>Direct Supporter Chat</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>
                      Real-time discussion threads with shift engineers to verify production errors and reproduction steps.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
export default DeveloperDashboard;

