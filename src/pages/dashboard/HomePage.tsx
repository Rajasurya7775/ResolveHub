import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIssues } from '../../context/IssueContext';
import { HomeInsights } from '../../components/dashboard/HomeInsights';
import { ReportIssueModal } from '../../components/issues/ReportIssueModal';
import { apiFetchDashboardSummary, DashboardSummary } from '../../services/api/dashboardService';

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { issues, refreshIssues } = useIssues();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch live Dashboard Summary KPI metrics from backend API
  // Endpoint: http://10.91.17.113:8000/api/v1/dashboard/summary
  const loadDashboardSummary = useCallback(async () => {
    setSummaryLoading(true);
    const res = await apiFetchDashboardSummary();
    if (res.success && res.data) {
      setSummary(res.data);
    }
    setSummaryLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardSummary();
  }, [loadDashboardSummary]);

  // Filter issues for currently logged-in supporter
  const myIssues = issues.filter(
    (i) => i.reportedById === currentUser?.employeeId || i.reportedBy === currentUser?.name
  );

  // KPI Metrics: Loaded dynamically from backend API summary endpoint
  const totalLogged = summary ? summary.totalLogged : myIssues.length;
  const activeCount = summary
    ? summary.activeCount
    : Math.max(0, myIssues.length - myIssues.filter((i) => i.status === 'Resolved').length);
  const resolvedCount = summary
    ? summary.resolvedCount
    : myIssues.filter((i) => i.status === 'Resolved').length;
  const inProgressCount = summary
    ? summary.inProgressCount
    : myIssues.filter((i) => i.status === 'In Progress').length;
  const openCount = summary
    ? summary.openCount
    : myIssues.filter((i) => i.status === 'Open').length;
  const acceptedCount = summary
    ? summary.acceptedCount
    : myIssues.filter((i) => i.status === 'Accepted').length;

  const handleIssueCreated = (issueId: string) => {
    setIsReportModalOpen(false);
    setSuccessToast(`Issue ${issueId} reported successfully!`);
    loadDashboardSummary();
    refreshIssues();
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ gap: '1rem' }}>
      
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

      {/* ================= 1. ENLARGED TOP SECTION: WELCOME CARD & REPORT ISSUE BUTTON ================= */}
      <div className="welcome-card-reference flex-shrink-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          
          {/* Welcome Message with logged-in supporter's real identity */}
          <div className="d-flex align-items-center gap-3.5">
            <div className="welcome-icon-box">
              <i className="bi bi-laptop"></i>
            </div>
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h4 className="fw-bold text-navy mb-0" style={{ fontSize: '1.5rem', letterSpacing: '-0.4px' }}>
                  Welcome, {currentUser?.name || 'Supporter'}!
                </h4>
                {currentUser?.employeeId && (
                  <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-person-badge"></i> {currentUser.employeeId}
                  </span>
                )}
                <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1.5" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-check-circle-fill"></i> Active Session
                </span>
              </div>
              <p className="text-secondary mb-0" style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                Supporter Incident Console — Track technical issues, monitor developer triage, and coordinate resolution across production lines.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 py-2 d-inline-flex align-items-center gap-1.5 rounded-3 shadow-sm"
              onClick={loadDashboardSummary}
              title="Refresh KPI metrics from backend API"
              disabled={summaryLoading}
            >
              <i className={`bi bi-arrow-clockwise ${summaryLoading ? 'spin' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh KPIs</span>
            </button>

            <button
              type="button"
              className="btn btn-primary px-4 py-2.5 d-inline-flex align-items-center gap-2 rounded-3 shadow-sm fw-semibold"
              style={{ fontSize: '0.95rem', backgroundColor: '#0D6EFD', borderColor: '#0D6EFD' }}
              onClick={() => setIsReportModalOpen(true)}
            >
              <i className="bi bi-plus-circle-fill fs-5"></i>
              <span>Report Issue</span>
            </button>
          </div>

        </div>
      </div>

      {/* ================= 2. KPIS DISPLAYED BELOW WELCOME SECTION (ICON ON LEFT) ================= */}
      <div className="row g-3 flex-shrink-0">
        
        {/* KPI 1: Total Logged */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(13, 110, 253, 0.1)', color: '#0D6EFD' }}>
              <i className="bi bi-stack"></i>
            </div>
            <div>
              <span className="text-muted fw-semibold d-block text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                Total Logged Issues
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                {totalLogged}
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                {summary ? 'Live backend API' : 'Logged issues'}
              </small>
            </div>
          </div>
        </div>

        {/* KPI 2: Active / Resolved */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <i className="bi bi-check-circle"></i>
            </div>
            <div>
              <span className="text-muted fw-semibold d-block text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                Active / Resolved
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                <span className="text-primary">{activeCount}</span>
                <span className="text-muted fs-6 fw-normal mx-1">/</span>
                <span className="text-success">{resolvedCount}</span>
              </h4>
              <small className="text-success" style={{ fontSize: '0.72rem' }}>{resolvedCount} closed</small>
            </div>
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div className="kpi-icon-badge" style={{ backgroundColor: '#F3E8FF', color: '#8B5CF6' }}>
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div>
              <span className="text-muted fw-semibold d-block text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                In-Progress Issues
              </span>
              <h4 className="fw-bold mb-0 mt-0.5" style={{ fontSize: '1.5rem', color: '#8B5CF6', letterSpacing: '-0.3px' }}>
                {inProgressCount}
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>Developer triage</small>
            </div>
          </div>
        </div>

        {/* KPI 4: Open / Triage */}
        <div className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div className="kpi-icon-badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <i className="bi bi-ticket-perforated"></i>
            </div>
            <div>
              <span className="text-muted fw-semibold d-block text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                Open / Pending Triage
              </span>
              <h4 className="fw-bold text-navy mb-0 mt-0.5" style={{ fontSize: '1.5rem', letterSpacing: '-0.3px' }}>
                <span className="text-warning">{openCount}</span>
                <span className="text-muted fs-6 fw-normal ms-1">({acceptedCount} Acc.)</span>
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>Queue allocation</small>
            </div>
          </div>
        </div>

      </div>

      {/* ================= 3. TWO GRAPHS ONLY: LINE CHART & HISTOGRAM (STRICTLY NON-SCROLLABLE) ================= */}
      <div className="flex-grow-1 min-h-0 overflow-hidden d-flex flex-column">
        <HomeInsights />
      </div>

      {/* Report Issue Modal Popup */}
      {isReportModalOpen && (
        <ReportIssueModal
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={handleIssueCreated}
        />
      )}

    </div>
  );
};
