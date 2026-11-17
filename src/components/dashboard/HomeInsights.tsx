import React, { useState, useEffect, useCallback } from 'react';
import {
  apiFetchSupportIssueTrends,
  apiFetchSupportIssueTypeDistribution,
  apiFetchDeveloperIssueTrends,
  apiFetchDeveloperPriorityDistribution,
  IssueTrendsResponse,
  IssueTypeDistributionResponse,
  DeveloperPriorityDistributionResponse
} from '../../services/api/dashboardService';

export interface HomeInsightsProps {
  role?: 'Support' | 'Developer';
  developerEmployeeId?: string;
  developerName?: string;
  refreshTrigger?: number | string;
}

export const HomeInsights: React.FC<HomeInsightsProps> = ({
  role = 'Support',
  refreshTrigger
}) => {
  const isDeveloper = role === 'Developer';

  // ================= STATE FOR GRAPH 1 / 3: ISSUE TRENDS =================
  const [trendsData, setTrendsData] = useState<IssueTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState<boolean>(true);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  // ================= STATE FOR GRAPH 2: SUPPORT ISSUE TYPE DISTRIBUTION =================
  const [distData, setDistData] = useState<IssueTypeDistributionResponse | null>(null);
  const [distLoading, setDistLoading] = useState<boolean>(true);
  const [distError, setDistError] = useState<string | null>(null);

  // ================= STATE FOR GRAPH 4: DEVELOPER PRIORITY DISTRIBUTION =================
  const [priorityData, setPriorityData] = useState<DeveloperPriorityDistributionResponse | null>(null);
  const [priorityLoading, setPriorityLoading] = useState<boolean>(true);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  // Tooltip States
  const [trendsTooltip, setTrendsTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    open: number;
    resolved: number;
    onHold: number;
    inProgress: number;
  } | null>(null);

  const [distTooltip, setDistTooltip] = useState<{
    x: number;
    y: number;
    category: string;
    count: number;
    pct: number;
  } | null>(null);

  const [priorityTooltip, setPriorityTooltip] = useState<{
    x: number;
    y: number;
    week: string;
    high: number;
    medium: number;
    low: number;
  } | null>(null);

  // ================= FETCH DATA FUNCTIONS =================
  const loadTrends = useCallback(async () => {
    setTrendsLoading(true);
    setTrendsError(null);
    setTrendsData(null);
    try {
      if (isDeveloper) {
        const res = await apiFetchDeveloperIssueTrends();
        if (res.success && res.data) {
          setTrendsData(res.data);
        } else {
          setTrendsData(null);
          setTrendsError(res.message || 'Unable to fetch Developer Issue Trends.');
        }
      } else {
        const res = await apiFetchSupportIssueTrends();
        if (res.success && res.data) {
          setTrendsData(res.data);
        } else {
          setTrendsData(null);
          setTrendsError(res.message || 'Unable to fetch Support Issue Trends.');
        }
      }
    } catch (err: any) {
      setTrendsData(null);
      setTrendsError(err.message || 'Network error fetching trends.');
    } finally {
      setTrendsLoading(false);
    }
  }, [isDeveloper]);

  const loadSecondGraph = useCallback(async () => {
    if (isDeveloper) {
      setPriorityLoading(true);
      setPriorityError(null);
      setPriorityData(null);
      try {
        const res = await apiFetchDeveloperPriorityDistribution();
        if (res.success && res.data) {
          setPriorityData(res.data);
        } else {
          setPriorityData(null);
          setPriorityError(res.message || 'Unable to fetch Developer Priority Distribution.');
        }
      } catch (err: any) {
        setPriorityData(null);
        setPriorityError(err.message || 'Network error fetching priority distribution.');
      } finally {
        setPriorityLoading(false);
      }
    } else {
      setDistLoading(true);
      setDistError(null);
      setDistData(null);
      try {
        const res = await apiFetchSupportIssueTypeDistribution();
        if (res.success && res.data) {
          setDistData(res.data);
        } else {
          setDistData(null);
          setDistError(res.message || 'Unable to fetch Issue Type Distribution.');
        }
      } catch (err: any) {
        setDistData(null);
        setDistError(err.message || 'Network error fetching issue types.');
      } finally {
        setDistLoading(false);
      }
    }
  }, [isDeveloper]);

  useEffect(() => {
    loadTrends();
    loadSecondGraph();
  }, [loadTrends, loadSecondGraph, refreshTrigger]);

  // ================= SVG MATH HELPERS =================
  const getNiceMax = (val: number): number => {
    if (val <= 0) return 5;
    if (val <= 5) return 5;
    if (val <= 10) return 10;
    if (val <= 20) return 20;
    if (val <= 50) return Math.ceil(val / 10) * 10;
    if (val <= 100) return Math.ceil(val / 20) * 20;
    return Math.ceil(val / 50) * 50;
  };

  // ----------------- GRAPH 1 & 3: MULTI-SERIES LINE CHART CALCULATIONS -----------------
  // Use only values returned by the API. Invalid or incomplete payloads produce an empty state.
  const apiTrendLabels = trendsData?.labels ?? [];
  const apiOpenTickets = trendsData?.open_tickets ?? [];
  const apiResolvedTickets = trendsData?.resolved_tickets ?? [];
  const apiOnHoldTickets = trendsData?.on_hold_tickets ?? [];
  const apiInProgressTickets = trendsData?.in_progress_tickets ?? [];

  const hasValidTrendData =
    apiTrendLabels.length > 0 &&
    [apiOpenTickets, apiResolvedTickets, apiOnHoldTickets, apiInProgressTickets].every(
      (series) => series.length === apiTrendLabels.length && series.every(Number.isFinite)
    );

  const rawLabels = hasValidTrendData ? apiTrendLabels : [];
  const openTickets = hasValidTrendData ? apiOpenTickets : [];
  const resolvedTickets = hasValidTrendData ? apiResolvedTickets : [];
  const onHoldTickets = hasValidTrendData ? apiOnHoldTickets : [];
  const inProgressTickets = hasValidTrendData ? apiInProgressTickets : [];

  const allTrendValues = [
    ...openTickets,
    ...resolvedTickets,
    ...onHoldTickets,
    ...inProgressTickets
  ];
  const maxTrendVal = Math.max(0, ...allTrendValues);
  const yMaxTrend = getNiceMax(maxTrendVal);

  const getYTrend = (val: number): number => {
    const safeVal = Math.max(0, Number(val) || 0);
    return 185 - (safeVal / yMaxTrend) * 155;
  };

  const lineCount = rawLabels.length;
  const lineXCoords = rawLabels.map((_, i) =>
    lineCount <= 1 ? 270 : 55 + i * (450 / (lineCount - 1))
  );

  const buildPath = (vals: number[]): string => {
    if (!vals.length) return '';
    return vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${lineXCoords[i]} ${getYTrend(v).toFixed(1)}`)
      .join(' ');
  };

  const openPath = buildPath(openTickets);
  const resolvedPath = buildPath(resolvedTickets);
  const onHoldPath = buildPath(onHoldTickets);
  const inProgressPath = buildPath(inProgressTickets);
  const areaOpenPath = openPath
    ? `${openPath} L ${lineXCoords[lineXCoords.length - 1]} 185 L ${lineXCoords[0]} 185 Z`
    : '';

  const trendsStats = trendsData?.stats;

  // ----------------- GRAPH 2: SUPPORT ISSUE TYPE BAR CHART CALCULATIONS -----------------
  const apiDistLabels = distData?.labels ?? [];
  const apiDistCounts = distData?.counts ?? [];
  const hasValidDistributionData =
    apiDistLabels.length > 0 &&
    apiDistCounts.length === apiDistLabels.length &&
    apiDistCounts.every(Number.isFinite);
  const distLabels = hasValidDistributionData ? apiDistLabels : [];
  const distCounts = hasValidDistributionData ? apiDistCounts : [];
  const hasDistributionActivity = distCounts.some((count) => count > 0);
  const maxDistVal = Math.max(0, ...distCounts);
  const yMaxDist = getNiceMax(maxDistVal);

  const distCenters = distLabels.length === 4
    ? [105, 215, 325, 435]
    : distLabels.map((_, i) => 80 + i * (380 / Math.max(1, distLabels.length - 1)));
  const distBarWidth = Math.min(56, Math.floor(380 / (distLabels.length * 1.5)));

  // ----------------- GRAPH 4: DEVELOPER WEEKLY PRIORITY CHART CALCULATIONS -----------------
  const apiPriorityLabels = priorityData?.labels ?? [];
  const apiPriorityHigh = priorityData?.high ?? [];
  const apiPriorityMedium = priorityData?.medium ?? [];
  const apiPriorityLow = priorityData?.low ?? [];
  const hasValidPriorityData =
    apiPriorityLabels.length > 0 &&
    [apiPriorityHigh, apiPriorityMedium, apiPriorityLow].every(
      (series) => series.length === apiPriorityLabels.length && series.every(Number.isFinite)
    );
  const priorityLabels = hasValidPriorityData ? apiPriorityLabels : [];
  const priorityHigh = hasValidPriorityData ? apiPriorityHigh : [];
  const priorityMed = hasValidPriorityData ? apiPriorityMedium : [];
  const priorityLow = hasValidPriorityData ? apiPriorityLow : [];

  const allPriorityVals = [...priorityHigh, ...priorityMed, ...priorityLow];
  const maxPriorityVal = Math.max(0, ...allPriorityVals);
  const yMaxPriority = getNiceMax(maxPriorityVal);

  const priorityCenters = priorityLabels.map((_, i) =>
    priorityLabels.length <= 1 ? 270 : 80 + i * (380 / (priorityLabels.length - 1))
  );
  const pBarW = 16;
  const pGap = 3;

  const totalDevAssigned = priorityData?.stats?.total_assigned;

  return (
    <div className="row g-3 h-100 flex-grow-1 min-h-0">

      {/* ========================================================================= */}
      {/* ================= 1. LINE CHART: ISSUE TRENDS (SUPPORT OR DEV) ========== */}
      {/* ========================================================================= */}
      <div className="col-12 col-lg-6 d-flex flex-column h-100 min-h-0" style={{ minHeight: '260px' }}>
        <div className="graph-card-reference d-flex flex-column h-100 min-h-0">

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
            <div>
              <div className="d-flex align-items-center gap-1.5">
                <i className="bi bi-graph-up text-primary fs-6"></i>
                <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                  {isDeveloper ? 'Developer Issue Trends (Line)' : 'Incident Volume & Trends (Line)'}
                </h6>
              </div>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                7-day multi-status trajectory across open, resolved, on-hold & in-progress
              </small>
            </div>

            {/* 4-Status Legend & Trend Badge */}
            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              <div
                className="d-flex align-items-center gap-1.5 small px-2 py-0.5 rounded bg-light border flex-wrap"
                style={{ fontSize: '0.68rem' }}
              >
                <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
                  <span style={{ width: '7px', height: '7px', backgroundColor: '#0D6EFD', borderRadius: '50%', display: 'inline-block' }}></span>
                  Open
                </span>
                <span className="text-muted">|</span>
                <span className="d-flex align-items-center gap-1 text-success fw-semibold">
                  <span style={{ width: '7px', height: '7px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block' }}></span>
                  Resolved
                </span>
                <span className="text-muted">|</span>
                <span className="d-flex align-items-center gap-1 fw-semibold" style={{ color: '#D97706' }}>
                  <span style={{ width: '7px', height: '7px', backgroundColor: '#F59E0B', borderRadius: '50%', display: 'inline-block' }}></span>
                  On-Hold
                </span>
                <span className="text-muted">|</span>
                <span className="d-flex align-items-center gap-1 fw-semibold" style={{ color: '#8B5CF6' }}>
                  <span style={{ width: '7px', height: '7px', backgroundColor: '#8B5CF6', borderRadius: '50%', display: 'inline-block' }}></span>
                  In-Prog
                </span>
              </div>

              {trendsStats?.resolution_rate != null ? (
                <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-arrow-up-right me-0.5"></i>
                  {trendsStats.resolution_rate}% Resolved
                </span>
              ) : (
                <span className="badge bg-light text-secondary border rounded-pill px-2 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                  N/A
                </span>
              )}
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">
            {/* Loading Spinner Overlay */}
            {trendsLoading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-75 p-2 rounded-3 shadow-xs" style={{ zIndex: 10 }}>
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <small className="d-block text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                  Loading trends...
                </small>
              </div>
            )}

            {/* Error Message Overlay */}
            {trendsError && !trendsLoading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center px-3 py-2 bg-white bg-opacity-90 rounded-3 border shadow-xs" style={{ zIndex: 10, maxWidth: '85%' }}>
                <i className="bi bi-exclamation-triangle text-warning fs-5"></i>
                <div className="text-secondary small mt-1 text-truncate" style={{ fontSize: '0.72rem' }} title={trendsError}>
                  {trendsError}
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm py-0 px-2 mt-1.5"
                  style={{ fontSize: '0.7rem' }}
                  onClick={loadTrends}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State Overlay */}
            {trendsData && !hasValidTrendData && !trendsError && !trendsLoading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-info-circle me-1 text-primary"></i>Chart data is unavailable or incomplete
                </small>
              </div>
            )}

            {trendsData && hasValidTrendData && allTrendValues.every((v) => v === 0) && !trendsError && !trendsLoading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-info-circle me-1 text-primary"></i>No ticket activity recorded for this period
                </small>
              </div>
            )}

            {/* SVG Canvas - Always rendered to maintain stable card dimensions */}
            <svg
              viewBox="0 0 540 215"
              className="w-100 h-100"
              preserveAspectRatio="xMidYMid meet"
              style={{ opacity: trendsLoading || trendsError ? 0.35 : 1 }}
            >
              <defs>
                <linearGradient id="lineBlueGradFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D6EFD" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="#0D6EFD" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#0D6EFD" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="40" y1="30" x2="520" y2="30" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="69" x2="520" y2="69" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="108" x2="520" y2="108" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="146" x2="520" y2="146" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="185" x2="520" y2="185" stroke="#E2E8F0" strokeWidth="1.2" />

              {/* Y-axis Ticks */}
              <text x="32" y="34" fill="#94A3B8" fontSize="9" textAnchor="end">{yMaxTrend}</text>
              <text x="32" y="73" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxTrend * 0.75)}</text>
              <text x="32" y="112" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxTrend * 0.5)}</text>
              <text x="32" y="150" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxTrend * 0.25)}</text>
              <text x="32" y="188" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

              {/* Area under Open tickets */}
              {areaOpenPath && <path d={areaOpenPath} fill="url(#lineBlueGradFull)" />}

              {/* 4 Status Paths */}
              {openPath && (
                <path
                  d={openPath}
                  fill="none"
                  stroke="#0D6EFD"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {resolvedPath && (
                <path
                  d={resolvedPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {onHoldPath && (
                <path
                  d={onHoldPath}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.0"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {inProgressPath && (
                <path
                  d={inProgressPath}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points & Hover Targets */}
              {rawLabels.map((lbl, i) => {
                const x = lineXCoords[i];
                const yO = getYTrend(openTickets[i]);
                const yR = getYTrend(resolvedTickets[i]);
                const yH = getYTrend(onHoldTickets[i]);
                const yP = getYTrend(inProgressTickets[i]);

                return (
                  <g key={i}>
                    {/* Open Circle */}
                    <circle
                      cx={x}
                      cy={yO}
                      r="3.5"
                      fill="#0D6EFD"
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                      className="chart-point"
                    />
                    {/* Resolved Circle */}
                    <circle
                      cx={x}
                      cy={yR}
                      r="3.2"
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                      className="chart-point"
                    />
                    {/* On-Hold Circle */}
                    <circle
                      cx={x}
                      cy={yH}
                      r="3"
                      fill="#F59E0B"
                      stroke="#FFFFFF"
                      strokeWidth="1.4"
                      className="chart-point"
                    />
                    {/* In-Progress Circle */}
                    <circle
                      cx={x}
                      cy={yP}
                      r="3"
                      fill="#8B5CF6"
                      stroke="#FFFFFF"
                      strokeWidth="1.4"
                      className="chart-point"
                    />

                    {/* X-axis Label */}
                    <text
                      x={x}
                      y="202"
                      fill="#64748B"
                      fontSize="9.5"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {lbl}
                    </text>

                    {/* Broad invisible hit column for smooth tooltip hover */}
                    <rect
                      x={x - 25}
                      y="25"
                      width="50"
                      height="165"
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() =>
                        setTrendsTooltip({
                          x,
                          y: Math.min(yO, yR, yH, yP),
                          label: lbl,
                          open: openTickets[i],
                          resolved: resolvedTickets[i],
                          onHold: onHoldTickets[i],
                          inProgress: inProgressTickets[i]
                        })
                      }
                      onMouseLeave={() => setTrendsTooltip(null)}
                    />
                  </g>
                );
              })}

              {/* 4-Status Tooltip Overlay */}
              {trendsTooltip && !trendsLoading && !trendsError && (
                <g className="chart-tooltip" pointerEvents="none">
                  <rect
                    x={Math.min(Math.max(trendsTooltip.x - 70, 30), 380)}
                    y={Math.max(trendsTooltip.y - 58, 6)}
                    width="140"
                    height="52"
                    rx="6"
                    fill="#0F172A"
                    opacity="0.95"
                  />
                  <text
                    x={Math.min(Math.max(trendsTooltip.x, 100), 450)}
                    y={Math.max(trendsTooltip.y - 42, 22)}
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {trendsTooltip.label} Incidents Breakdown
                  </text>
                  <text
                    x={Math.min(Math.max(trendsTooltip.x, 100), 450)}
                    y={Math.max(trendsTooltip.y - 28, 36)}
                    fill="#93C5FD"
                    fontSize="8"
                    textAnchor="middle"
                  >
                    Open: {trendsTooltip.open} | Resolved: {trendsTooltip.resolved}
                  </text>
                  <text
                    x={Math.min(Math.max(trendsTooltip.x, 100), 450)}
                    y={Math.max(trendsTooltip.y - 15, 49)}
                    fill="#FDE68A"
                    fontSize="8"
                    textAnchor="middle"
                  >
                    On-Hold: {trendsTooltip.onHold} | In-Prog: {trendsTooltip.inProgress}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Footer Metric Strip */}
          <div className="d-flex align-items-center justify-content-between pt-1 border-top border-light-subtle flex-shrink-0" style={{ fontSize: '0.72rem' }}>
            <span className="text-secondary">
              <i className="bi bi-calendar2-event me-1 text-primary"></i>Peak Day:{' '}
              <strong className="text-navy">
                {trendsStats?.peak_day
                  ? `${trendsStats.peak_day} (${trendsStats.peak_day_open_count ?? 'N/A'})`
                  : 'N/A'}
              </strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-check2-circle me-1 text-success"></i>Resolution Rate:{' '}
              <strong className="text-navy">
                {trendsStats?.resolution_rate != null ? `${trendsStats.resolution_rate}%` : 'N/A'}
              </strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-layers me-1 text-primary"></i>Net Backlog:{' '}
              <strong
                className={
                  trendsStats?.net_backlog && trendsStats.net_backlog > 0
                    ? 'text-warning'
                    : 'text-success'
                }
              >
                {trendsStats?.net_backlog != null
                  ? `${trendsStats.net_backlog > 0 ? '+' : ''}${trendsStats.net_backlog}`
                  : 'N/A'}
              </strong>
            </span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ================= 2. SECOND GRAPH: ROLE SPECIFIC ======================== */}
      {/* ========================================================================= */}
      <div className="col-12 col-lg-6 d-flex flex-column h-100 min-h-0" style={{ minHeight: '260px' }}>
        <div className="graph-card-reference d-flex flex-column h-100 min-h-0">

          {/* ================= CASE A: SUPPORT DASHBOARD (ISSUE TYPE DISTRIBUTION) ================= */}
          {!isDeveloper ? (
            <>
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
                <div>
                  <div className="d-flex align-items-center gap-1.5">
                    <i className="bi bi-pie-chart-fill text-primary fs-6"></i>
                    <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                      Issue Type Distribution (Bar Chart)
                    </h6>
                  </div>
                  <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    Categorical incident volume across Front-end, Backend, Database & Others
                  </small>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-trophy me-1"></i>
                    Top: {distData?.stats?.top_category ?? 'N/A'}
                  </span>
                  <span className="badge bg-light text-navy border rounded-pill px-2 py-1 fw-medium small" style={{ fontSize: '0.7rem' }}>
                    {distData?.stats?.top_category_count ?? 'N/A'} Top Category Count
                  </span>
                </div>
              </div>

              {/* Bar Chart SVG Canvas Container */}
              <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">
                {distLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-75 p-2 rounded-3 shadow-xs" style={{ zIndex: 10 }}>
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <small className="d-block text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      Loading distribution...
                    </small>
                  </div>
                )}

                {distError && !distLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center px-3 py-2 bg-white bg-opacity-90 rounded-3 border shadow-xs" style={{ zIndex: 10, maxWidth: '85%' }}>
                    <i className="bi bi-exclamation-triangle text-warning fs-5"></i>
                    <div className="text-secondary small mt-1 text-truncate" style={{ fontSize: '0.72rem' }} title={distError}>
                      {distError}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-0 px-2 mt-1.5"
                      style={{ fontSize: '0.7rem' }}
                      onClick={loadSecondGraph}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {distData && !hasValidDistributionData && !distError && !distLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                    <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                      <i className="bi bi-info-circle me-1 text-primary"></i>Chart data is unavailable or incomplete
                    </small>
                  </div>
                )}

                {distData && hasValidDistributionData && !hasDistributionActivity && !distError && !distLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                    <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                      <i className="bi bi-info-circle me-1 text-primary"></i>No category distribution data recorded
                    </small>
                  </div>
                )}

                <svg
                  viewBox="0 0 540 215"
                  className="w-100 h-100"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ opacity: distLoading || distError ? 0.35 : 1 }}
                >
                  <defs>
                    <linearGradient id="histBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D6EFD" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="histPeakGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" />
                      <stop offset="100%" stopColor="#0369A1" />
                    </linearGradient>
                  </defs>

                  {/* Gridlines */}
                  <line x1="40" y1="30" x2="520" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="69" x2="520" y2="69" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="108" x2="520" y2="108" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="146" x2="520" y2="146" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="185" x2="520" y2="185" stroke="#E2E8F0" strokeWidth="1.2" />

                  {/* Y-axis labels */}
                  <text x="32" y="34" fill="#94A3B8" fontSize="9" textAnchor="end">{yMaxDist}</text>
                  <text x="32" y="73" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxDist * 0.75)}</text>
                  <text x="32" y="112" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxDist * 0.5)}</text>
                  <text x="32" y="150" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxDist * 0.25)}</text>
                  <text x="32" y="188" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

                  {/* Bars */}
                  {distLabels.map((cat, i) => {
                    const count = distCounts[i];
                    const height = yMaxDist > 0 ? (count / yMaxDist) * 155 : 0;
                    const y = 185 - height;
                    const x = distCenters[i] - distBarWidth / 2;
                    const isPeak =
                      count > 0 &&
                      (count === maxDistVal ||
                        (distData?.stats?.top_category && cat === distData.stats.top_category));


                    return (
                      <g key={i}>
                        {/* Column */}
                        <rect
                          x={x}
                          y={y}
                          width={distBarWidth}
                          height={Math.max(2, height)}
                          rx="4"
                          fill={isPeak ? 'url(#histPeakGrad)' : 'url(#histBarGrad)'}
                          fillOpacity={isPeak ? '0.95' : '0.85'}
                          stroke={isPeak ? '#0369A1' : '#1D4ED8'}
                          strokeWidth="1"
                          className="chart-bar"
                          onMouseEnter={() =>
                            setDistTooltip({
                              x: x + distBarWidth / 2,
                              y,
                              category: cat,
                              count,
                              pct: 0
                            })
                          }
                          onMouseLeave={() => setDistTooltip(null)}
                        />

                        {/* Pill Over Bar */}
                        <rect
                          x={x + (distBarWidth - 28) / 2}
                          y={Math.max(y - 17, 8)}
                          width="28"
                          height="13"
                          rx="3"
                          fill="#EFF6FF"
                          stroke="#BFDBFE"
                          strokeWidth="0.8"
                        />
                        <text
                          x={x + distBarWidth / 2}
                          y={Math.max(y - 7, 18)}
                          fill="#1E40AF"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {count}
                        </text>

                        {/* Category Label */}
                        <text
                          x={x + distBarWidth / 2}
                          y="201"
                          fill="#475569"
                          fontSize="9"
                          fontWeight={isPeak ? '700' : '500'}
                          textAnchor="middle"
                        >
                          {cat}
                        </text>
                      </g>
                    );
                  })}

                  {/* Tooltip Overlay */}
                  {distTooltip && !distLoading && !distError && (
                    <g className="chart-tooltip" pointerEvents="none">
                      <rect
                        x={Math.min(Math.max(distTooltip.x - 60, 40), 410)}
                        y={Math.max(distTooltip.y - 42, 6)}
                        width="120"
                        height="34"
                        rx="6"
                        fill="#0F172A"
                        opacity="0.95"
                      />
                      <text
                        x={Math.min(Math.max(distTooltip.x, 100), 470)}
                        y={Math.max(distTooltip.y - 27, 21)}
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Type: {distTooltip.category}
                      </text>
                      <text
                        x={Math.min(Math.max(distTooltip.x, 100), 470)}
                        y={Math.max(distTooltip.y - 14, 34)}
                        fill="#93C5FD"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        {distTooltip.count} tickets
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Footer Metric Strip */}
              <div className="d-flex align-items-center justify-content-between pt-1 border-top border-light-subtle flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                <span className="text-secondary">
                  <i className="bi bi-bullseye me-1 text-primary"></i>Top Type:{' '}
                  <strong className="text-navy">
                    {distData?.stats?.top_category
                      ? `${distData.stats.top_category} (${distData.stats.top_category_percentage != null
                        ? `${distData.stats.top_category_percentage}%`
                        : `${distData.stats.top_category_count ?? 'N/A'}`
                      })`
                      : 'N/A'}
                  </strong>
                </span>
                <span className="text-secondary">
                  <i className="bi bi-graph-up-arrow me-1 text-success"></i>Fastest Growing:{' '}
                  <strong className="text-navy">
                    {distData?.stats?.fastest_growing_type ?? 'N/A'}
                    {distData?.stats?.growth_count != null ? ` (+${distData.stats.growth_count})` : ''}
                  </strong>
                </span>
                <span className="text-secondary">
                  <i className="bi bi-clock-history me-1 text-secondary"></i>Avg. Resol:{' '}
                  <strong className="text-navy">
                    {distData?.stats?.average_resolution_hours != null
                      ? `${distData.stats.average_resolution_hours} hrs`
                      : 'N/A'}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            /* ================= CASE B: DEVELOPER DASHBOARD (WEEKLY PRIORITY DISTRIBUTION) ================= */
            <>
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
                <div>
                  <div className="d-flex align-items-center gap-1.5">
                    <i className="bi bi-bar-chart-fill text-primary fs-6"></i>
                    <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                      Weekly Priority Distribution
                    </h6>
                  </div>
                  <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    Multi-priority workload tracking across recent weeks (High, Medium, Low)
                  </small>
                </div>

                {/* Priority Legend & Badge */}
                <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                  <div className="d-flex align-items-center gap-2 small px-2 py-0.5 rounded bg-light border" style={{ fontSize: '0.68rem' }}>
                    <span className="d-flex align-items-center gap-1 text-danger fw-semibold">
                      <span style={{ width: '7px', height: '7px', backgroundColor: '#EF4444', borderRadius: '2px', display: 'inline-block' }}></span>
                      High
                    </span>
                    <span className="text-muted">|</span>
                    <span className="d-flex align-items-center gap-1 fw-semibold" style={{ color: '#D97706' }}>
                      <span style={{ width: '7px', height: '7px', backgroundColor: '#F59E0B', borderRadius: '2px', display: 'inline-block' }}></span>
                      Med
                    </span>
                    <span className="text-muted">|</span>
                    <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
                      <span style={{ width: '7px', height: '7px', backgroundColor: '#3B82F6', borderRadius: '2px', display: 'inline-block' }}></span>
                      Low
                    </span>
                  </div>

                  <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-person-check me-1"></i>
                    {totalDevAssigned ?? 'N/A'} Assigned
                  </span>
                </div>
              </div>

              {/* Multi-series Priority SVG Canvas Container */}
              <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">
                {priorityLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-75 p-2 rounded-3 shadow-xs" style={{ zIndex: 10 }}>
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <small className="d-block text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                      Loading priorities...
                    </small>
                  </div>
                )}

                {priorityError && !priorityLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center px-3 py-2 bg-white bg-opacity-90 rounded-3 border shadow-xs" style={{ zIndex: 10, maxWidth: '85%' }}>
                    <i className="bi bi-exclamation-triangle text-warning fs-5"></i>
                    <div className="text-secondary small mt-1 text-truncate" style={{ fontSize: '0.72rem' }} title={priorityError}>
                      {priorityError}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-0 px-2 mt-1.5"
                      style={{ fontSize: '0.7rem' }}
                      onClick={loadSecondGraph}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {priorityData && !hasValidPriorityData && !priorityError && !priorityLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                    <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                      <i className="bi bi-info-circle me-1 text-primary"></i>Chart data is unavailable or incomplete
                    </small>
                  </div>
                )}

                {priorityData && hasValidPriorityData && totalDevAssigned === 0 && !priorityError && !priorityLoading && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center bg-white bg-opacity-80 px-2.5 py-1 rounded-pill border shadow-xs" style={{ pointerEvents: 'none', zIndex: 5 }}>
                    <small className="text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                      <i className="bi bi-info-circle me-1 text-primary"></i>No priority tickets assigned
                    </small>
                  </div>
                )}

                <svg
                  viewBox="0 0 540 215"
                  className="w-100 h-100"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ opacity: priorityLoading || priorityError ? 0.35 : 1 }}
                >
                  {/* Gridlines */}
                  <line x1="40" y1="30" x2="520" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="69" x2="520" y2="69" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="108" x2="520" y2="108" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="146" x2="520" y2="146" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="40" y1="185" x2="520" y2="185" stroke="#E2E8F0" strokeWidth="1.2" />

                  {/* Y-axis Ticks */}
                  <text x="32" y="34" fill="#94A3B8" fontSize="9" textAnchor="end">{yMaxPriority}</text>
                  <text x="32" y="73" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxPriority * 0.75)}</text>
                  <text x="32" y="112" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxPriority * 0.5)}</text>
                  <text x="32" y="150" fill="#94A3B8" fontSize="9" textAnchor="end">{Math.round(yMaxPriority * 0.25)}</text>
                  <text x="32" y="188" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

                  {/* 3 Grouped Bars per Week */}
                  {priorityLabels.map((wk, i) => {
                    const center = priorityCenters[i];
                    const hVal = priorityHigh[i];
                    const mVal = priorityMed[i];
                    const lVal = priorityLow[i];

                    const hHeight = yMaxPriority > 0 ? (hVal / yMaxPriority) * 155 : 0;
                    const mHeight = yMaxPriority > 0 ? (mVal / yMaxPriority) * 155 : 0;
                    const lHeight = yMaxPriority > 0 ? (lVal / yMaxPriority) * 155 : 0;

                    const yH = 185 - hHeight;
                    const yM = 185 - mHeight;
                    const yL = 185 - lHeight;

                    const xH = center - pBarW * 1.5 - pGap;
                    const xM = center - pBarW / 2;
                    const xL = center + pBarW / 2 + pGap;

                    return (
                      <g key={i}>
                        {/* High Bar (Red) */}
                        <rect
                          x={xH}
                          y={yH}
                          width={pBarW}
                          height={Math.max(2, hHeight)}
                          rx="3"
                          fill="#EF4444"
                          opacity={hVal > 0 ? 0.9 : 0.4}
                          className="chart-bar"
                        />
                        {/* Medium Bar (Amber/Orange) */}
                        <rect
                          x={xM}
                          y={yM}
                          width={pBarW}
                          height={Math.max(2, mHeight)}
                          rx="3"
                          fill="#F59E0B"
                          opacity={mVal > 0 ? 0.9 : 0.4}
                          className="chart-bar"
                        />
                        {/* Low Bar (Blue) */}
                        <rect
                          x={xL}
                          y={yL}
                          width={pBarW}
                          height={Math.max(2, lHeight)}
                          rx="3"
                          fill="#3B82F6"
                          opacity={lVal > 0 ? 0.9 : 0.4}
                          className="chart-bar"
                        />

                        {/* Week Label */}
                        <text
                          x={center}
                          y="201"
                          fill="#475569"
                          fontSize="9.5"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {wk}
                        </text>

                        {/* Hover Hit Box for Week */}
                        <rect
                          x={xH - 8}
                          y="25"
                          width={pBarW * 3 + pGap * 2 + 16}
                          height="165"
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() =>
                            setPriorityTooltip({
                              x: center,
                              y: Math.min(yH, yM, yL),
                              week: wk,
                              high: hVal,
                              medium: mVal,
                              low: lVal
                            })
                          }
                          onMouseLeave={() => setPriorityTooltip(null)}
                        />
                      </g>
                    );
                  })}

                  {/* Developer Priority Tooltip */}
                  {priorityTooltip && !priorityLoading && !priorityError && (
                    <g className="chart-tooltip" pointerEvents="none">
                      <rect
                        x={Math.min(Math.max(priorityTooltip.x - 70, 30), 380)}
                        y={Math.max(priorityTooltip.y - 56, 6)}
                        width="140"
                        height="50"
                        rx="6"
                        fill="#0F172A"
                        opacity="0.95"
                      />
                      <text
                        x={Math.min(Math.max(priorityTooltip.x, 100), 450)}
                        y={Math.max(priorityTooltip.y - 40, 22)}
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {priorityTooltip.week} Priority Breakdown
                      </text>
                      <text
                        x={Math.min(Math.max(priorityTooltip.x, 100), 450)}
                        y={Math.max(priorityTooltip.y - 26, 36)}
                        fill="#FCA5A5"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        High: {priorityTooltip.high} | Med: {priorityTooltip.medium}
                      </text>
                      <text
                        x={Math.min(Math.max(priorityTooltip.x, 100), 450)}
                        y={Math.max(priorityTooltip.y - 13, 49)}
                        fill="#93C5FD"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        Low: {priorityTooltip.low} | Total: {priorityTooltip.high + priorityTooltip.medium + priorityTooltip.low}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Footer Metric Strip */}
              <div className="d-flex align-items-center justify-content-between pt-1 border-top border-light-subtle flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                <span className="text-secondary">
                  <i className="bi bi-exclamation-octagon-fill me-1 text-danger"></i>High Priority:{' '}
                  <strong className="text-danger">
                    {priorityData?.stats?.high_priority ?? 'N/A'}
                  </strong>
                </span>
                <span className="text-secondary">
                  <i className="bi bi-exclamation-triangle-fill me-1 text-warning"></i>Medium:{' '}
                  <strong className="text-warning">
                    {priorityData?.stats?.medium_priority ?? 'N/A'}
                  </strong>
                </span>
                <span className="text-secondary">
                  <i className="bi bi-info-circle-fill me-1 text-primary"></i>Low:{' '}
                  <strong className="text-primary">
                    {priorityData?.stats?.low_priority ?? 'N/A'}
                  </strong>
                </span>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
};
