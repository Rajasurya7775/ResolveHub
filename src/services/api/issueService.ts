import { Issue, DiscussionMessage, ProjectItem, DeveloperItem, PaginatedIssuesResponse, FetchIssuesParams } from '../../types/issue';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('resolvehub_auth_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Normalizes backend issue payload (snake_case matching ERD or camelCase) into frontend Issue model
 */
export function normalizeIssue(item: any): Issue {
  const desc = typeof item.issue_description === 'string'
    ? item.issue_description
    : (typeof item.description === 'string' ? item.description : '');
  const shortDesc = typeof item.short_description === 'string'
    ? item.short_description
    : (desc.length > 85 ? `${desc.substring(0, 85)}...` : desc);

  // Normalize status
  let rawStatus = item.issue_status || item.status || 'Open';
  let status: any = 'Open';
  if (typeof rawStatus === 'string') {
    const s = rawStatus.trim().toUpperCase();
    if (s === 'OPEN') status = 'Open';
    else if (s === 'ACCEPTED') status = 'Accepted';
    else if (s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'INPROGRESS') status = 'In progress';
    else if (s === 'RESOLVED' || s === 'CLOSED') status = 'Resolved';
    else if (s === 'PENDING') status = 'Pending';
    else if (s === 'ON HOLD' || s === 'ON_HOLD') status = 'On Hold';
    else if (s === 'ESCALATED') status = 'Escalated';
    else status = rawStatus;
  }

  // Normalize project: ensure projectId and projectName are ALWAYS clean strings, never objects
  let projectName = '';
  let projectId = '';

  if (item.project && typeof item.project === 'object') {
    projectName = item.project.project_name || item.project.name || item.project.title || '';
    projectId = item.project.project_id != null
      ? String(item.project.project_id)
      : (item.project.id != null ? String(item.project.id) : projectName);
  } else if (typeof item.project === 'string') {
    projectName = item.project;
    projectId = item.project;
  }

  if (!projectName && typeof item.project_name === 'string') {
    projectName = item.project_name;
  }
  if (!projectName && typeof item.projectName === 'string') {
    projectName = item.projectName;
  }
  if (!projectId && item.project_id != null) {
    projectId = String(item.project_id);
  }
  if (!projectId && typeof item.projectId === 'string') {
    projectId = item.projectId;
  }

  projectName = projectName || projectId || 'Nokia Production Dashboard';
  projectId = projectId || projectName;

  // Normalize Title
  let title = 'Untitled Issue';
  if (typeof item.issue_title === 'string') title = item.issue_title;
  else if (typeof item.title === 'string') title = item.title;

  // Normalize Issue Type
  let issueType = 'Front-end';
  if (typeof item.issue_type === 'string') issueType = item.issue_type;
  else if (typeof item.issueType === 'string') issueType = item.issueType;
  else if (item.issue_type && typeof item.issue_type === 'object') {
    issueType = item.issue_type.name || item.issue_type.type || 'Front-end';
  }

  // Normalize Shift
  let shift = 'Shift-A';
  if (typeof item.issue_shift === 'string') shift = item.issue_shift;
  else if (typeof item.shift === 'string') shift = item.shift;
  else if (item.issue_shift && typeof item.issue_shift === 'object') {
    shift = item.issue_shift.name || 'Shift-A';
  }

  // Normalize Reporter
  let reportedBy = 'Supporter';
  if (typeof item.created_by_name === 'string') reportedBy = item.created_by_name;
  else if (typeof item.reportedBy === 'string') reportedBy = item.reportedBy;
  else if (typeof item.creator_name === 'string') reportedBy = item.creator_name;
  else if (item.created_by && typeof item.created_by === 'object') {
    reportedBy = item.created_by.name || item.created_by.username || 'Supporter';
  } else if (typeof item.created_by === 'string') {
    reportedBy = item.created_by;
  }

  // Normalize Developer Assignee
  let acceptedDeveloper = 'Unassigned';
  if (typeof item.accepted_developer_name === 'string') acceptedDeveloper = item.accepted_developer_name;
  else if (typeof item.assigned_to_name === 'string') acceptedDeveloper = item.assigned_to_name;
  else if (typeof item.acceptedDeveloper === 'string') acceptedDeveloper = item.acceptedDeveloper;
  else if (typeof item.assigned_to === 'string') acceptedDeveloper = item.assigned_to;
  else if (item.accepted_developer && typeof item.accepted_developer === 'object') {
    acceptedDeveloper = item.accepted_developer.name || item.accepted_developer.username || 'Unassigned';
  } else if (item.assigned_to && typeof item.assigned_to === 'object') {
    acceptedDeveloper = item.assigned_to.name || item.assigned_to.username || 'Unassigned';
  }

  // Normalize Reported Date
  let reportedDate = new Date().toISOString().split('T')[0];
  if (typeof item.issue_created_at === 'string') {
    reportedDate = item.issue_created_at.split('T')[0];
  } else if (typeof item.created_at === 'string') {
    reportedDate = item.created_at.split('T')[0];
  } else if (typeof item.reportedDate === 'string') {
    reportedDate = item.reportedDate;
  }

  // Exact mapping per backend format:
  // issue_id: UUID (e.g. 004cfd00-a551-4284-a397-6c0d77dd2b25)
  // issue_number: Code (e.g. RES-1012)
  const rawIssueId = item.issue_id != null ? String(item.issue_id) : (item.id != null ? String(item.id) : '');
  const rawIssueNumber = item.issue_number != null ? String(item.issue_number) : (item.issueNumber != null ? String(item.issueNumber) : '');

  // The primary unique ID for API calls (PATCH / DELETE / GET by id) is the UUID
  const id = rawIssueId || rawIssueNumber || `ISS-${Date.now()}`;
  // The display ticket code is the issue_number
  const issueNumber = rawIssueNumber || (rawIssueId && rawIssueId.length > 20 ? `RES-${rawIssueId.substring(0, 4).toUpperCase()}` : rawIssueId || id);

  return {
    id,
    issueId: rawIssueId || id,
    issueNumber,
    issue_id: rawIssueId || id,
    issue_number: issueNumber,
    projectId,
    projectName,
    title,
    shortDescription: shortDesc,
    description: desc,
    issueType,
    occurrenceTime: typeof item.issue_time === 'string' ? item.issue_time : (typeof item.occurrenceTime === 'string' ? item.occurrenceTime : new Date().toISOString()),
    shift,
    reportedBy,
    reportedById: String(item.issue_created_by || item.reportedById || item.employee_id || ''),
    reportedDate,
    acceptedDeveloper,
    acceptedDeveloperId: item.accepted_by ? String(item.accepted_by) : (item.assigned_to_id || item.acceptedDeveloperId),
    acceptedDate: item.accepted_at || item.acceptedDate,
    status,
    priority: typeof item.issue_priority === 'string' ? item.issue_priority : (typeof item.priority === 'string' ? item.priority : 'P2 – Moderate'),
    assignedTo: acceptedDeveloper,
    rca: typeof item.rca === 'string' ? item.rca : undefined,
    resolvedDate: typeof item.resolved_at === 'string' ? item.resolved_at : (typeof item.resolvedDate === 'string' ? item.resolvedDate : undefined),
    isEligibleForDelete: status === 'Open'
  };
}


/**
 * Convert supported backend pagination formats into one frontend format.
 * Expected server-side response: items/results + total/count + page metadata.
 * Deliberately does not slice an unpaginated array in the browser.
 */
function normalizePaginatedIssuesResponse(
  responseJson: any,
  requestedPage: number,
  requestedPageSize: number
): PaginatedIssuesResponse | null {
  if (!responseJson || typeof responseJson !== 'object' || Array.isArray(responseJson)) {
    return null;
  }

  const payload = responseJson.data && !Array.isArray(responseJson.data) && typeof responseJson.data === 'object'
    ? responseJson.data
    : responseJson;

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.results)
      ? payload.results
      : Array.isArray(payload.issues)
        ? payload.issues
        : Array.isArray(payload.data)
          ? payload.data
          : null;

  if (!rawItems) return null;

  const items = rawItems.map(normalizeIssue);

  // Read from nested pagination object if present (e.g. payload.pagination) or flat payload
  const paginationObj = payload.pagination && typeof payload.pagination === 'object' ? payload.pagination : {};

  const totalValue =
    paginationObj.total_items ??
    paginationObj.total ??
    paginationObj.count ??
    payload.total_items ??
    payload.total ??
    payload.count;
  const total = typeof totalValue === 'number' ? totalValue : items.length;

  const pageValue =
    paginationObj.current_page ??
    paginationObj.page ??
    payload.current_page ??
    payload.page;
  const page = typeof pageValue === 'number' ? pageValue : requestedPage;

  const pageSizeValue =
    paginationObj.page_size ??
    paginationObj.pageSize ??
    paginationObj.per_page ??
    payload.page_size ??
    payload.pageSize ??
    payload.per_page;
  const pageSize = typeof pageSizeValue === 'number' ? pageSizeValue : requestedPageSize;

  const totalPagesValue =
    paginationObj.total_pages ??
    paginationObj.totalPages ??
    paginationObj.num_pages ??
    payload.total_pages ??
    payload.totalPages ??
    payload.num_pages;
  const totalPages = typeof totalPagesValue === 'number'
    ? totalPagesValue
    : Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const hasNextValue =
    paginationObj.has_next ??
    paginationObj.hasNext ??
    payload.has_next ??
    payload.hasNext;

  const hasPreviousValue =
    paginationObj.has_previous ??
    paginationObj.hasPrevious ??
    payload.has_previous ??
    payload.hasPrevious;

  const hasNext = typeof hasNextValue === 'boolean'
    ? hasNextValue
    : Boolean(paginationObj.next || payload.next) || page < totalPages;

  const hasPrevious = typeof hasPreviousValue === 'boolean'
    ? hasPreviousValue
    : Boolean(paginationObj.previous || payload.previous) || page > 1;

  const pagination = {
    total_items: total,
    total_pages: totalPages,
    current_page: page,
    has_next: hasNext,
    has_previous: hasPrevious,
    page_size: pageSize
  };

  return {
    items,
    pagination,
    total,
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrevious
  };
}

