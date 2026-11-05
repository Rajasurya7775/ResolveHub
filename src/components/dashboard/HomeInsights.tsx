import React, { useState } from 'react';

export const HomeInsights: React.FC = () => {
  // Hover Tooltip States
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
    pct: number;
  } | null>(null);

  // ================= 1. LINE CHART DATA (7-DAY TRAJECTORY) =================
  const linePoints = [
    { day: 'Wed', reported: 2, resolved: 2, x: 55, yReported: 154, yResolved: 154 },
    { day: 'Thu', reported: 3, resolved: 3, x: 130, yReported: 138.5, yResolved: 138.5 },
    { day: 'Fri', reported: 4, resolved: 3, x: 205, yReported: 123, yResolved: 138.5 },
    { day: 'Sat', reported: 2, resolved: 2, x: 280, yReported: 154, yResolved: 154 },
    { day: 'Sun', reported: 5, resolved: 4, x: 355, yReported: 107.5, yResolved: 123 },
    { day: 'Mon', reported: 3, resolved: 2, x: 430, yReported: 138.5, yResolved: 154 },
    { day: 'Today', reported: 8, resolved: 3, x: 505, yReported: 61, yResolved: 138.5 }
  ];

  const lineReportedPath = "M 55 154 L 130 138.5 L 205 123 L 280 154 L 355 107.5 L 430 138.5 L 505 61";
  const lineResolvedPath = "M 55 154 L 130 138.5 L 205 138.5 L 280 154 L 355 123 L 430 154 L 505 138.5";
  const areaReportedPath = `${lineReportedPath} L 505 185 L 55 185 Z`;

  // ================= 2. HISTOGRAM DATA (RESOLUTION DURATION INTERVALS) =================
  // Total tickets evaluated: 27
  const histogramBins = [
    { bin: '< 1 hr', count: 3, pct: 11, x: 55, y: 138.5, h: 46.5, w: 64 },
    { bin: '1 - 2 hrs', count: 6, pct: 22, x: 125, y: 92, h: 93, w: 64 },
    { bin: '2 - 4 hrs', count: 9, pct: 33, x: 195, y: 45.5, h: 139.5, w: 64 },
    { bin: '4 - 8 hrs', count: 5, pct: 19, x: 265, y: 107.5, h: 77.5, w: 64 },
    { bin: '8 - 12 hrs', count: 3, pct: 11, x: 335, y: 138.5, h: 46.5, w: 64 },
    { bin: '> 12 hrs', count: 1, pct: 4, x: 405, y: 169.5, h: 15.5, w: 64 }
  ];

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
                  Incident Volume & Resolution Velocity (Line)
                </h6>
              </div>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                7-day trajectory of reported vs resolved incidents
              </small>
            </div>

            {/* Legend & Trend Badge */}
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center gap-2 small px-2 py-1 rounded bg-light border" style={{ fontSize: '0.7rem' }}>
                <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#0D6EFD', borderRadius: '50%', display: 'inline-block' }}></span>
                  Reported
                </span>
                <span className="text-muted">|</span>
                <span className="d-flex align-items-center gap-1 text-success fw-semibold">
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block' }}></span>
                  Resolved
                </span>
              </div>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-arrow-up-right me-0.5"></i>+24% WoW
              </span>
            </div>
          </div>

          {/* SVG Canvas - Auto fills available height */}
          <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">
            <svg viewBox="0 0 540 215" className="w-100 h-100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="lineBlueGradFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D6EFD" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#0D6EFD" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0D6EFD" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="40" y1="30" x2="520" y2="30" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="61" x2="520" y2="61" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="92" x2="520" y2="92" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="123" x2="520" y2="123" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="154" x2="520" y2="154" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="185" x2="520" y2="185" stroke="#E2E8F0" strokeWidth="1.2" />

              {/* Y-axis Ticks */}
              <text x="32" y="34" fill="#94A3B8" fontSize="9" textAnchor="end">10</text>
              <text x="32" y="65" fill="#94A3B8" fontSize="9" textAnchor="end">8</text>
              <text x="32" y="96" fill="#94A3B8" fontSize="9" textAnchor="end">6</text>
              <text x="32" y="127" fill="#94A3B8" fontSize="9" textAnchor="end">4</text>
              <text x="32" y="158" fill="#94A3B8" fontSize="9" textAnchor="end">2</text>
              <text x="32" y="188" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

              {/* Area & Curves */}
              <path d={areaReportedPath} fill="url(#lineBlueGradFull)" />
              <path d={lineReportedPath} fill="none" stroke="#0D6EFD" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d={lineResolvedPath} fill="none" stroke="#10B981" strokeWidth="2.2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points */}
              {linePoints.map((pt, i) => (
                <g key={i}>
                  {/* Reported Dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.yReported}
                    r="4"
                    fill="#0D6EFD"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    className="chart-point"
                    onMouseEnter={() => setLineTooltip({ x: pt.x, y: pt.yReported, label: pt.day, reported: pt.reported, resolved: pt.resolved })}
                    onMouseLeave={() => setLineTooltip(null)}
                  />
                  {/* Resolved Dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.yResolved}
                    r="3.5"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    className="chart-point"
                    onMouseEnter={() => setLineTooltip({ x: pt.x, y: pt.yReported, label: pt.day, reported: pt.reported, resolved: pt.resolved })}
                    onMouseLeave={() => setLineTooltip(null)}
                  />
                  {/* X-axis Label */}
                  <text
                    x={pt.x}
                    y="202"
                    fill={pt.day === 'Today' ? '#0D6EFD' : '#64748B'}
                    fontSize="9.5"
                    textAnchor="middle"
                    fontWeight={pt.day === 'Today' ? '700' : '500'}
                  >
                    {pt.day}
                  </text>
                </g>
              ))}

              {/* Tooltip Overlay */}
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
                    Reported: {lineTooltip.reported} | Resolved: {lineTooltip.resolved}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Footer Metric Strip */}
          <div className="d-flex align-items-center justify-content-between pt-1 border-top border-light-subtle flex-shrink-0" style={{ fontSize: '0.72rem' }}>
            <span className="text-secondary">
              <i className="bi bi-clock-history me-1 text-primary"></i>Avg. Response: <strong className="text-navy">18 mins</strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-check2-circle me-1 text-success"></i>Resolution Rate: <strong className="text-navy">75.0%</strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-activity me-1 text-primary"></i>Velocity: <strong className="text-success">Normal Load</strong>
            </span>
          </div>

        </div>
      </div>

      {/* ================= 2. HISTOGRAM ================= */}
      <div className="col-12 col-lg-6 d-flex flex-column h-100 min-h-0">
        <div className="graph-card-reference d-flex flex-column h-100 min-h-0">
          
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-1 flex-shrink-0">
            <div>
              <div className="d-flex align-items-center gap-1.5">
                <i className="bi bi-bar-chart-steps text-primary fs-6"></i>
                <h6 className="fw-bold text-navy mb-0" style={{ fontSize: '0.92rem' }}>
                  Incident Resolution Time (Histogram)
                </h6>
              </div>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                Frequency distribution of resolution duration across time intervals
              </small>
            </div>

            {/* MTTR Badge */}
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success rounded-pill px-2.5 py-1 fw-semibold small" style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-shield-check me-1"></i>Median MTTR: 3.4 hrs
              </span>
              <span className="badge bg-light text-navy border rounded-pill px-2 py-1 fw-medium small" style={{ fontSize: '0.7rem' }}>
                27 Tickets Evaluated
              </span>
            </div>
          </div>

          {/* Histogram SVG Canvas */}
          <div className="position-relative flex-grow-1 w-100 d-flex align-items-center justify-content-center min-h-0 py-1">
            <svg viewBox="0 0 540 215" className="w-100 h-100" preserveAspectRatio="xMidYMid meet">
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
              <line x1="40" y1="65" x2="520" y2="65" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="105" x2="520" y2="105" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="145" x2="520" y2="145" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="185" x2="520" y2="185" stroke="#E2E8F0" strokeWidth="1.2" />

              {/* Y-axis frequency labels */}
              <text x="32" y="34" fill="#94A3B8" fontSize="9" textAnchor="end">10</text>
              <text x="32" y="69" fill="#94A3B8" fontSize="9" textAnchor="end">8</text>
              <text x="32" y="109" fill="#94A3B8" fontSize="9" textAnchor="end">5</text>
              <text x="32" y="149" fill="#94A3B8" fontSize="9" textAnchor="end">2</text>
              <text x="32" y="188" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

              {/* Histogram Bins */}
              {histogramBins.map((bin, i) => {
                const isPeak = bin.count === 9;
                return (
                  <g key={i}>
                    {/* Frequency Column */}
                    <rect
                      x={bin.x}
                      y={bin.y}
                      width={bin.w}
                      height={bin.h}
                      rx="4"
                      fill={isPeak ? "url(#histPeakGrad)" : "url(#histBarGrad)"}
                      fillOpacity={isPeak ? "0.95" : "0.85"}
                      stroke={isPeak ? "#0369A1" : "#1D4ED8"}
                      strokeWidth="1"
                      className="chart-bar"
                      onMouseEnter={() => setHistTooltip({ x: bin.x + bin.w / 2, y: bin.y, bin: bin.bin, count: bin.count, pct: bin.pct })}
                      onMouseLeave={() => setHistTooltip(null)}
                    />

                    {/* Frequency Count Pill over bar */}
                    <rect
                      x={bin.x + (bin.w - 24) / 2}
                      y={bin.y - 16}
                      width="24"
                      height="13"
                      rx="3"
                      fill="#EFF6FF"
                      stroke="#BFDBFE"
                      strokeWidth="0.8"
                    />
                    <text
                      x={bin.x + bin.w / 2}
                      y={bin.y - 6}
                      fill="#1E40AF"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {bin.count}
                    </text>

                    {/* X-axis bin interval label */}
                    <text
                      x={bin.x + bin.w / 2}
                      y="201"
                      fill="#475569"
                      fontSize="9"
                      fontWeight={isPeak ? '700' : '500'}
                      textAnchor="middle"
                    >
                      {bin.bin}
                    </text>
                  </g>
                );
              })}

              {/* Normal Distribution Curve Overlay */}
              <path
                d="M 87 140 Q 160 65 227 40 Q 295 65 367 140 L 437 170"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="4 3"
              />

              {/* Tooltip Overlay */}
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
                    Duration: {histTooltip.bin}
                  </text>
                  <text
                    x={Math.min(Math.max(histTooltip.x, 100), 470)}
                    y={Math.max(histTooltip.y - 14, 34)}
                    fill="#93C5FD"
                    fontSize="8"
                    textAnchor="middle"
                  >
                    {histTooltip.count} tickets ({histTooltip.pct}% of total)
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Footer Metric Strip */}
          <div className="d-flex align-items-center justify-content-between pt-1 border-top border-light-subtle flex-shrink-0" style={{ fontSize: '0.72rem' }}>
            <span className="text-secondary">
              <i className="bi bi-bullseye me-1 text-primary"></i>Peak Window: <strong className="text-navy">2 - 4 hrs (33%)</strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-patch-check-fill me-1 text-success"></i>SLA Met (&lt;4h): <strong className="text-navy">94.2%</strong>
            </span>
            <span className="text-secondary">
              <i className="bi bi-info-circle me-1 text-secondary"></i>Outliers (&gt;12h): <strong className="text-warning">1 ticket</strong>
            </span>
          </div>

        </div>
      </div>

    </div>
  );
};
