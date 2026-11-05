import React, { useState, useMemo } from 'react';
import { useIssues } from '../../context/IssueContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { IssueDetailsModal } from './IssueDetailsModal';
import { Issue } from '../../types/issue';
import { ShiftType } from '../../types/user';

export const MyIssuesPage: React.FC = () => {
  const { issues, deleteIssue } = useIssues();
  const { currentUser } = useAuth();

  // The 6 Specified Filters:
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

  // Selected Issue for Modal
  const [activeModalIssue, setActiveModalIssue] = useState<Issue | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // DISPLAY ONLY ISSUES CREATED BY LOGGED-IN SUPPORTER
  const supporterOnlyIssues = useMemo(() => {
    return issues.filter(
      (i) => i.reportedById === currentUser?.employeeId || i.reportedBy === currentUser?.name
    );
  }, [issues, currentUser]);

  // Combined Filters Logic
  const filteredIssues = useMemo(() => {
    return supporterOnlyIssues.filter((issue) => {
      // 1. Issue ID / Title search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        issue.id.toLowerCase().includes(searchLower) ||
        issue.title.toLowerCase().includes(searchLower);

      // 2. Project filter
      const matchProject = projectFilter === 'All' || issue.projectId === projectFilter;

      // 3. Issue Type filter
      const matchType = typeFilter === 'All' || issue.issueType === typeFilter;

      // 4. Date filter
      const matchDate =
        !dateFilter ||
        issue.reportedDate === dateFilter ||
        issue.occurrenceTime.includes(dateFilter);

      // 5. Shift filter
      const matchShift = shiftFilter === 'All' || issue.shift === (shiftFilter as ShiftType);

      // 6. Status filter
      const matchStatus = statusFilter === 'All' || issue.status === statusFilter;

      return matchSearch && matchProject && matchType && matchDate && matchShift && matchStatus;
    });
  }, [supporterOnlyIssues, searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter]);

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

  const handleDelete = (issue: Issue) => {
    if (window.confirm(`Are you sure you want to delete ${issue.id}: "${issue.title}"?`)) {
      const ok = deleteIssue(issue.id);
      if (!ok) {
        alert('This issue cannot be deleted because it is no longer in Open status.');
      }
    }
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      
      {/* ================= 6 SPECIFIED FILTERS BAR ================= */}
      <div className="bg-white rounded-3 border border-light-subtle shadow-sm p-2 mb-2 flex-shrink-0">
        <div className="row g-2 align-items-end">
          
          {/* Filter 1: Issue ID / Title */}
          <div className="col-12 col-md-3">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              1. Issue ID / Title
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-muted border-end-0 py-0.5">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0 py-1"
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
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              2. Project
            </label>
            <select
              className="form-select form-select-sm py-1"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Projects</option>
              <option value="Nokia Production Dashboard">Nokia Production</option>
              <option value="Manufacturing Analytics">Manufacturing</option>
              <option value="Inventory Monitoring">Inventory</option>
              <option value="Network Monitoring">Network</option>
            </select>
          </div>

          {/* Filter 3: Issue Type */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              3. Issue Type
            </label>
            <select
              className="form-select form-select-sm py-1"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Types</option>
              <option value="Production Issue">Production</option>
              <option value="Dashboard Issue">Dashboard</option>
              <option value="Network Issue">Network</option>
              <option value="Application Issue">Application</option>
              <option value="Hardware Issue">Hardware</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Filter 4: Date */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              4. Date
            </label>
            <input
              type="date"
              className="form-control form-control-sm py-1"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter 5: Shift */}
          <div className="col-6 col-md-1">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              5. Shift
            </label>
            <select
              className="form-select form-select-sm py-1 border-primary-subtle"
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Shift A">Shift A</option>
              <option value="Shift B">Shift B</option>
              <option value="Shift C">Shift C</option>
            </select>
          </div>

          {/* Filter 6: Status */}
          <div className="col-6 col-md-1">
            <label className="form-label small fw-semibold text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>
              6. Status
            </label>
            <select
              className="form-select form-select-sm py-1"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Prog</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-6 col-md-1 text-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100 py-1"
              title="Reset all filters"
              onClick={handleClearFilters}
            >
              <i className="bi bi-x-circle me-1"></i>Clear
            </button>
          </div>

        </div>
      </div>

      {/* ================= MAIN MY ISSUES TABLE ================= */}
      <div className="fixed-table-card flex-grow-1 min-h-0">
        
        {/* Sub-header info bar */}
        <div className="px-3 py-1.5 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <div className="small fw-semibold text-navy">
            My Reported Issues
            <span className="badge bg-primary text-white rounded-pill ms-2" style={{ fontSize: '0.68rem' }}>
              {filteredIssues.length} of {supporterOnlyIssues.length} issues
            </span>
          </div>

          <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
            Logged by: <strong className="text-navy">{currentUser?.name}</strong> ({currentUser?.employeeId})
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="table-scroll-area">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
              <tr className="small text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                <th style={{ width: '95px' }}>Issue ID</th>
                <th>Project</th>
                <th>Issue Title</th>
                <th style={{ maxWidth: '240px' }}>Short Description</th>
                <th>Type</th>
                <th>Shift</th>
                <th>Reported Date</th>
                <th>Developer</th>
                <th>Status</th>
                <th className="text-end" style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIssues.length === 0 ? (
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
                    onClick={() => setActiveModalIssue(issue)}
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
                          onClick={() => setActiveModalIssue(issue)}
                        >
                          <i className="bi bi-eye"></i>
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

        {/* Pinned Pagination at Bottom */}
        <div className="px-3 py-1.5 border-top bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <span className="small text-muted" style={{ fontSize: '0.74rem' }}>
            Showing {paginatedIssues.length} of {filteredIssues.length} issues (Page {currentPage} of {totalPages})
          </span>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary py-0.5 px-2.5"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary py-0.5 px-2.5"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Details & 2-Way Chat Modal */}
      {activeModalIssue && (
        <IssueDetailsModal
          issue={activeModalIssue}
          onClose={() => setActiveModalIssue(null)}
        />
      )}

    </div>
  );
};