// In-memory cache for project data, developers, and supporters to avoid duplicate network calls
let cachedProjects: ProjectItem[] | null = null;
let cachedProjectsPromise: Promise<{ success: boolean; data: ProjectItem[]; message?: string }> | null = null;

let cachedDevelopers: DeveloperItem[] | null = null;
let cachedSupporters: DeveloperItem[] | null = null;
let cachedDevelopersPromise: Promise<{ success: boolean; data: DeveloperItem[]; message?: string }> | null = null;
let cachedSupportersPromise: Promise<{ success: boolean; data: DeveloperItem[]; message?: string }> | null = null;

export function invalidateProjectsCache() {
  cachedProjects = null;
  cachedProjectsPromise = null;
}

export function invalidateDevelopersCache() {
  cachedDevelopers = null;
  cachedDevelopersPromise = null;
}

/**
 * Fetch projects from API endpoint /issues/projects (with in-memory caching)
 */
export async function apiFetchProjects(): Promise<{ success: boolean; data: ProjectItem[]; message?: string }> {
  if (cachedProjects && cachedProjects.length > 0) {
    return { success: true, data: cachedProjects };
  }
  if (cachedProjectsPromise) {
    return cachedProjectsPromise;
  }

  cachedProjectsPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response = await fetch(`${API_BASE_URL}/issues/projects`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);

      if (!response || response.status === 404) {
        response = await fetch(`${API_BASE_URL}/issues/projects/`, {
          method: 'GET',
          headers: getAuthHeaders(),
          signal: controller.signal
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const json = await response.json();
        const rawList = Array.isArray(json) ? json : json.data || json.projects || json.results || [];
        const list: ProjectItem[] = rawList.map((p: any) => {
          if (typeof p === 'string') {
            return { id: p, name: p };
          }
          const id = p.project_id ?? p.id ?? p.projectId ?? (p.project_name ? String(p.project_name) : 'proj');
          const name = typeof p.project_name === 'string'
            ? p.project_name
            : typeof p.name === 'string'
              ? p.name
              : p.title || String(id);
          return {
            id: String(id),
            name: String(name),
            description: typeof p.project_description === 'string'
              ? p.project_description
              : typeof p.description === 'string'
                ? p.description
                : undefined
          };
        });
        if (list.length > 0) {
          cachedProjects = list;
          return { success: true, data: list };
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch projects from API:', err.message);
    } finally {
      cachedProjectsPromise = null;
    }

    const fallback: ProjectItem[] = [
      { id: '1', name: 'Nokia Production Dashboard' },
      { id: '2', name: 'Manufacturing Analytics' },
      { id: '3', name: 'Inventory Monitoring' },
      { id: '4', name: 'Network Monitoring' }
    ];
    cachedProjects = fallback;
    return {
      success: false,
      data: fallback
    };
  })();

  return cachedProjectsPromise;
}

/**
 * Fetch developers or supporters from API endpoint:
 * Supporters: GET /api/v1/issues/support
 * Developers: GET /api/v1/issues/developers
 */
export async function apiFetchDevelopers(
  roleTarget: 'developer' | 'supporter' = 'developer'
): Promise<{ success: boolean; data: DeveloperItem[]; message?: string }> {
  if (roleTarget === 'supporter') {
    if (cachedSupporters && cachedSupporters.length > 0) {
      return { success: true, data: cachedSupporters };
    }
    if (cachedSupportersPromise) {
      return cachedSupportersPromise;
    }
  } else {
    if (cachedDevelopers && cachedDevelopers.length > 0) {
      return { success: true, data: cachedDevelopers };
    }
    if (cachedDevelopersPromise) {
      return cachedDevelopersPromise;
    }
  }

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const endpoint = roleTarget === 'supporter'
        ? `${API_BASE_URL}/issues/support`
        : `${API_BASE_URL}/issues/developers`;

      let response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);

      if (!response || response.status === 404) {
        response = await fetch(`${endpoint}/`, {
          method: 'GET',
          headers: getAuthHeaders(),
          signal: controller.signal
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const json = await response.json();
        const rawList = Array.isArray(json) ? json : json.data || json.developers || json.users || json.results || json.supporters || [];
        const list: DeveloperItem[] = rawList.map((d: any) => ({
          id: d.user_id ?? d.id ?? d.employee_id ?? String(d),
          name: d.full_name ?? d.name ?? d.username ?? `User ${d.id || ''}`,
          employeeId: d.employee_id || d.employeeId || '',
          roleType: d.role_type || d.roleType || '',
          email: d.email || d.emial || ''
        }));
        if (list.length > 0) {
          if (roleTarget === 'supporter') {
            cachedSupporters = list;
          } else {
            cachedDevelopers = list;
          }
          return { success: true, data: list };
        }
      }
    } catch (err: any) {
      console.warn(`Could not fetch ${roleTarget} from API:`, err.message);
    } finally {
      if (roleTarget === 'supporter') {
        cachedSupportersPromise = null;
      } else {
        cachedDevelopersPromise = null;
      }
    }

    return {
      success: false,
      data: []
    };
  })();

  if (roleTarget === 'supporter') {
    cachedSupportersPromise = promise;
  } else {
    cachedDevelopersPromise = promise;
  }

  return promise;
}

