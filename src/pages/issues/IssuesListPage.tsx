import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleConfig, resolveRoleKey } from '../../config/roleConfig';
import { IssueTableFilters } from '../../components/issues/IssueTableFilters';
import { IssueTable } from '../../components/issues/IssueTable';
import { Pagination } from '../../components/common/Pagination';
import { Issue } from '../../types/issue';
import { exportIssuesToCsv } from '../../utils/exportUtils';
import {
  apiFetchMyIssues,
  apiFetchPreviousIssues,
  apiFetchMyIssuesProjects,
  apiFetchPreviousIssuesProjects
} from '../../services/api/issueService';

export interface IssuesListPageProps {
  scope: 'my-issues' | 'previous-issues';
}

export const IssuesListPage: React.FC<IssuesListPageProps> = ({ scope }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const effectiveRole = resolveRoleKey(currentUser?.role);
  const roleConfig = getRoleConfig(effectiveRole);
  const tableConfig = scope === 'my-issues' ? roleConfig.tables.primary : roleConfig.tables.secondary;

  const PAGE_SIZE = 10;

  const parsePositivePage = (val: string | null): number => {
    const n = Number(val);
    return Number.isInteger(n) && n >= 1 ? n : 1;
  };

  // Initialize state from URL query params so browser Back (navigate(-1)) preserves everything
  const [currentPage, setCurrentPage] = useState<number>(() => parsePositivePage(searchParams.get('page')));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalIssues, setTotalIssues] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);

  // The 6 Specified Filters
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('search') || '');
  const [projectFilter, setProjectFilter] = useState<string>(() => searchParams.get('project') || 'All');
  const [typeFilter, setTypeFilter] = useState<string>(() => searchParams.get('type') || 'All');
  const [dateFilter, setDateFilter] = useState<string>(() => searchParams.get('date') || '');
  const [shiftFilter, setShiftFilter] = useState<string>(() => searchParams.get('shift') || 'All');
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') || 'All');

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const isFirstRenderRef = useRef<boolean>(true);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const lastWrittenSearchRef = useRef<string>(location.search);

  const buildQueryString = useCallback(
    (
      pageVal: number,
      searchVal: string,
      projectVal: string,
      typeVal: string,
      dateVal: string,
      shiftVal: string,
      statusVal: string
    ) => {
      const next = new URLSearchParams();
      if (searchVal.trim()) next.set('search', searchVal);
      if (projectVal !== 'All') next.set('project', projectVal);
      if (typeVal !== 'All') next.set('type', typeVal);
      if (dateVal) next.set('date', dateVal);
      if (shiftVal !== 'All') next.set('shift', shiftVal);
      if (statusVal !== 'All') next.set('status', statusVal);
      if (pageVal > 1) next.set('page', String(pageVal));
      return next;
    },
    []
  );

  // Sync URL searchParams when filters or page change
  const syncParamsToUrl = useCallback(
    (
      pageVal: number,
      searchVal: string,
      projectVal: string,
      typeVal: string,
      dateVal: string,
      shiftVal: string,
      statusVal: string
    ) => {
      const next = buildQueryString(pageVal, searchVal, projectVal, typeVal, dateVal, shiftVal, statusVal);
      const nextStr = next.toString();
      lastWrittenSearchRef.current = nextStr ? `?${nextStr}` : '';
      setSearchParams(next, { replace: true });
    },
    [buildQueryString, setSearchParams]
  );

  // Handle external navigation (e.g. Sidebar click resetting URL or browser back/forward)
  useEffect(() => {
    if (location.search === lastWrittenSearchRef.current) return;
    lastWrittenSearchRef.current = location.search;

    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setProjectFilter(params.get('project') || 'All');
    setTypeFilter(params.get('type') || 'All');
    setDateFilter(params.get('date') || '');
    setShiftFilter(params.get('shift') || 'All');
    setStatusFilter(params.get('status') || 'All');
    setCurrentPage(parsePositivePage(params.get('page')));
  }, [location.search]);

  // Check if a saved scroll position exists for this route/filter state on mount
  useEffect(() => {
    const scrollKey = `resolvehub_list_scroll_${location.pathname}${location.search}`;
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll !== null) {
      const parsed = Number(savedScroll);
      if (Number.isFinite(parsed) && parsed > 0) {
        pendingScrollRestoreRef.current = parsed;
      } else {
        sessionStorage.removeItem(scrollKey);
      }
    }
  }, [location.pathname, location.search]);

  // Load project options for dropdown filter
  useEffect(() => {
    let isMounted = true;
    const fetchProjects = scope === 'my-issues' ? apiFetchMyIssuesProjects : apiFetchPreviousIssuesProjects;
    fetchProjects().then((res) => {
      if (isMounted && res.success && res.data.length > 0) {
        const sanitized = res.data
          .map((p: any) => (typeof p === 'string' ? p : p?.project_name || p?.name || String(p?.id || '')))
          .filter(Boolean);
        setProjectOptions(sanitized);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [scope]);

  // Fetch paginated issue list
  const fetchPageData = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);
      setApiError(null);

      const fetchApi = scope === 'my-issues' ? apiFetchMyIssues : apiFetchPreviousIssues;
      const res = await fetchApi({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        projectName: projectFilter !== 'All' ? projectFilter : undefined,
        issueType: typeFilter !== 'All' ? typeFilter : undefined,
        shift: shiftFilter !== 'All' ? shiftFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        dateFrom: dateFilter || undefined,
        dateTo: dateFilter || undefined
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
        setApiError(res.message || `Failed to fetch ${tableConfig.title} from backend API.`);
      }
    },
    [scope, tableConfig.title, PAGE_SIZE, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter, searchTerm]
  );

  // Restore scroll position once issues render after returning via Back navigation
  useEffect(() => {
    if (!isLoading && issues.length > 0 && pendingScrollRestoreRef.current !== null && tableScrollRef.current) {
      const targetScroll = pendingScrollRestoreRef.current;
      const scrollKey = `resolvehub_list_scroll_${location.pathname}${location.search}`;
      pendingScrollRestoreRef.current = null;
      sessionStorage.removeItem(scrollKey);
      requestAnimationFrame(() => {
        if (tableScrollRef.current) {
          tableScrollRef.current.scrollTop = targetScroll;
        }
      });
    }
  }, [isLoading, issues, location.pathname, location.search]);

  // Fetch on initial mount with preserved page, and debounce on subsequent filter changes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      fetchPageData(currentPage);
      return;
    }

    const timer = setTimeout(() => {
      fetchPageData(currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter, currentPage, fetchPageData]);

  // Filter change helpers: reset to page 1 & sync URL params
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    syncParamsToUrl(1, val, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter);
  };

  const handleProjectChange = (val: string) => {
    setProjectFilter(val);
    setCurrentPage(1);
    syncParamsToUrl(1, searchTerm, val, typeFilter, dateFilter, shiftFilter, statusFilter);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setCurrentPage(1);
    syncParamsToUrl(1, searchTerm, projectFilter, val, dateFilter, shiftFilter, statusFilter);
  };

  const handleDateChange = (val: string) => {
    setDateFilter(val);
    setCurrentPage(1);
    syncParamsToUrl(1, searchTerm, projectFilter, typeFilter, val, shiftFilter, statusFilter);
  };

  const handleShiftChange = (val: string) => {
    setShiftFilter(val);
    setCurrentPage(1);
    syncParamsToUrl(1, searchTerm, projectFilter, typeFilter, dateFilter, val, statusFilter);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
    syncParamsToUrl(1, searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, val);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || (totalPages > 0 && newPage > totalPages)) return;
    setCurrentPage(newPage);
    syncParamsToUrl(newPage, searchTerm, projectFilter, typeFilter, dateFilter, shiftFilter, statusFilter);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setProjectFilter('All');
    setTypeFilter('All');
    setDateFilter('');
    setShiftFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
    syncParamsToUrl(1, '', 'All', 'All', '', 'All', 'All');
  };

  const handleRowClick = (issue: Issue) => {
    // Save exact scroll position of table before navigating to Issue Details
    if (tableScrollRef.current) {
      const scrollKey = `resolvehub_list_scroll_${location.pathname}${location.search}`;
      sessionStorage.setItem(scrollKey, String(tableScrollRef.current.scrollTop));
    }

    navigate(`/issues/${issue.issueId || issue.id}`, {
      state: {
        from: tableConfig.backPath,
        source: scope,
        issue
      }
    });
  };

  const handleExportCsv = () => {
    const filename = `${scope}_${currentUser?.employeeId || 'issues'}_export.csv`;
    exportIssuesToCsv(issues, filename);
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      {/* 1. Reusable 6 Filters Bar */}
      <IssueTableFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        projectFilter={projectFilter}
        onProjectChange={handleProjectChange}
        projectOptions={projectOptions}
        typeFilter={typeFilter}
        onTypeChange={handleTypeChange}
        dateFilter={dateFilter}
        onDateChange={handleDateChange}
        shiftFilter={shiftFilter}
        onShiftChange={handleShiftChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        onClearFilters={handleClearFilters}
        onExportCsv={handleExportCsv}
      />

      {/* API Warning notice */}
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

      {/* 2. Main Issues Table Card */}
      <div className="fixed-table-card flex-grow-1 min-h-0">
        {/* Sub-header Bar */}
        <div className="px-3 py-1.5 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-semibold text-navy">{tableConfig.title}</span>
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
              title={`Refresh ${tableConfig.title}`}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? 'spinner-border spinner-border-sm' : ''}`}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* 3. Reusable Issue Table */}
        <IssueTable
          issues={issues}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          scrollContainerRef={tableScrollRef}
          emptyMessage={`No issues found in ${tableConfig.title} matching your selected filters.`}
        />

        {/* 4. Table Pagination Footer */}
        <div className="px-3 py-1.5 border-top bg-light d-flex align-items-center justify-content-between flex-shrink-0">
          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
            Showing {issues.length} of {totalIssues} issues (Page {currentPage} of {totalPages})
          </span>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalIssues}
            onPageChange={handlePageChange}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
          />
        </div>
      </div>
    </div>
  );
};

export default IssuesListPage;
