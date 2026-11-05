import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { AdminAvatar } from '../../components/auth/AdminAvatar';

export const AdminPlaceholder: React.FC = () => {
  const { currentUser, logout, setSelectedRole } = useAuth();
  const navigate = useNavigate();

  const handleSwitchToSupporter = () => {
    setSelectedRole('Supporter');
    navigate('/home');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center p-3"
      style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}
    >
      <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center bg-white" style={{ maxWidth: '620px' }}>
        
        <div className="d-flex justify-content-center mb-3">
          <BrandLogo size="md" />
        </div>

        <div className="d-flex justify-content-center my-3">
          <AdminAvatar size={90} />
        </div>

        <span className="badge bg-purple-subtle text-purple px-3 py-1.5 rounded-pill fw-semibold mx-auto mb-2" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
          Developer & Admin Module
        </span>

        <h3 className="fw-bold text-navy mb-2">Welcome, {currentUser?.name || 'Administrator'}</h3>
        <p className="text-secondary small mb-4 lh-base">
          You are authenticated as <strong>{currentUser?.role}</strong> ({currentUser?.employeeId}). The Developer / Admin console (ticket assignment queue, status workflow transitions, and RCA logging) is scheduled for the next development sprint.
        </p>

        <div className="alert alert-info border-0 rounded-3 small text-start p-3 mb-4">
          <div className="fw-bold mb-1">
            <i className="bi bi-info-circle-fill me-1"></i>Current Prototype Scope:
          </div>
          The current development sprint focuses on the <strong>Supporter Role</strong> (Incident Reporting, Shift Management, Personal Ticket Tracking, and 2-way Developer Discussion Threads).
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-primary-action px-4 py-2"
            onClick={handleSwitchToSupporter}
          >
            <i className="bi bi-arrow-left-right me-1.5"></i>
            Switch to Supporter Console
          </button>
          <button
            type="button"
            className="btn btn-outline-danger px-4 py-2 rounded-3"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-1.5"></i>
            Logout
          </button>
        </div>

      </div>
    </div>
  );
};