/**
 * Helper to build query parameters matching the exact FastAPI backend parameters:
 * search, project_name, issue_type, shift, issue_status, date_from, date_to, page, page_size
 */
export function buildFilterQueryParams(
  params?: FetchIssuesParams,
  requestedPage = 1,
  requestedPageSize = 10
): URLSearchParams {
  const query = new URLSearchParams({
    page: String(requestedPage),
    page_size: String(requestedPageSize)
  });

  // 1. Search: matches issue_number or issue_title
  if (params?.search?.trim()) {
    query.append('search', params.search.trim());
  }

  // 2. Project Name: backend uses project_name parameter
  const projectVal = (params?.projectName || params?.project || '').trim();
  if (projectVal && projectVal !== 'All') {
    query.append('project_name', projectVal);
    query.append('project', projectVal);
  }

  // 3. Issue Type: backend stores FRONTEND, BACKEND, DATABASE, etc.
  if (params?.issueType && params.issueType !== 'All') {
    const rawType = params.issueType.trim();
    let backendType = rawType;
    const upper = rawType.toUpperCase();
    if (upper.includes('FRONT')) backendType = 'FRONTEND';
    else if (upper.includes('BACK')) backendType = 'BACKEND';
    else if (upper.includes('DATA')) backendType = 'DATABASE';
    else if (upper.includes('HARD')) backendType = 'HARDWARE';
    else if (upper.includes('OTHER')) backendType = 'OTHERS';

    query.append('issue_type', backendType);
  }

  // 4. Shift: backend stores 'A', 'B', 'C'
  if (params?.shift && params.shift !== 'All') {
    const rawShift = params.shift.trim();
    let backendShift = rawShift;
    if (rawShift.includes('A')) backendShift = 'A';
    else if (rawShift.includes('B')) backendShift = 'B';
    else if (rawShift.includes('C')) backendShift = 'C';
    else if (rawShift.toLowerCase().includes('gen')) backendShift = 'General';

    query.append('shift', backendShift);
  }

  // 5. Issue Status: backend uses issue_status parameter with values OPEN, IN_PROGRESS, RESOLVED, HOLD
  if (params?.status && params.status !== 'All') {
    const rawStatus = params.status.trim().toUpperCase();
    let backendStatus = rawStatus;
    if (rawStatus === 'OPEN') backendStatus = 'OPEN';
    else if (rawStatus.includes('PROGRESS')) backendStatus = 'IN_PROGRESS';
    else if (rawStatus.includes('RESOLV') || rawStatus === 'CLOSED') backendStatus = 'RESOLVED';
    else if (rawStatus.includes('HOLD') || rawStatus.includes('PEND')) backendStatus = 'HOLD';
    else if (rawStatus.includes('ACCEPT')) backendStatus = 'OPEN';

    query.append('issue_status', backendStatus);
    query.append('status', backendStatus);
  }

  // 6. Date Range: backend uses date_from and date_to (format YYYY-MM-DD)
  if (params?.date) {
    query.append('date_from', params.date);
    query.append('date_to', params.date);
    query.append('date', params.date);
  } else {
    if (params?.dateFrom) query.append('date_from', params.dateFrom);
    if (params?.dateTo) query.append('date_to', params.dateTo);
  }

  return query;
}

