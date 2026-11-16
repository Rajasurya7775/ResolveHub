import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { Issue } from '../../types/issue';
import { exportIssuesToCsv } from '../../utils/exportUtils';
import {
  apiFetchMyIssues,
  apiFetchMyIssuesProjects
} from '../../services/api/issueService';

export const MyIssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { deleteIssue } = useIssues();
  const { currentUser } = useAuth();

  // Pagination state (default: 10 issues per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalIssues, setTotalIssues] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dynamic projects fetched from /api/v1/my-issues/projects
  const [projectOptions, setProjectOptions] = useState<string[]>([]);

  // The 6 Specified Filters:
  // 1. Issue ID / Title
  const [searchTerm, setSearchTerm] = useState<string>('');
  // 2. Project
  const [projectFilter, setProjectFilter] = useState<string>('All');
  // 3. Issue Type
  const [typeFilter, setTypeFilter] = useState<string>('All');
  // 4. Date
  const [dateFilter, setDateFilter] = useState<string>('');
  // 5. Shift
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  // 6. Status
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Load project names on mount from /api/v1/my-issues/projects
  useEffect(() => {
    let isMounted = true;
    apiFetchMyIssuesProjects().then((res) => {
      if (isMounted && res.success && res.data.length > 0) {
        setProjectOptions(res.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch paginated data from backend API matching PreviousIssuesPage structure
  const fetchPageData = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);
      setApiError(null);

      const res = await apiFetchMyIssues({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        project: projectFilter !== 'All' ? projectFilter : undefined,
        issueType: typeFilter !== 'All' ? typeFilter : undefined,
        date: dateFilter || undefined,
        shift: shiftFilter !== 'All' ? shiftFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined
      });

      setIsLoading(false);

      if (res.success && res.data) {
        const { items, pagination } = res.data;
        const total = pagination?.total_items ?? res.data.total ?? items.length;
        const pages = pagination?.total_pages ?? res.data.totalPages ?? 1;
        const cur = pagination?.current_page ?? res.data.page ?? pageToLoad;
        const next = pagination?.has_next ?? res.data.hasNext ?? false;
        const prev = pagination?.has_previous ?? res.data.hasPrevious ?? false;

        setIssues(items);
        setTotalIssues(total);
        setTotalPages(pages);
        setCurrentPage(cur);
        setHasNext(next);
        setHasPrevious(prev);
      } else {
        setIssues([]);
        setTotalIssues(0);
        setTotalPages(1);
        setHasNext(false);
        setHasPrevious(false);
        setApiError(res.message || 'Failed to fetch My Issues from backend API.');
      }
    },
    [PAGE_SIZE, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter, searchTerm]
  );

  // Trigger fetch with debounce when filters change: reset page to 1
  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      fetchPageData(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter, fetchPageData]);

  // Handle page click: fetch requested page from backend API
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || (totalPages > 0 && newPage > totalPages)) return;
    setCurrentPage(newPage);
    fetchPageData(newPage);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setProjectFilter('All');
    setTypeFilter('All');
    setDateFilter('');
    setShiftFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const handleDelete = async (issue: Issue) => {
    if (window.confirm(`Are you sure you want to delete ${issue.id}: "${issue.title}"?`)) {
      const ok = await deleteIssue(issue.id);
      if (ok) {
        fetchPageData(currentPage);
      } else {
        alert('This issue cannot be deleted because it is no longer in Open status.');
      }
    }
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => setProjectFilter(e.target.value)}
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
              onChange={(e) => setTypeFilter(e.target.value)}
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
              onChange={(e) => setDateFilter(e.target.value)}
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
              onChange={(e) => setShiftFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
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

      {/* API Connection Warning / Retry Alert */}
      {apiError && (
        <div className="alert alert-warning py-1.5 px-3 small rounded-3 d-flex align-items-center justify-content-between mb-2 flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-warning fs-6"></i>
            <span>{apiError}</span>
          </div>
          <button className="btn btn-sm btn-outline-dark py-0 px-2" onClick={() => fetchPageData(currentPage)}>
            Retry API
          </button>
        </div>
      )}

      {/* ================= MAIN MY ISSUES TABLE ================= */}
      <div className="fixed-table-card flex-grow-1 min-h-0">
        
        {/* Sub-header info bar */}
        <div className="px-3 py-1.5 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-semibold text-navy">
              My Reported Issues
            </span>
            <span className="badge bg-primary text-white rounded-pill" style={{ fontSize: '0.68rem' }}>
              {totalIssues} total issues
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
              onClick={() => fetchPageData(currentPage)}
              disabled={isLoading}
              title="Refresh from /my-issues/ endpoint"
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spinner-border spinner-border-sm' : ''}`}></i>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success py-0.5 px-2 rounded-2 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.74rem' }}
              onClick={() => exportIssuesToCsv(issues, `my_issues_${currentUser?.employeeId || 'export'}.csv`)}
              title="Export displayed issues to CSV"
              disabled={issues.length === 0}
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
                <th style={{ minWidth: '140px' }}>Developer</th>
                <th style={{ minWidth: '115px' }}>Status</th>
                <th className="text-end" style={{ minWidth: '95px', width: '95px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading my issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-1 text-secondary opacity-50"></i>
                    No issues found matching your selected filters.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr
                    key={issue.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/issues/${issue.id}`, { state: { from: 'my-issues', issue } })}
                  >
                    <td className="fw-bold text-primary small">{issue.id}</td>
                    <td className="small text-navy fw-medium">{issue.projectId}</td>
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
                        {issue.shift || 'Shift A'}
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
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-light border text-primary py-0.5 px-2"
                          title="View Details & Chat"
                          onClick={() => navigate(`/issues/${issue.id}`, { state: { from: 'my-issues', issue } })}
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>Details
                        </button>
                        {issue.isEligibleForDelete && issue.status === 'Open' && (
                          <button
                            type="button"
                            className="btn btn-light border text-danger py-0.5 px-2"
                            title="Delete Issue"
                            onClick={() => handleDelete(issue)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>
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
          totalItems={totalIssues}
          pageSize={PAGE_SIZE}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />

      </div>

    </div>
  );
};

// Aliases for compatibility
export const SupportMyIssuesPage = MyIssuesPage;
export default MyIssuesPage;
