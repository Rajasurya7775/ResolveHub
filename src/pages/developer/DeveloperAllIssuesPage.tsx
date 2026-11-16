import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIssues } from '../../context/IssueContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { Issue } from '../../types/issue';
import { exportIssuesToCsv } from '../../utils/exportUtils';
import { apiFetchPreviousIssuesProjects } from '../../services/api/issueService';

export const DeveloperAllIssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { issues, previousIssues, myIssues, isLoading, refreshIssues } = useIssues();

  // Dynamic projects
  const [projectOptions, setProjectOptions] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiFetchPreviousIssuesProjects().then((res) => {
      if (isMounted && res.success && res.data.length > 0) {
        setProjectOptions(res.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Always refresh on mount
  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  // The 6 Filters:
  // 1. Issue ID / Title
  const [searchTerm, setSearchTerm] = useState('');
  // 2. Project
  const [projectFilter, setProjectFilter] = useState<string>('All');
  // 3. Issue Type
  const [typeFilter, setTypeFilter] = useState<string>('All');
  // 4. Date
  const [dateFilter, setDateFilter] = useState('');
  // 5. Shift
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  // 6. Status
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Combine all accessible issues across lists
  const allIssues = useMemo(() => {
    const map = new Map<string, Issue>();
    [...issues, ...myIssues, ...previousIssues].forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [issues, myIssues, previousIssues]);

  // Combined Filters Logic
  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        issue.id.toLowerCase().includes(searchLower) ||
        issue.title.toLowerCase().includes(searchLower);

      const matchProject = projectFilter === 'All' || issue.projectId === projectFilter;
      const matchType = typeFilter === 'All' || issue.issueType === typeFilter;
      const matchDate =
        !dateFilter ||
        issue.reportedDate === dateFilter ||
        issue.occurrenceTime.includes(dateFilter);
      const matchShift = shiftFilter === 'All' || issue.shift === shiftFilter;
      const matchStatus = statusFilter === 'All' || issue.status === statusFilter;

      return matchSearch && matchProject && matchType && matchDate && matchShift && matchStatus;
    });
  }, [allIssues, searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter]);

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage) || 1;
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setProjectFilter('All');
    setTypeFilter('All');
    setDateFilter('');
    setShiftFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  return (
    <div className="d-flex flex-column h-100 min-h-0">
      
      {/* ================= 6 SPECIFIED FILTERS BAR ================= */}
      <div className="bg-white rounded-3 border border-light-subtle shadow-sm p-2.5 mb-2.5 flex-shrink-0">
        <div className="row g-2.5 align-items-end">
          
          {/* Filter 1: Issue ID / Title */}
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="filter-label-sm">
              1. Issue ID / Title
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-muted border-end-0 py-1" style={{ borderRadius: '8px 0 0 8px' }}>
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control filter-control-sm border-start-0"
                style={{ borderRadius: '0 8px 8px 0' }}
                placeholder="Search ID or Title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Filter 2: Project */}
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="filter-label-sm">
              2. Project
            </label>
            <select
              className="form-select filter-control-sm"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Projects</option>
              {projectOptions.length > 0 ? (
                projectOptions.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))
              ) : (
                <>
                  <option value="Nokia Production Dashboard">Nokia Production</option>
                  <option value="Manufacturing Analytics">Manufacturing</option>
                  <option value="Inventory Monitoring">Inventory</option>
                  <option value="Network Monitoring">Network</option>
                </>
              )}
            </select>
          </div>

          {/* Filter 3: Issue Type */}
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="filter-label-sm">
              3. Issue Type
            </label>
            <select
              className="form-select filter-control-sm"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Types</option>
              <option value="Front-end">Front-end</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="Hardware">Hardware</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Filter 4: Date */}
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="filter-label-sm">
              4. Date
            </label>
            <input
              type="date"
              className="form-control filter-control-sm"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter 5: Shift */}
          <div className="col-6 col-sm-4 col-lg-1" style={{ minWidth: '95px' }}>
            <label className="filter-label-sm">
              5. Shift
            </label>
            <select
              className="form-select filter-control-sm"
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Shift-A">Shift-A</option>
              <option value="Shift-B">Shift-B</option>
              <option value="Shift-C">Shift-C</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Filter 6: Status */}
          <div className="col-6 col-sm-4 col-lg-1" style={{ minWidth: '95px' }}>
            <label className="filter-label-sm">
              6. Status
            </label>
            <select
              className="form-select filter-control-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="In progress">In Prog</option>
              <option value="On Hold">Hold</option>
              <option value="Pending">Pending</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-12 col-sm-4 col-lg-1 d-flex align-items-end" style={{ minWidth: '85px' }}>
            <button
              type="button"
              className="btn btn-outline-secondary w-100 filter-control-sm d-flex align-items-center justify-content-center gap-1"
              title="Reset all filters"
              onClick={handleClearFilters}
            >
              <i className="bi bi-x-circle"></i>
              <span>Clear</span>
            </button>
          </div>

        </div>
      </div>

      {/* ================= MAIN ALL ISSUES TABLE ================= */}
      <div className="fixed-table-card flex-grow-1 min-h-0">
        
        {/* Sub-header info bar */}
        <div className="px-3 py-1.5 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-semibold text-navy">
              All Accessible Incidents
            </span>
            <span className="badge bg-primary text-white rounded-pill" style={{ fontSize: '0.68rem' }}>
              {filteredIssues.length} of {allIssues.length} issues
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted d-none d-md-inline" style={{ fontSize: '0.72rem' }}>
              Logged in: <strong className="text-navy">{currentUser?.name}</strong> ({currentUser?.employeeId})
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0.5 px-2 rounded-2 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.74rem' }}
              onClick={() => refreshIssues()}
              disabled={isLoading}
              title="Refresh all issues"
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spinner-border spinner-border-sm' : ''}`}></i>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success py-0.5 px-2 rounded-2 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.74rem' }}
              onClick={() => exportIssuesToCsv(filteredIssues, `all_issues_${currentUser?.employeeId || 'dev'}.csv`)}
              title="Export all issues to CSV"
              disabled={filteredIssues.length === 0}
            >
              <i className="bi bi-file-earmark-spreadsheet"></i>
              Export CSV
            </button>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="table-scroll-area">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
              <tr className="small text-muted text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                <th style={{ minWidth: '95px', width: '95px' }}>Issue ID</th>
                <th style={{ minWidth: '150px' }}>Project</th>
                <th style={{ minWidth: '170px' }}>Issue Title</th>
                <th style={{ minWidth: '220px', maxWidth: '300px' }}>Short Description</th>
                <th style={{ minWidth: '105px' }}>Type</th>
                <th style={{ minWidth: '90px' }}>Shift</th>
                <th style={{ minWidth: '110px' }}>Reported Date</th>
                <th style={{ minWidth: '140px' }}>Assigned To</th>
                <th style={{ minWidth: '115px' }}>Status</th>
                <th className="text-end" style={{ minWidth: '95px', width: '95px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading all incidents...
                  </td>
                </tr>
              ) : paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-1 text-secondary opacity-50"></i>
                    No issues found matching your selected filters.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/issues/${issue.id}`, { state: { from: 'developer-all', issue } })}
                  >
                    <td className="fw-bold text-primary small">{issue.id}</td>
                    <td className="small text-navy fw-medium">{issue.projectName || issue.projectId}</td>
                    <td className="fw-semibold text-navy small">{issue.title}</td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: '240px' }}>
                      {issue.shortDescription}
                    </td>
                    <td>
                      <span className="badge bg-light text-secondary border small" style={{ fontSize: '0.7rem' }}>
                        {issue.issueType}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-navy border small" style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-clock me-1 text-primary"></i>
                        {issue.shift || 'Shift-A'}
                      </span>
                    </td>
                    <td className="small text-muted" style={{ fontSize: '0.78rem' }}>{issue.reportedDate}</td>
                    <td className="small">
                      {issue.acceptedDeveloper === 'Unassigned' ? (
                        <span className="text-muted fst-italic">Unassigned</span>
                      ) : (
                        <span className="fw-semibold text-navy">
                          <i className="bi bi-person-check text-primary me-1"></i>
                          {issue.acceptedDeveloper}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={issue.status} size="sm" />
                    </td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border text-primary py-0.5 px-2 rounded-2"
                        title="View Details & Chat"
                        onClick={() => navigate(`/issues/${issue.id}`, { state: { from: 'developer-all', issue } })}
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pinned Reusable Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredIssues.length}
          pageSize={itemsPerPage}
          hasNext={currentPage < totalPages}
          hasPrevious={currentPage > 1}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
        />

      </div>

    </div>
  );
};
export default DeveloperAllIssuesPage;