/**
 * Fetch My Issues from backend API:
 * GET /api/v1/my-issues
 */
export async function apiFetchMyIssues(
  params?: FetchIssuesParams
): Promise<{ success: boolean; data?: PaginatedIssuesResponse; message?: string }> {
  const requestedPage = params?.page ?? 1;
  const requestedPageSize = params?.pageSize ?? 10;
  const query = buildFilterQueryParams(params, requestedPage, requestedPageSize);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response = await fetch(`${API_BASE_URL}/my-issues/?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    // Support deployments whose router is configured without a trailing slash.
    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/my-issues?${query.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (!response) {
      return {
        success: false,
        message: `Failed to connect to backend server at ${API_BASE_URL}. Ensure server is online.`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Backend returned error ${response.status} when fetching My Issues.`
      };
    }

    const json = await response.json();
    const data = normalizePaginatedIssuesResponse(json, requestedPage, requestedPageSize);

    if (!data) {
      return {
        success: false,
        message: 'My Issues API must return a paginated object containing items/results and pagination metadata. An unpaginated array is not supported.'
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'My Issues API request timed out.' : error.message
    };
  }
}

/**
 * Fetch Previous Issues from backend API with pagination and filter support:
 * GET /api/v1/previous-issues
 */
export async function apiFetchPreviousIssues(
  params?: FetchIssuesParams
): Promise<{ success: boolean; data?: PaginatedIssuesResponse; message?: string }> {
  const requestedPage = params?.page ?? 1;
  const requestedPageSize = params?.pageSize ?? 10;
  const query = buildFilterQueryParams(params, requestedPage, requestedPageSize);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const qs = query.toString();
    let response = await fetch(`${API_BASE_URL}/previous-issues/?${qs}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/previous-issues?${qs}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (!response) {
      return {
        success: false,
        message: `Failed to connect to backend server at ${API_BASE_URL}. Ensure server is online.`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Backend returned error ${response.status} when fetching Previous Issues.`
      };
    }

    const json = await response.json();
    const data = normalizePaginatedIssuesResponse(json, requestedPage, requestedPageSize);

    if (!data) {
      return {
        success: false,
        message: 'Previous Issues API must return a paginated object containing items/results and pagination metadata. An unpaginated array is not supported.'
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Previous Issues API request timed out.' : error.message
    };
  }
}

