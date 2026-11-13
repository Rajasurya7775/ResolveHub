import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { getCurrentShift } from '../../utils/shiftUtils';

interface TopNavbarProps {
  pageTitle: string;
  onToggleSidebar?: () => void;
}

const getShiftTiming = (shiftName: string): string => {
  if (shiftName.includes('A')) return '6:15 AM – 2:15 PM';
  if (shiftName.includes('B')) return '2:15 PM – 10:15 PM';
  return '10:15 PM – 6:15 AM';
};

export const TopNavbar: React.FC<TopNavbarProps> = ({ pageTitle, onToggleSidebar }) => {
  const { currentUser } = useAuth();

  // Live timestamp updating every second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Current Shift (Auto-detected from system time)
  const shiftInfo = getCurrentShift(currentTime);
  const shiftTiming = getShiftTiming(shiftInfo.shift);

  // 2. Current Date (Formatted e.g. "Fri, 13 Nov 2026")
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // 3. Current Time (Live updating with seconds e.g. "12:45:10 PM")
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="app-topbar d-flex align-items-center justify-content-between px-3 px-lg-4 bg-white">
      
      {/* ================= LEFT: Mobile Hamburger & Page Title ================= */}
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

      {/* ================= CENTER: Shift, Date & Live Time Widget ================= */}
      <div className="d-flex align-items-center gap-2 gap-md-3 px-3 py-1.5 rounded-pill bg-light border border-light-subtle shadow-xs">
        
        {/* 1. Current Shift Badge */}
        <div
          className="d-flex align-items-center gap-1.5"
          title={`Operational Shift: ${shiftInfo.shift} (${shiftTiming})`}
        >
          <span
            className={`badge rounded-pill px-2.5 py-1 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              shiftInfo.shift === 'Shift A'
                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                : shiftInfo.shift === 'Shift B'
                ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                : 'bg-info-subtle text-info-emphasis border border-info-subtle'
            }`}
            style={{ fontSize: '0.78rem' }}
          >
            <span
              className="rounded-circle bg-current"
              style={{ width: '6px', height: '6px', backgroundColor: 'currentColor' }}
            ></span>
            <span>{shiftInfo.shift}</span>
          </span>

          <span className="text-secondary small d-none d-xl-inline" style={{ fontSize: '0.73rem' }}>
            ({shiftTiming})
          </span>
        </div>

        <div className="vr text-muted d-none d-sm-block" style={{ height: '14px', opacity: 0.35 }}></div>

        {/* 2. Current Date */}
        <div className="d-none d-sm-flex align-items-center gap-1.5 text-secondary small" style={{ fontSize: '0.8rem' }}>
          <i className="bi bi-calendar3 text-muted"></i>
          <span className="fw-medium text-navy">{formattedDate}</span>
        </div>

        <div className="vr text-muted" style={{ height: '14px', opacity: 0.35 }}></div>

        {/* 3. Live Time */}
        <div
          className="d-flex align-items-center gap-1.5 text-navy font-monospace fw-bold small"
          style={{ fontSize: '0.82rem' }}
          title="Live System Time"
        >
          <i className="bi bi-clock text-primary"></i>
          <span>{formattedTime}</span>
        </div>

      </div>

      {/* ================= RIGHT: Notifications & User Profile ================= */}
      <div className="d-flex align-items-center gap-2 gap-sm-3">
        
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

        {/* User Profile Pill */}
        <Link
          to="/profile"
          className="d-flex align-items-center gap-2 text-decoration-none text-navy"
        >
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}
          >
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="d-none d-sm-block text-start lh-1">
            <div className="fw-bold text-navy" style={{ fontSize: '0.86rem' }}>
              {currentUser?.name || 'User'}
            </div>
            <div className="text-muted mt-0.5" style={{ fontSize: '0.72rem' }}>
              {currentUser?.employeeId || ''}
            </div>
          </div>
          <i className="bi bi-chevron-down text-muted small ms-0.5"></i>
        </Link>

      </div>
    </header>
  );
};
