import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface TopNavbarProps {
  pageTitle: string;
  onToggleSidebar?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ pageTitle, onToggleSidebar }) => {
  const { currentUser } = useAuth();

  return (
    <header className="app-topbar d-flex align-items-center justify-content-between px-3 px-lg-4 bg-white">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="d-flex align-items-center gap-2.5">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-light d-lg-none border-0 p-1 text-secondary"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <i className="bi bi-list fs-5"></i>
          </button>
        )}
        <h4 className="fw-bold text-navy mb-0 fs-5">{pageTitle}</h4>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="d-flex align-items-center gap-3">
        
        {/* Notification Icon with Red Dot */}
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light rounded-circle p-2 text-secondary position-relative border-0"
            title="System Notifications"
            onClick={() => alert('All systems operational. No unread critical alerts.')}
          >
            <i className="bi bi-bell fs-5"></i>
            <span
              className="position-absolute top-1 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
              style={{ width: '8px', height: '8px' }}
            >
              <span className="visually-hidden">New alerts</span>
            </span>
          </button>
        </div>

        {/* User Profile Pill matching screenshot */}
        <Link
          to="/profile"
          className="d-flex align-items-center gap-2 text-decoration-none text-navy"
        >
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}
          >
            {currentUser?.name?.charAt(0) || 'S'}
          </div>
          <div className="d-none d-sm-block text-start lh-1">
            <div className="fw-bold text-navy" style={{ fontSize: '0.86rem' }}>
              {currentUser?.name || 'Surya'}
            </div>
            <div className="text-muted mt-0.5" style={{ fontSize: '0.72rem' }}>
              {currentUser?.employeeId || 'EMP101'}
            </div>
          </div>
          <i className="bi bi-chevron-down text-muted small ms-0.5"></i>
        </Link>
      </div>
    </header>
  );
};
