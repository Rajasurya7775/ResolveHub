import React from 'react';

export interface WelcomeBannerProps {
  userName?: string;
  employeeId?: string;
  roleType?: string;
  isDeveloper?: boolean;
  isConnected?: boolean;
  subtitle: string;
  onRefresh: () => void;
  onCreateIssue: () => void;
  isRefreshing?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName = 'User',
  employeeId,
  roleType,
  isDeveloper = false,
  isConnected = false,
  subtitle,
  onRefresh,
  onCreateIssue,
  isRefreshing = false
}) => {
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
                Welcome, {userName}!
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
                className={`badge ${
                  isConnected ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'
                } rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5`}
                style={{ fontSize: '0.78rem' }}
                title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time updates...'}
              >
                <i className={`bi ${isConnected ? 'bi-broadcast' : 'bi-arrow-repeat'}`}></i>
                {isConnected ? 'Real-Time Live' : 'Connecting...'}
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