/**
 * Fetch Project Names for Previous Issues (reusing unified project cache)
 */
export async function apiFetchPreviousIssuesProjects(): Promise<{ success: boolean; data: string[]; message?: string }> {
  const res = await apiFetchProjects();
  if (res.success && res.data.length > 0) {
    const names = Array.from(
      new Set(
        res.data
          .map((p: any) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              return typeof p.name === 'string' ? p.name : (typeof p.project_name === 'string' ? p.project_name : String(p.id || ''));
            }
            return String(p || '');
          })
          .filter(Boolean)
      )
    );
    return { success: true, data: names };
  }
  return { success: false, data: [] };
}

/**
 * Fetch Project Names for My Issues (reusing unified project cache)
 */
export async function apiFetchMyIssuesProjects(): Promise<{ success: boolean; data: string[]; message?: string }> {
  const res = await apiFetchProjects();
  if (res.success && res.data.length > 0) {
    const names = Array.from(
      new Set(
        res.data
          .map((p: any) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              return typeof p.name === 'string' ? p.name : (typeof p.project_name === 'string' ? p.project_name : String(p.id || ''));
            }
            return String(p || '');
          })
          .filter(Boolean)
      )
    );
    return { success: true, data: names };
  }
  return { success: false, data: [] };
}

/**
 * Fetch a single issue by ID from the backend API
 */
