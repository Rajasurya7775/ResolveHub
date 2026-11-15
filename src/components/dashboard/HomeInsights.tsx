
import React, { useState, useEffect } from 'react';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

export const HomeInsights: React.FC = () => {

  // ================= API DATA STATES =================

  type TrendStats = {
    peak_day: string;
    peak_day_open_count: number;
    resolution_rate: number;
    total_resolved: number;
    total_logged: number;
    net_backlog: number;
    net_backlog_direction: string;
  };

  type DistributionStats = {
    top_category: string;
    top_category_count: number;
    top_category_percentage: number;
    fastest_growing_type: string;
    growth_count: number;
    growth_direction: string;
    current_week_counts: Record<string, number>;
    previous_week_counts: Record<string, number>;
    slowest_to_resolve: string;
    average_resolution_hours: number;
    average_resolution_by_type: Record<string, number | null>;
  };

  const [trendData, setTrendData] = useState<{
    labels: string[];
    open_tickets: number[];
    resolved_tickets: number[];
    stats: TrendStats;
  }>({
    labels: [],
    open_tickets: [],
    resolved_tickets: [],
    stats: {
      peak_day: '',
      peak_day_open_count: 0,
      resolution_rate: 0,
      total_resolved: 0,
      total_logged: 0,
      net_backlog: 0,
      net_backlog_direction: 'unchanged'
    }
  });

  const [histogramData, setHistogramData] = useState<{
    labels: string[];
    counts: number[];
    stats: DistributionStats;
  }>({
    labels: [],
    counts: [],
    stats: {
      top_category: '',
      top_category_count: 0,
      top_category_percentage: 0,
      fastest_growing_type: '',
      growth_count: 0,
      growth_direction: 'unchanged',
      current_week_counts: {},
      previous_week_counts: {},
      slowest_to_resolve: '',
      average_resolution_hours: 0,
      average_resolution_by_type: {}
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [histogramLoading, setHistogramLoading] = useState(true);
  const [histogramError, setHistogramError] = useState<string | null>(null);

  // ================= TOOLTIP STATES =================

  const [lineTooltip, setLineTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    reported: number;
    resolved: number;
  } | null>(null);

  const [histTooltip, setHistTooltip] = useState<{
    x: number;
    y: number;
    bin: string;
    count: number;
  } | null>(null);

  // ================= 1. FETCH ISSUE TRENDS API =================

  useEffect(() => {
    const fetchIssueTrends = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('resolvehub_auth_token');

        const response = await fetch(
          `${API_BASE_URL}/dashboard/issue-trends`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch issue trends: ${response.status}`);
        }

        const data = await response.json();

        setTrendData({
          labels: Array.isArray(data.labels) ? data.labels : [],
          open_tickets: Array.isArray(data.open_tickets)
            ? data.open_tickets
            : [],
          resolved_tickets: Array.isArray(data.resolved_tickets)
            ? data.resolved_tickets
            : [],
          stats: {
            peak_day: data.stats?.peak_day ?? '',
            peak_day_open_count: Number(data.stats?.peak_day_open_count) || 0,
            resolution_rate: Number(data.stats?.resolution_rate) || 0,
            total_resolved: Number(data.stats?.total_resolved) || 0,
            total_logged: Number(data.stats?.total_logged) || 0,
            net_backlog: Number(data.stats?.net_backlog) || 0,
            net_backlog_direction: data.stats?.net_backlog_direction ?? 'unchanged'
          }
        });

      } catch (err) {
        console.error('Issue Trends API Error:', err);
        setError('Unable to load incident trends');
      } finally {
        setLoading(false);
      }
    };

    fetchIssueTrends();
  }, []);

  // ================= 2. FETCH ISSUE TYPE DISTRIBUTION API =================

  useEffect(() => {
    const fetchIssueTypeDistribution = async () => {
      try {
        setHistogramLoading(true);
        setHistogramError(null);

        const token = localStorage.getItem('resolvehub_auth_token');

        const response = await fetch(
          `${API_BASE_URL}/dashboard/issue-type-distribution`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch issue type distribution: ${response.status}`
          );
        }

        const data = await response.json();

        setHistogramData({
          labels: Array.isArray(data.labels) ? data.labels : [],
          counts: Array.isArray(data.counts) ? data.counts : [],
          stats: {
            top_category: data.stats?.top_category ?? '',
            top_category_count: Number(data.stats?.top_category_count) || 0,
            top_category_percentage: Number(data.stats?.top_category_percentage) || 0,
            fastest_growing_type: data.stats?.fastest_growing_type ?? '',
            growth_count: Number(data.stats?.growth_count) || 0,
            growth_direction: data.stats?.growth_direction ?? 'unchanged',
            current_week_counts: data.stats?.current_week_counts ?? {},
            previous_week_counts: data.stats?.previous_week_counts ?? {},
            slowest_to_resolve: data.stats?.slowest_to_resolve ?? '',
            average_resolution_hours: Number(data.stats?.average_resolution_hours) || 0,
            average_resolution_by_type: data.stats?.average_resolution_by_type ?? {}
          }
        });

      } catch (err) {
        console.error('Issue Type Distribution API Error:', err);
        setHistogramError('Unable to load issue type distribution');
      } finally {
        setHistogramLoading(false);
      }
    };

    fetchIssueTypeDistribution();
  }, []);

  // ================= 3. LINE CHART DATA =================

  const chartHeight = 155;
  const chartBottom = 185;
  const chartLeft = 55;
  const chartRight = 505;

  const maxValue = Math.max(
    10,
    ...trendData.open_tickets.map(Number),
    ...trendData.resolved_tickets.map(Number)
  );

  const linePoints = trendData.labels.map((day, index) => {

    const x =
      chartLeft +
      (index * (chartRight - chartLeft)) /
      Math.max(trendData.labels.length - 1, 1);

    const reported = Number(trendData.open_tickets[index]) || 0;
    const resolved = Number(trendData.resolved_tickets[index]) || 0;

    return {
      day,
      reported,
      resolved,
      x,
      yReported: chartBottom - (reported / maxValue) * chartHeight,
      yResolved: chartBottom - (resolved / maxValue) * chartHeight
    };
  });

  const lineReportedPath = linePoints
    .map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.yReported}`
    )
    .join(' ');

  const lineResolvedPath = linePoints
    .map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.yResolved}`
    )
    .join(' ');

  const areaReportedPath = linePoints.length > 0
    ? `${lineReportedPath} L ${linePoints[linePoints.length - 1].x} ${chartBottom} L ${chartLeft} ${chartBottom} Z`
    : '';

  // ================= 4. DYNAMIC HISTOGRAM DATA =================

  const histogramTop = 30;
  const histogramBottom = 185;
  const histogramHeight = histogramBottom - histogramTop;

  const histogramMaxValue = Math.max(
    1,
    ...histogramData.counts.map(value => Number(value) || 0)
  );

  const histogramAxisMax = Math.max(
    5,
    Math.ceil(histogramMaxValue / 5) * 5
  );

  const histogramStartX = 55;
  const histogramAvailableWidth = 450;
  const histogramGap = 12;

  const histogramBarWidth = histogramData.labels.length > 0
    ? (
        histogramAvailableWidth -
        histogramGap * (histogramData.labels.length - 1)
      ) / histogramData.labels.length
    : 0;

  const histogramBins = histogramData.labels.map((label, index) => {
    const count = Number(histogramData.counts[index]) || 0;

    const height =
      (count / histogramAxisMax) * histogramHeight;

    return {
      bin: label,
      count,
      x: histogramStartX +
        index * (histogramBarWidth + histogramGap),
      y: histogramBottom - height,
      h: height,
      w: histogramBarWidth
    };
  });

  // ================= SUMMARY STATISTICS =================

  const trendStats = trendData.stats;
  const distributionStats = histogramData.stats;

  const backlogDirection = trendStats.net_backlog_direction?.toLowerCase();
  const backlogIsUp = backlogDirection === 'increased' || trendStats.net_backlog > 0;
  const backlogIsDown = backlogDirection === 'decreased' || trendStats.net_backlog < 0;
  const backlogArrow = backlogIsUp ? '▲' : backlogIsDown ? '▼' : '•';
  const backlogValue = trendStats.net_backlog > 0
    ? `+${trendStats.net_backlog}`
    : `${trendStats.net_backlog}`;

  const growthDirection = distributionStats.growth_direction?.toLowerCase();
  const growthIsUp = growthDirection === 'increased' || (growthDirection !== 'decreased' && distributionStats.growth_count > 0);
  const growthIsDown = growthDirection === 'decreased' || distributionStats.growth_count < 0;
  const growthArrow = growthIsUp ? '▲' : growthIsDown ? '▼' : '•';
  const growthValue = growthIsUp
    ? `+${Math.abs(distributionStats.growth_count)}`
    : growthIsDown
      ? `-${Math.abs(distributionStats.growth_count)}`
      : '0';

  const slowestTypeHours = distributionStats.average_resolution_by_type[
    distributionStats.slowest_to_resolve
  ];

  const formatHours = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value)
      ? `${value.toFixed(1)} hrs`
      : 'N/A';

  // ================= RENDER =================

  return (
    <div className="row g-3 h-100 flex-grow-1 min-h-0">

      {/* ================= 1. LINE CHART ================= */}

      <div className="col-12 col-lg-6 d-flex flex-column h-100 min-h-0">
        <div className="graph-card-reference d-flex flex-column h-100 min-h-0">

          {/* Header */}

          <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
            <div>
              <div className="d-flex align-items-center gap-1.5">
                <i className="bi bi-graph-up text-primary fs-6"></i>

                <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                  Incident Trends
                </h6>
              </div>

              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Open vs resolved incidents
              </small>
            </div>

            {/* Legend */}

            <div
              className="d-flex align-items-center gap-2 small px-2 py-1 rounded bg-light border"
              style={{ fontSize: '0.7rem' }}
            >
              <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#0D6EFD',
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}
                ></span>
                Open
              </span>

              <span className="text-muted">|</span>

              <span className="d-flex align-items-center gap-1 text-success fw-semibold">
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}
                ></span>
                Resolved
              </span>
            </div>
          </div>

          {/* Line Chart Canvas */}

          <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">

            {loading && (
              <div className="text-secondary small">
                <span className="spinner-border spinner-border-sm me-2"></span>
                Loading incident trends...
              </div>
            )}

            {!loading && error && (
              <div className="text-danger small">
                {error}
              </div>
            )}

            {!loading && !error && linePoints.length === 0 && (
              <div className="text-secondary small">
                No incident trend data available.
              </div>
            )}

            {!loading && !error && linePoints.length > 0 && (
              <svg
                viewBox="0 0 540 215"
                className="w-100 h-100"
                preserveAspectRatio="xMidYMid meet"
              >

                <defs>
                  <linearGradient id="lineBlueGradFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D6EFD" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#0D6EFD" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#0D6EFD" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Dynamic Gridlines & Y-axis Labels */}

                {Array.from({ length: 6 }, (_, i) => {
                  const y = 30 + i * 31;
                  const value = Math.round(maxValue * (5 - i) / 5);

                  return (
                    <g key={i}>
                      <line
                        x1="40"
                        y1={y}
                        x2="520"
                        y2={y}
                        stroke={i === 5 ? '#E2E8F0' : '#F1F5F9'}
                        strokeWidth={i === 5 ? '1.2' : '1'}
                      />

                      <text
                        x="32"
                        y={y + 4}
                        fill="#94A3B8"
                        fontSize="9"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* Area & Curves */}

                <path
                  d={areaReportedPath}
                  fill="url(#lineBlueGradFull)"
                />

                <path
                  d={lineReportedPath}
                  fill="none"
                  stroke="#0D6EFD"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d={lineResolvedPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}

                {linePoints.map((pt, i) => (
                  <g key={i}>

                    <circle
                      cx={pt.x}
                      cy={pt.yReported}
                      r="4"
                      fill="#0D6EFD"
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                      className="chart-point"
                      onMouseEnter={() =>
                        setLineTooltip({
                          x: pt.x,
                          y: pt.yReported,
                          label: pt.day,
                          reported: pt.reported,
                          resolved: pt.resolved
                        })
                      }
                      onMouseLeave={() => setLineTooltip(null)}
                    />

                    <circle
                      cx={pt.x}
                      cy={pt.yResolved}
                      r="3.5"
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                      className="chart-point"
                      onMouseEnter={() =>
                        setLineTooltip({
                          x: pt.x,
                          y: pt.yResolved,
                          label: pt.day,
                          reported: pt.reported,
                          resolved: pt.resolved
                        })
                      }
                      onMouseLeave={() => setLineTooltip(null)}
                    />

                    <text
                      x={pt.x}
                      y="202"
                      fill="#64748B"
                      fontSize="9.5"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {pt.day}
                    </text>

                  </g>
                ))}

                {/* Line Tooltip */}

                {lineTooltip && (
                  <g className="chart-tooltip">

                    <rect
                      x={Math.min(Math.max(lineTooltip.x - 55, 30), 425)}
                      y={Math.max(lineTooltip.y - 42, 6)}
                      width="110"
                      height="34"
                      rx="6"
                      fill="#0F172A"
                      opacity="0.95"
                    />

                    <text
                      x={Math.min(Math.max(lineTooltip.x, 85), 480)}
                      y={Math.max(lineTooltip.y - 27, 21)}
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lineTooltip.label} Incidents
                    </text>

                    <text
                      x={Math.min(Math.max(lineTooltip.x, 85), 480)}
                      y={Math.max(lineTooltip.y - 14, 34)}
                      fill="#93C5FD"
                      fontSize="8"
                      textAnchor="middle"
                    >
                      Open: {lineTooltip.reported} | Resolved: {lineTooltip.resolved}
                    </text>

                  </g>
                )}

              </svg>
            )}

          </div>

          {/* Line chart summary statistics */}
        <div className="insight-stats-footer">
          <div className="border-top mt-2 pt-2 px-1 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-1 small">
              <i className="bi bi-clock text-primary"></i>
              <span className="text-secondary">Peak Day:</span>
              <strong className="text-dark">
                {trendStats.peak_day || '—'}: {trendStats.peak_day_open_count} opened
              </strong>
            </div>

            <div className="d-flex align-items-center gap-1 small">
              <i className="bi bi-check-circle text-success"></i>
              <span className="text-secondary">Resolution Rate:</span>
              <strong className="text-dark">
                {trendStats.resolution_rate.toFixed(2)}%
                <span className="text-secondary fw-normal">
                  {' '}({trendStats.total_resolved} of {trendStats.total_logged})
                </span>
              </strong>
            </div>

            <div className="d-flex align-items-center gap-1 small">
              <i className={`bi bi-activity ${backlogIsUp ? 'text-danger' : backlogIsDown ? 'text-success' : 'text-secondary'}`}></i>
              <span className="text-secondary">Net Backlog:</span>
              <strong className={backlogIsUp ? 'text-danger' : backlogIsDown ? 'text-success' : 'text-secondary'}>
                {backlogArrow} {backlogValue} this week
              </strong>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* ================= 2. ISSUE TYPE DISTRIBUTION ================= */}

      <div className="col-12 col-lg-6 d-flex flex-column h-100 min-h-0">
        <div className="graph-card-reference d-flex flex-column h-100 min-h-0">

          {/* Header */}

          <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
            <div>
              <div className="d-flex align-items-center gap-1.5">
                <i className="bi bi-bar-chart-steps text-primary fs-6"></i>

                <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                  Issue Type Distribution
                </h6>
              </div>

              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Number of incidents by issue type
              </small>
            </div>
          </div>

          {/* Histogram Canvas */}

          <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">

            {/* Loading */}

            {histogramLoading && (
              <div className="text-secondary small">
                <span className="spinner-border spinner-border-sm me-2"></span>
                Loading issue type distribution...
              </div>
            )}

            {/* Error */}

            {!histogramLoading && histogramError && (
              <div className="text-danger small">
                {histogramError}
              </div>
            )}

            {/* Empty Data */}

            {!histogramLoading &&
              !histogramError &&
              histogramBins.length === 0 && (
                <div className="text-secondary small">
                  No issue type distribution data available.
                </div>
              )}

            {/* Dynamic Histogram */}

            {!histogramLoading &&
              !histogramError &&
              histogramBins.length > 0 && (
                <svg
                  viewBox="0 0 540 215"
                  className="w-100 h-100"
                  preserveAspectRatio="xMidYMid meet"
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

                  {/* Dynamic Gridlines and Y-axis Labels */}

                  {Array.from({ length: 6 }, (_, i) => {
                    const y =
                      histogramTop + i * (histogramHeight / 5);

                    const value = Math.round(
                      histogramAxisMax * (5 - i) / 5
                    );

                    return (
                      <g key={i}>
                        <line
                          x1="40"
                          y1={y}
                          x2="520"
                          y2={y}
                          stroke={i === 5 ? '#E2E8F0' : '#F1F5F9'}
                          strokeWidth={i === 5 ? '1.2' : '1'}
                        />

                        <text
                          x="32"
                          y={y + 4}
                          fill="#94A3B8"
                          fontSize="9"
                          textAnchor="end"
                        >
                          {value}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Histogram Bars */}

                  {histogramBins.map((bin, i) => {
                    const isPeak = bin.count === histogramMaxValue;

                    return (
                      <g key={i}>

                        {/* Bar */}

                        <rect
                          x={bin.x}
                          y={bin.y}
                          width={bin.w}
                          height={bin.h}
                          rx="4"
                          fill={isPeak ? 'url(#histPeakGrad)' : 'url(#histBarGrad)'}
                          fillOpacity={isPeak ? '0.95' : '0.85'}
                          stroke={isPeak ? '#0369A1' : '#1D4ED8'}
                          strokeWidth="1"
                          className="chart-bar"
                          onMouseEnter={() =>
                            setHistTooltip({
                              x: bin.x + bin.w / 2,
                              y: bin.y,
                              bin: bin.bin,
                              count: bin.count
                            })
                          }
                          onMouseLeave={() => setHistTooltip(null)}
                        />

                        {/* Count Label */}

                        <text
                          x={bin.x + bin.w / 2}
                          y={Math.max(bin.y - 8, 15)}
                          fill="#1E40AF"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {bin.count}
                        </text>

                        {/* Category Label */}

                        <text
                          x={bin.x + bin.w / 2}
                          y="201"
                          fill="#475569"
                          fontSize="10"
                          fontWeight={isPeak ? '700' : '500'}
                          textAnchor="middle"
                        >
                          {bin.bin}
                        </text>

                      </g>
                    );
                  })}

                  {/* Histogram Tooltip */}

                  {histTooltip && (
                    <g className="chart-tooltip">

                      <rect
                        x={Math.min(Math.max(histTooltip.x - 60, 40), 410)}
                        y={Math.max(histTooltip.y - 42, 6)}
                        width="120"
                        height="34"
                        rx="6"
                        fill="#0F172A"
                        opacity="0.95"
                      />

                      <text
                        x={Math.min(Math.max(histTooltip.x, 100), 470)}
                        y={Math.max(histTooltip.y - 27, 21)}
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {histTooltip.bin}
                      </text>

                      <text
                        x={Math.min(Math.max(histTooltip.x, 100), 470)}
                        y={Math.max(histTooltip.y - 14, 34)}
                        fill="#93C5FD"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        {histTooltip.count} incidents
                      </text>

                    </g>
                  )}

                </svg>
              )}

          </div>

          {/* Issue type distribution summary statistics */}
        <div className="insight-stats-footer">
          <div className="border-top mt-2 pt-2 px-1 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-1 small">
              <i className="bi bi-trophy text-primary"></i>
              <span className="text-secondary">Top Category:</span>
              <strong className="text-dark">
                {distributionStats.top_category || '—'}
                {`: ${distributionStats.top_category_percentage.toFixed(2)}%`}
              </strong>
            </div>

            <div className="d-flex align-items-center gap-1 small">
              <i className={`bi bi-graph-up-arrow ${growthIsUp ? 'text-danger' : growthIsDown ? 'text-success' : 'text-secondary'}`}></i>
              <span className="text-secondary">Fastest Growing:</span>
              <strong className={growthIsUp ? 'text-danger' : growthIsDown ? 'text-success' : 'text-secondary'}>
                {distributionStats.fastest_growing_type || '—'} {growthArrow} {growthValue} vs last week
              </strong>
            </div>

            <div className="d-flex align-items-center gap-1 small">
              <i className="bi bi-hourglass-split text-secondary"></i>
              <span className="text-secondary">Slowest to Resolve:</span>
              <strong className="text-dark">
                {distributionStats.slowest_to_resolve || '—'}: avg {formatHours(slowestTypeHours)}
              </strong>
            </div>
          </div>
        </div>

        </div>
      </div>

    </div>
  );
};
