import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportIssueModal } from '../../components/issues/ReportIssueModal';
import { HomeInsights } from '../../components/dashboard/HomeInsights';
import {
  apiFetchDeveloperSummary,
  DeveloperDashboardSummary
} from '../../services/api/dashboardService';
import { useDashboardWebSocket } from '../../hooks/useDashboardWebSocket';

export const DeveloperDashboard: React.FC = () => {
  const { currentUser, refreshProfile } = useAuth();

  const [summary, setSummary] = useState<DeveloperDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // 1. Fetch Developer KPI Summary from Backend API (GET /api/v1/dashboard/summary)
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    const res = await apiFetchDeveloperSummary();
    if (res.success && res.data) {
      setSummary(res.data);
    } else {
      setSummaryError(res.message || null);
    }
    setSummaryLoading(false);
  }, []);

  // Real-time WebSocket integration: automatically refreshes KPIs and charts on dashboard_updated
  const handleRealtimeDashboardUpdate = useCallback((eventPayload?: any) => {
    console.log('[DeveloperDashboard] Real-time dashboard update received:', eventPayload);
    loadSummary();
    setRefreshKey((prev) => prev + 1);
  }, [loadSummary]);

  const { isConnected } = useDashboardWebSocket(handleRealtimeDashboardUpdate);

  // Fetch initial profile & dashboard summary once on mount
  useEffect(() => {
    refreshProfile();
    loadSummary();
  }, [refreshProfile, loadSummary]);

  // Final KPI values directly from backend API summary endpoint
  const totalIssuesCount = summary != null ? summary.totalIssues : 0;
  const assignedIssuesCount = summary != null ? summary.assignedIssues : 0;
  const inProgressCount = summary != null ? summary.inProgressCount : 0;
  const pendingCount = summary != null ? summary.pendingCount : 0;

  const handleIssueCreated = (issueId: string) => {
    setIsReportModalOpen(false);
    setSuccessToast(`Incident ticket ${issueId} created successfully!`);
    loadSummary();
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="d-flex flex-column h-100 min-h-0" style={{ gap: '0.85rem' }}>
      
      {/* Floating Toast Alert */}
      {successToast && (
        <div
          className="alert alert-success py-2 px-3.5 rounded-3 shadow-sm small d-flex align-items-center justify-content-between position-fixed top-0 start-50 translate-middle-x mt-3"
          style={{ zIndex: 1060, minWidth: '320px', maxWidth: '90vw' }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <span className="fw-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-close-sm ms-2"
            onClick={() => setSuccessToast(null)}
          />
        </div>
      )}

      {/* ================= 1. WELCOME SECTION (MATCHING SUPPORTER HOME DASHBOARD) ================= */}
      <div className="welcome-card-reference flex-shrink-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          
          {/* Welcome Message with logged-in developer's identity */}
          <div className="d-flex align-items-center gap-3.5">
            <div className="welcome-icon-box">
              <i className="bi bi-code-slash"></i>
            </div>
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h4 className="fw-bold text-navy mb-0" style={{ fontSize: '1.5rem', letterSpacing: '-0.4px' }}>
                  Welcome, {currentUser?.name || 'Developer'}!
                </h4>
                {currentUser?.employeeId && (
                  <span
                    className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <i className="bi bi-person-badge"></i> {currentUser.employeeId}
                  </span>
                )}
                {currentUser?.roleType && (
                  <span
                    className="badge bg-info-subtle text-info-emphasis rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <i className="bi bi-diagram-3"></i> {currentUser.roleType}
                  </span>
                )}
                <span
                  className={`badge ${isConnected ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5`}
                  style={{ fontSize: '0.78rem' }}
                  title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time updates...'}
                >
                  <i className={`bi ${isConnected ? 'bi-broadcast' : 'bi-arrow-repeat'}`}></i>
                  {isConnected ? 'Real-Time Live' : 'Connecting...'}
                </span>
              </div>
              <p className="text-secondary mb-0" style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                Developer Workspace — Manage assigned issues, track progress, and resolve technical issues efficiently.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 py-2 d-inline-flex align-items-center gap-1.5 rounded-3 shadow-sm"
              onClick={loadSummary}
              title="Refresh KPI metrics from backend API"
              disabled={summaryLoading}
            >
              <i className={`bi bi-arrow-clockwise ${summaryLoading ? 'spinner-border spinner-border-sm' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh KPIs</span>
            </button>

            <button
              type="button"
              className="btn btn-primary px-4 py-2.5 d-inline-flex align-items-center gap-2 rounded-3 shadow-sm fw-semibold"
              style={{ fontSize: '0.95rem', backgroundColor: '#0D6EFD', borderColor: '#0D6EFD' }}
              onClick={() => setIsReportModalOpen(true)}
            >
              <i className="bi bi-plus-circle-fill fs-5"></i>
              <span>Create New Issue</span>
            </button>
          </div>

        </div>
      </div>

      {/* Backend Notice if API is down */}
      {summaryError && (
        <div className="alert alert-warning py-1.5 px-3 small rounded-3 d-flex align-items-center justify-content-between mb-0 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-warning fs-6"></i>
            <span>{summaryError} (Displaying live ticket metrics)</span>
          </div>
          <button className="btn btn-sm btn-outline-dark py-0 px-2" onClick={loadSummary}>
            Retry API
          </button>
        </div>
      )}

      {/* ================= 2. FOUR DEVELOPER KPI CARDS IN ONE ROW ================= */}
      <div className="row g-3 flex-shrink-0">
        
        {/* Card 1 – Total Issues */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div
              className="kpi-icon-badge"
              style={{ backgroundColor: 'rgba(13, 110, 253, 0.1)', color: '#0D6EFD' }}
            >
              <i className="bi bi-stack"></i>
            </div>
            <div>
              <span
                className="text-muted fw-semibold d-block text-uppercase"
                style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
              >
                Total Issues
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                {totalIssuesCount}
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Total issues
              </small>
            </div>
          </div>
        </div>

        {/* Card 2 – Assigned Issues */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div
              className="kpi-icon-badge"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
            >
              <i className="bi bi-person-check"></i>
            </div>
            <div>
              <span
                className="text-muted fw-semibold d-block text-uppercase"
                style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
              >
                Assigned Issues
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                <span className="text-success">{assignedIssuesCount}</span>
              </h4>
              <small className="text-success" style={{ fontSize: '0.72rem' }}>
                Assigned to me
              </small>
            </div>
          </div>
        </div>

        {/* Card 3 – In Progress */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div
              className="kpi-icon-badge"
              style={{ backgroundColor: '#F3E8FF', color: '#8B5CF6' }}
            >
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div>
              <span
                className="text-muted fw-semibold d-block text-uppercase"
                style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
              >
                In Progress
              </span>
              <h4 className="fw-bold mb-0 mt-0.5" style={{ fontSize: '1.5rem', color: '#8B5CF6', letterSpacing: '-0.3px' }}>
                {inProgressCount}
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Currently working
              </small>
            </div>
          </div>
        </div>

        {/* Card 4 – Pending Issues */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div
              className="kpi-icon-badge"
              style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
            >
              <i className="bi bi-pause-circle"></i>
            </div>
            <div>
              <span
                className="text-muted fw-semibold d-block text-uppercase"
                style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
              >
                Pending Issues
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                <span className="text-warning">{pendingCount}</span>
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Awaiting action
              </small>
            </div>
          </div>
        </div>

      </div>

      {/* ================= 3. GRAPHS & ANALYTICS (EXACT MATCH WITH SUPPORTER DASHBOARD) ================= */}
      <div className="flex-grow-1 min-h-0 d-flex flex-column" style={{ minHeight: '280px' }}>
        <HomeInsights
          role="Developer"
          refreshTrigger={refreshKey}
        />
      </div>

      {/* Create New Issue Modal Popup */}
      {isReportModalOpen && (
        <ReportIssueModal
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={handleIssueCreated}
        />
      )}

    </div>
  );
};

export default DeveloperDashboard;