export async function apiFetchIssueById(
  issueId: string,
  source: 'my-issues' | 'previous-issues' = 'my-issues'
): Promise<{ success: boolean; data?: Issue; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let targetId = issueId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    if (!isUuid) {
      // If targetId is an issue_number like "RES-1012", search by issue_number to resolve its UUID
      const searchRes = source === 'previous-issues'
        ? await apiFetchPreviousIssues({ search: targetId, pageSize: 5 })
        : await apiFetchMyIssues({ search: targetId, pageSize: 5 });

      if (searchRes.success && searchRes.data && searchRes.data.items.length > 0) {
        const found = searchRes.data.items.find(
          (i) => i.issueNumber === targetId || i.id === targetId || i.issueId === targetId
        ) || searchRes.data.items[0];
        if (found && found.id && found.id !== targetId) {
          targetId = found.id;
        }
      }
    }

    const endpoints = source === 'previous-issues'
      ? [
          `${API_BASE_URL}/previous-issues/${targetId}`,
          `${API_BASE_URL}/previous-issues/${targetId}/`,
          `${API_BASE_URL}/issues/${targetId}`,
          `${API_BASE_URL}/my-issues/${targetId}`
        ]
      : [
          `${API_BASE_URL}/my-issues/${targetId}`,
          `${API_BASE_URL}/my-issues/${targetId}/`,
          `${API_BASE_URL}/issues/${targetId}`,
          `${API_BASE_URL}/previous-issues/${targetId}`
        ];

    let response: Response | null = null;
    for (const url of endpoints) {
      response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
      if (response && response.ok) break;
      if (response && response.status !== 404 && response.status !== 422) break;
    }

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const json = await response.json();
      const raw = json.data || json.issue || json;
      return { success: true, data: normalizeIssue(raw) };
    }

    return { success: false, message: 'Issue not found on server' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Update an issue on the backend
 */
export async function apiUpdateIssue(
  issueId: string,
  updatedFields: Partial<Issue>,
  source: 'my-issues' | 'previous-issues' = 'my-issues'
): Promise<{ success: boolean; data?: Issue; message?: string }> {
  try {
    const payload: Record<string, any> = {};
    if (updatedFields.title) {
      payload.issue_title = updatedFields.title;
      payload.title = updatedFields.title;
    }
    if (updatedFields.description) {
      payload.issue_description = updatedFields.description;
      payload.description = updatedFields.description;
    }
    if (updatedFields.projectId) {
      payload.project_id = updatedFields.projectId;
      payload.projectId = updatedFields.projectId;
    }
    if (updatedFields.issueType) {
      payload.issue_type = updatedFields.issueType;
      payload.issueType = updatedFields.issueType;
    }
    if (updatedFields.occurrenceTime) {
      payload.issue_time = updatedFields.occurrenceTime;
      payload.occurrenceTime = updatedFields.occurrenceTime;
    }
    if (updatedFields.status) {
      payload.issue_status = updatedFields.status;
      payload.status = updatedFields.status;
    }
    if (updatedFields.priority) {
      payload.issue_priority = updatedFields.priority;
      payload.priority = updatedFields.priority;
    }
    if (updatedFields.rca) {
      payload.rca = updatedFields.rca;
    }

    const primaryUrl = source === 'previous-issues'
      ? `${API_BASE_URL}/previous-issues/${issueId}`
      : `${API_BASE_URL}/my-issues/${issueId}`;
    const fallbackUrl = source === 'previous-issues'
      ? `${API_BASE_URL}/previous-issues/${issueId}/`
      : `${API_BASE_URL}/my-issues/${issueId}/`;

    let response = await fetch(primaryUrl, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(fallbackUrl, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      }).catch(() => null);
    }

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      }).catch(() => null);
    }

    if (response && response.ok) {
      const json = await response.json().catch(() => null);
      if (json) {
        return { success: true, data: normalizeIssue(json.data || json) };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Create a new issue on the backend
 */
export async function apiCreateIssue(data: {
  projectId: string;
  shift: string;
  occurrenceTime: string;
  title: string;
  description: string;
  issueType: string;
  rca?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  assignedToId?: string;
  reportedById?: string;
  reportedBy?: string;
}): Promise<{ success: boolean; data?: Issue; message?: string }> {
  try {
    const payload = {
      // ERD & Django/FastAPI snake_case fields
      project_id: data.projectId,
      issue_title: data.title,
      issue_description: data.description,
      issue_type: data.issueType,
      issue_time: data.occurrenceTime,
      issue_shift: data.shift,
      issue_status: data.status || 'Open',
      issue_priority: data.priority || 'P2 – Moderate',
      priority: data.priority || 'P2 – Moderate',
      rca: data.rca?.trim() ? data.rca.trim() : null,
      assigned_to: data.assignedToId || (data.assignedTo && data.assignedTo !== 'Unassigned' ? data.assignedTo : null),
      issue_created_by: data.reportedById,

      // CamelCase compatibility fields
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      issueType: data.issueType,
      occurrenceTime: data.occurrenceTime,
      shift: data.shift,
      status: data.status || 'Open',
      reportedById: data.reportedById,
      reportedBy: data.reportedBy
    };

    // Try /my-issues/ first, fall back to /issues/
    let response = await fetch(`${API_BASE_URL}/issues`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      }).catch(() => null);
    }

    if (!response) {
      return { success: false, message: 'Failed to reach backend server to create issue.' };
    }

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      return {
        success: false,
        message: err?.detail || err?.message || `Failed to report issue (${response.status})`
      };
    }

    const createdRaw = await response.json();
    return { success: true, data: normalizeIssue(createdRaw.data || createdRaw) };
  } catch (error: any) {
    return { success: false, message: error.message || 'Network error while creating issue.' };
  }
}

