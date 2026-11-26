import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoleConfig, resolveRoleKey } from '../../config/roleConfig';
import { WelcomeBanner } from '../../components/dashboard/WelcomeBanner';
import { KpiCardsGrid, KpiCardData } from '../../components/dashboard/KpiCardsGrid';
import { HomeInsights } from '../../components/dashboard/HomeInsights';
import { ReportIssueModal } from '../../components/issues/ReportIssueModal';
import { useDashboardSSE } from '../../hooks/useDashboardSSE';
import {
  apiFetchSupportDashboardSummary,
  apiFetchDeveloperDashboardSummary,
  DashboardSummary,
  DeveloperDashboardSummary
} from '../../services/api/dashboardService';

export interface DashboardPageProps {
  role?: 'Support' | 'Developer';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ role }) => {
  const { currentUser } = useAuth();
  const effectiveRole = role || resolveRoleKey(currentUser?.role);
  const isDeveloper = effectiveRole === 'Developer';
  const roleConfig = getRoleConfig(effectiveRole);

  const [summaryData, setSummaryData] = useState<DashboardSummary | DeveloperDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Summary KPIs from Backend API
  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      if (isDeveloper) {
        const res = await apiFetchDeveloperDashboardSummary();
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setApiError(res.message || 'Failed to fetch Developer summary');
        }
      } else {
        const res = await apiFetchSupportDashboardSummary();
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setApiError(res.message || 'Failed to fetch Support summary');
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'Network error fetching KPIs');
    } finally {
      setIsLoading(false);
    }
  }, [isDeveloper]);

  // Initial fetch on mount / role change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // 2. Real-Time SSE Listener (Server-Sent Events)
  const handleDashboardUpdate = useCallback(() => {
    loadSummary();
    setRefreshKey((prev) => prev + 1);
  }, [loadSummary]);

  const { isConnected } = useDashboardSSE(handleDashboardUpdate);

  const handleIssueCreated = () => {
    setIsReportModalOpen(false);
    setSuccessToast('New issue submitted successfully! Refreshing dashboard metrics...');
    loadSummary();
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Build the 4 KPI cards matching the role configuration
  const kpiCards: KpiCardData[] = isDeveloper
    ? [
        {
          config: roleConfig.kpis.card1,
          value: summaryData ? (summaryData as DeveloperDashboardSummary).totalIssues : 0,
          hint: 'Total issues',
          icon: 'bi-stack',
          iconBg: 'rgba(13, 110, 253, 0.1)',
          iconColor: '#0D6EFD'
        },
        {
          config: roleConfig.kpis.card2,
          value: summaryData ? (summaryData as DeveloperDashboardSummary).assignedIssues : 0,
          hint: 'Assigned to me',
          icon: 'bi-person-check',
          iconBg: 'rgba(16, 185, 129, 0.1)',
          iconColor: '#10B981'
        },
        {
          config: roleConfig.kpis.card3,
          value: summaryData ? (summaryData as DeveloperDashboardSummary).inProgressCount : 0,
          hint: 'Currently working',
          icon: 'bi-hourglass-split',
          iconBg: '#F3E8FF',
          iconColor: '#8B5CF6',
          valueColor: '#8B5CF6'
        },
        {
          config: roleConfig.kpis.card4,
          value: summaryData ? (summaryData as DeveloperDashboardSummary).pendingCount : 0,
          hint: 'Awaiting action',
          icon: 'bi-ticket-perforated',
          iconBg: '#FEF3C7',
          iconColor: '#D97706'
        }
      ]
    : [
        {
          config: roleConfig.kpis.card1,
          value: summaryData ? (summaryData as DashboardSummary).totalLogged : 0,
          hint: 'All time logged',
          icon: 'bi-stack',
          iconBg: 'rgba(13, 110, 253, 0.1)',
          iconColor: '#0D6EFD'
        },
        {
          config: roleConfig.kpis.card2,
          value: (
            <>
              <span className="text-primary">{summaryData ? (summaryData as DashboardSummary).activeCount : 0}</span>
              <span className="text-muted fs-6 fw-normal mx-1">/</span>
              <span className="text-success">{summaryData ? (summaryData as DashboardSummary).resolvedCount : 0}</span>
            </>
          ),
          hint: `${summaryData ? (summaryData as DashboardSummary).resolvedCount : 0} closed`,
          icon: 'bi-check-circle',
          iconBg: 'rgba(16, 185, 129, 0.1)',
          iconColor: '#10B981'
        },
        {
          config: roleConfig.kpis.card3,
          value: summaryData ? (summaryData as DashboardSummary).inProgressCount : 0,
          hint: 'Developer triage',
          icon: 'bi-hourglass-split',
          iconBg: '#F3E8FF',
          iconColor: '#8B5CF6',
          valueColor: '#8B5CF6'
        },
        {
          config: roleConfig.kpis.card4,
          value: (
            <>
              <span className="text-warning">{summaryData ? (summaryData as DashboardSummary).openCount : 0}</span>
              <span className="text-muted fs-6 fw-normal ms-1">
                ({summaryData ? (summaryData as DashboardSummary).acceptedCount : 0} Acc.)
              </span>
            </>
          ),
          hint: 'Queue allocation',
          icon: 'bi-ticket-perforated',
          iconBg: '#FEF3C7',
          iconColor: '#D97706'
        }
      ];

  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ gap: '0.85rem' }}>
      {/* Toast Notification */}
      {successToast && (
        <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between shadow-xs mb-0 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <span>{successToast}</span>
          </div>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setSuccessToast(null)} />
        </div>
      )}

      {/* 1. Welcome Header Banner */}
      <WelcomeBanner
        userName={currentUser?.name}
        employeeId={currentUser?.employeeId}
        roleType={currentUser?.roleType}
        isDeveloper={isDeveloper}
        isConnected={isConnected}
        subtitle={roleConfig.dashboardSubtitle}
        onRefresh={loadSummary}
        onCreateIssue={() => setIsReportModalOpen(true)}
        isRefreshing={isLoading}
      />

      {/* API Warning if server error */}
      {apiError && (
        <div className="alert alert-warning py-1.5 px-3 small rounded-3 d-flex align-items-center justify-content-between mb-0 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-warning fs-6"></i>
            <span>{apiError}</span>
          </div>
          <button className="btn btn-sm btn-outline-dark py-0 px-2" onClick={loadSummary}>
            Retry API
          </button>
        </div>
      )}

      {/* 2. 4 Role-Configured KPI Cards */}
      <KpiCardsGrid cards={kpiCards} isLoading={isLoading} />

      {/* 3. The 2 Visual SVG Charts (Graph 1: Trends, Graph 2: Role Distribution) */}
      <div className="flex-grow-1 min-h-0 d-flex flex-column" style={{ minHeight: '280px' }}>
        <HomeInsights role={effectiveRole} refreshTrigger={refreshKey} />
      </div>

      {/* Modal Popup for reporting/creating issues */}
      {isReportModalOpen && (
        <ReportIssueModal onClose={() => setIsReportModalOpen(false)} onSuccess={handleIssueCreated} />
      )}
    </div>
  );
};

export default DashboardPage;
