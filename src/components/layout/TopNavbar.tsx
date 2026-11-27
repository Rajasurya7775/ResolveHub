import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { getCurrentShift } from '../../utils/shiftUtils';

interface TopNavbarProps {
  pageTitle: string;
  onToggleSidebar?: () => void;
}

const getShiftTiming = (shiftName?: string): string => {
  if (!shiftName) return '6:15 AM – 2:15 PM';
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

  // 2. Current Date (Formatted e.g. "Wed, Nov 18, 2026")
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // 3. Current Time (Live updating with seconds e.g. "11:43:55 AM")
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Shift badge styling helper matching approved reference
  const getShiftBadgeStyles = (shiftName?: string) => {
    if (!shiftName || shiftName.includes('B')) {
      return {
        bg: '#fff7ed',
        border: '#fed7aa',
        text: '#c2410c',
        dot: '#ea580c'
      };
    }
    if (shiftName.includes('A')) {
      return {
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1d4ed8',
        dot: '#2563eb'
      };
    }
    return {
      bg: '#f0fdfa',
      border: '#ccfbf1',
      text: '#0f766e',
      dot: '#0d9488'
    };
  };

  const shiftStyles = getShiftBadgeStyles(shiftInfo.shift);

  return (
    <header className="app-topbar d-flex align-items-center justify-content-between px-3 px-lg-4 bg-white">
      
      {/* ================= LEFT: Mobile Hamburger & Page Title ================= */}
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-light d-lg-none border-0 p-1 text-secondary rounded-2"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <i className="bi bi-list fs-5"></i>
          </button>
        )}
        <h4 className="fw-bold text-navy mb-0 fs-5 text-truncate" style={{ maxWidth: '220px' }}>
          {pageTitle}
        </h4>
      </div>

      {/* ================= CENTER: Shift, Date & Live Time Widget (Matching Reference UI) ================= */}
      <div
        className="d-flex align-items-center gap-2.5 gap-md-3 px-3 py-1.5 rounded-pill bg-white border shadow-2xs"
        style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        {/* 1. Current Shift Capsule & Shift Timing */}
        <div className="d-flex align-items-center gap-2">
          <span
            className="badge rounded-pill px-2.5 py-1 fw-bold d-inline-flex align-items-center gap-1.5"
            style={{
              backgroundColor: shiftStyles.bg,
              color: shiftStyles.text,
              border: `1px solid ${shiftStyles.border}`,
              fontSize: '0.8rem'
            }}
          >
            <span
              className="rounded-circle"
              style={{ width: '8px', height: '8px', backgroundColor: shiftStyles.dot }}
            ></span>
            <span>{shiftInfo.shift}</span>
          </span>

          <span
            className="fw-medium small"
            style={{ fontSize: '0.82rem', color: '#334155' }}
          >
            ({shiftTiming})
          </span>
        </div>

        {/* 2. Current Date */}
        <div
          className="d-none d-sm-flex align-items-center gap-1.5 fw-bold"
          style={{ fontSize: '0.84rem', color: '#1e293b' }}
        >
          <i className="bi bi-calendar3 fs-6" style={{ color: '#1e3a8a' }}></i>
          <span>{formattedDate}</span>
        </div>

        {/* 3. Live Time */}
        <div
          className="d-flex align-items-center gap-1.5 fw-bold"
          style={{ fontSize: '0.84rem', color: '#0f172a' }}
          title="Live System Time"
        >
          <i className="bi bi-clock fs-6" style={{ color: '#2563eb' }}></i>
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* ================= RIGHT: Notifications & User Profile ================= */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        
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
            {currentUser?.name?.charAt(0).toUpperCase() || '—'}
          </div>
          <div className="d-none d-sm-block text-start lh-1">
            <div className="fw-bold text-navy" style={{ fontSize: '0.86rem' }}>
              {currentUser?.name || '—'}
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