/**
 * Delete an issue on the backend
 */
export async function apiDeleteIssue(
  issueId: string,
  source: 'my-issues' | 'previous-issues' = 'my-issues'
): Promise<{ success: boolean; message?: string }> {
  try {
    const primaryUrl = source === 'previous-issues'
      ? `${API_BASE_URL}/previous-issues/${issueId}`
      : `${API_BASE_URL}/my-issues/${issueId}`;
    const fallbackUrl = source === 'previous-issues'
      ? `${API_BASE_URL}/previous-issues/${issueId}/`
      : `${API_BASE_URL}/my-issues/${issueId}/`;

    let response = await fetch(primaryUrl, {
      method: 'DELETE',
      headers: getAuthHeaders()
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(fallbackUrl, {
        method: 'DELETE',
        headers: getAuthHeaders()
      }).catch(() => null);
    }

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      }).catch(() => null);
    }

    if (!response || !response.ok) {
      return { success: false, message: `Failed to delete issue on server` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Normalizes discussion message matching backend schema:
 * { id, issue_id, sender_id, sender_name, markdown, created_at }
 */
export function normalizeDiscussionMessage(m: any, defaultIssueId: string): DiscussionMessage {
  const text = m.markdown || m.message || m.text || '';
  const senderName = m.sender_name || m.senderName || 'User';

  // Determine role: Developer or Supporter
  let role: 'Support' | 'Supporter' | 'Developer' = 'Supporter';
  const rawRole = String(m.sender_role || m.role || m.senderRole || '').toLowerCase();
  const lowerName = String(senderName).toLowerCase();
  if (
    rawRole.includes('dev') ||
    lowerName.includes('jeva') ||
    lowerName.includes('arun') ||
    lowerName.includes('developer')
  ) {
    role = 'Developer';
  } else if (
    rawRole.includes('supp') ||
    lowerName.includes('sivabalan') ||
    lowerName.includes('supporter')
  ) {
    role = 'Supporter';
  }

  // Format timestamp: "Nov 17, 2026 • 04:20 PM" matching reference UI
  let timestamp = '';
  const dateVal = m.created_at || m.createdAt || m.timestamp;
  if (dateVal) {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        timestamp = `${datePart} • ${timePart}`;
      } else {
        timestamp = String(dateVal);
      }
    } catch {
      timestamp = String(dateVal);
    }
  }
  if (!timestamp) {
    const d = new Date();
    timestamp = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }

  return {
    id: String(m.id || `msg-${Date.now()}`),
    issueId: String(m.issue_id || defaultIssueId),
    senderId: String(m.sender_id || m.senderId || ''),
    senderName,
    senderRole: role,
    message: text,
    markdown: text,
    createdAt: m.created_at || '',
    timestamp,
    attachment: m.attachment,
    reaction: m.reaction
  };
}

