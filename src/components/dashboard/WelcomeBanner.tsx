import React from 'react';
import { SSEConnectionState } from '../../hooks/useDashboardSSE';

export interface WelcomeBannerProps {
  userName?: string;
  employeeId?: string;
  roleType?: string;
  isDeveloper?: boolean;
  isConnected?: boolean;
  connectionState?: SSEConnectionState;
  sseError?: string | null;
  subtitle: string;
  onRefresh: () => void;
  onCreateIssue: () => void;
  isRefreshing?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  employeeId,
  roleType,
  isDeveloper = false,
  isConnected = false,
  connectionState,
  sseError,
  subtitle,
  onRefresh,
  onCreateIssue,
  isRefreshing = false
}) => {
  const effectiveState: SSEConnectionState =
    connectionState || (isConnected ? 'connected' : 'reconnecting');

  const statusBadgeMap: Record<
    SSEConnectionState,
    { badgeClass: string; icon: string; label: string; title: string }
  > = {
    connected: {
      badgeClass: 'bg-success-subtle text-success',
      icon: 'bi-broadcast',
      label: 'Real-Time Live',
      title: 'Live dashboard Server-Sent Events (SSE) connected'
    },
    reconnecting: {
      badgeClass: 'bg-warning-subtle text-warning-emphasis',
      icon: 'bi-arrow-repeat',
      label: 'Reconnecting...',
      title: 'Reconnecting to live dashboard SSE stream...'
    },
    error: {
      badgeClass: 'bg-danger-subtle text-danger',
      icon: 'bi-exclamation-circle',
      label: 'Stream Error',
      title: sseError || 'Live dashboard SSE connection interrupted'
    },
    disconnected: {
      badgeClass: 'bg-secondary-subtle text-secondary',
      icon: 'bi-pause-circle',
      label: 'Disconnected',
      title: 'Live dashboard SSE stream disconnected'
    }
  };

  const statusUi = statusBadgeMap[effectiveState];

  return (
    <div className="welcome-card-reference flex-shrink-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        {/* Welcome Identity & Subtitle */}
        <div className="d-flex align-items-center gap-3.5">
          <div className="welcome-icon-box">
            <i className={`bi ${isDeveloper ? 'bi-code-slash' : 'bi-shield-check'}`}></i>
          </div>
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h4 className="fw-bold text-navy mb-0" style={{ fontSize: '1.5rem', letterSpacing: '-0.4px' }}>
                {userName ? `Welcome, ${userName}!` : 'Welcome!'}
              </h4>
              {employeeId && (
                <span
                  className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5"
                  style={{ fontSize: '0.78rem' }}
                >
                  <i className="bi bi-person-badge"></i> {employeeId}
                </span>
              )}
              {roleType && (
                <span
                  className="badge bg-info-subtle text-info-emphasis rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5"
                  style={{ fontSize: '0.78rem' }}
                >
                  <i className="bi bi-diagram-3"></i> {roleType}
                </span>
              )}
              <span
                className={`badge ${statusUi.badgeClass} rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5`}
                style={{ fontSize: '0.78rem' }}
                title={statusUi.title}
              >
                <i className={`bi ${statusUi.icon}`}></i>
                {statusUi.label}
              </span>
            </div>
            <p className="text-secondary mb-0" style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons: Refresh & Report */}
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3 py-2 d-inline-flex align-items-center gap-1.5 rounded-3 shadow-sm"
            onClick={onRefresh}
            title="Refresh KPI metrics from backend API"
            disabled={isRefreshing}
          >
            <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin' : ''}`}></i>
            <span className="d-none d-sm-inline">Refresh KPIs</span>
          </button>

          <button
            type="button"
            className="btn btn-primary px-4 py-2.5 d-inline-flex align-items-center gap-2 rounded-3 shadow-sm fw-semibold"
            style={{ fontSize: '0.95rem', backgroundColor: '#0D6EFD', borderColor: '#0D6EFD' }}
            onClick={onCreateIssue}
          >
            <i className="bi bi-plus-circle-fill fs-5"></i>
            <span>{isDeveloper ? 'Create New Issue' : 'Report Issue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