/**
 * Fetch discussion messages for an issue
 */
export async function apiFetchMessages(issueId: string): Promise<DiscussionMessage[]> {
  try {
    const endpoints = [
      `${API_BASE_URL}/my-issues/${issueId}/messages`,
      `${API_BASE_URL}/issues/${issueId}/messages`,
      `${API_BASE_URL}/previous-issues/${issueId}/messages`
    ];

    let response: Response | null = null;
    for (const url of endpoints) {
      response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      }).catch(() => null);

      if (response && response.ok) break;
    }

    if (!response || !response.ok) return [];

    const json = await response.json();
    const list = Array.isArray(json) ? json : json.data || json.messages || [];

    return list.map((m: any) => normalizeDiscussionMessage(m, issueId));
  } catch (error) {
    console.error('[apiFetchMessages] Error fetching messages:', error);
    return [];
  }
}

/**
 * Send a discussion message avoiding 422 Unprocessable Content
 */
export async function apiSendMessage(
  issueId: string,
  message: string,
  senderId?: string,
  senderName?: string
): Promise<{ success: boolean; message?: DiscussionMessage }> {
  try {
    // Resolve integer sender_id if available from user session
    let numericSenderId: number | undefined;
    if (senderId && !isNaN(Number(senderId))) {
      numericSenderId = Number(senderId);
    } else {
      const authUserRaw = localStorage.getItem('resolvehub_auth_user');
      if (authUserRaw) {
        try {
          const parsed = JSON.parse(authUserRaw);
          if (parsed.user_id && !isNaN(Number(parsed.user_id))) {
            numericSenderId = Number(parsed.user_id);
          } else if (parsed.id && !isNaN(Number(parsed.id))) {
            numericSenderId = Number(parsed.id);
          }
        } catch {}
      }
    }

    // Endpoints to try
    const endpoints = [
      `${API_BASE_URL}/my-issues/${issueId}/messages`,
      `${API_BASE_URL}/issues/${issueId}/messages`,
      `${API_BASE_URL}/previous-issues/${issueId}/messages`
    ];

    // Payload variants to prevent 422 Unprocessable Content
    // Variant 1: Complete payload with markdown, issue_id, sender_id, sender_name
    const fullPayload: Record<string, any> = {
      markdown: message,
      issue_id: issueId
    };
    if (numericSenderId) fullPayload.sender_id = numericSenderId;
    if (senderName) fullPayload.sender_name = senderName;

    // Variant 2: Minimal markdown only
    const minimalPayload = {
      markdown: message
    };

    // Variant 3: Both markdown and message
    const dualPayload: Record<string, any> = {
      markdown: message,
      message
    };
    if (numericSenderId) dualPayload.sender_id = numericSenderId;

    let response: Response | null = null;
    let data: any = null;

    for (const url of endpoints) {
      // 1. Try full payload
      response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(fullPayload)
      }).catch(() => null);

      // If 422, retry with minimal payload
      if (response && response.status === 422) {
        const err422 = await response.text().catch(() => '');
        console.warn(`[apiSendMessage] 422 on ${url} with full payload: ${err422}. Retrying with minimal payload...`);
        
        response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(minimalPayload)
        }).catch(() => null);
      }

      // If still 422, try dual payload
      if (response && response.status === 422) {
        response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(dualPayload)
        }).catch(() => null);
      }

      if (response && response.ok) {
        data = await response.json().catch(() => null);
        break;
      }
    }

    if (!response || !response.ok) {
      console.error('[apiSendMessage] Message post failed with status:', response?.status);
      return { success: false };
    }

    // Process server response which could be array [ { id, issue_id, sender_id, sender_name, markdown, created_at } ] or single item
    const item = Array.isArray(data) ? data[data.length - 1] : (data?.data || data);

    const normalized = normalizeDiscussionMessage(item || {
      id: `msg-${Date.now()}`,
      issue_id: issueId,
      sender_id: numericSenderId,
      sender_name: senderName || 'User',
      markdown: message,
      created_at: new Date().toISOString()
    }, issueId);

    return {
      success: true,
      message: normalized
    };
  } catch (err) {
    console.error('[apiSendMessage] Error:', err);
    return { success: false };
  }
}
