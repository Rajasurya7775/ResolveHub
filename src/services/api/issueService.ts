import { Issue, DiscussionMessage, ProjectItem, DeveloperItem } from '../../types/issue';

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
  const desc = item.issue_description || item.description || '';
  const shortDesc = item.short_description || (desc.length > 85 ? `${desc.substring(0, 85)}...` : desc);

  // Normalize status
  let status = item.issue_status || item.status || 'Open';
  if (typeof status === 'string') {
    const s = status.trim().toUpperCase();
    if (s === 'OPEN') status = 'Open';
    else if (s === 'ACCEPTED') status = 'Accepted';
    else if (s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'INPROGRESS') status = 'In progress';
    else if (s === 'RESOLVED' || s === 'CLOSED') status = 'Resolved';
    else if (s === 'PENDING') status = 'Pending';
    else if (s === 'ON HOLD' || s === 'ON_HOLD') status = 'On Hold';
    else if (s === 'ESCALATED') status = 'Escalated';
  }

  return {
    id: item.issue_number || item.id || `ISS-${item.issue_id ? String(item.issue_id).substring(0, 6) : Date.now()}`,
    projectId: item.project_name || item.project || item.projectId || (item.project_id ? String(item.project_id) : 'Nokia Production Dashboard'),
    projectName: item.project_name || item.project || item.projectId,
    title: item.issue_title || item.title || 'Untitled Issue',
    shortDescription: shortDesc,
    description: desc,
    issueType: item.issue_type || item.issueType || 'Front-end',
    occurrenceTime: item.issue_time || item.occurrenceTime || new Date().toISOString(),
    shift: item.issue_shift || item.shift || 'Shift-A',
    reportedBy: item.created_by_name || item.reportedBy || item.creator_name || 'Supporter',
    reportedById: String(item.issue_created_by || item.reportedById || item.employee_id || ''),
    reportedDate: item.issue_created_at
      ? item.issue_created_at.split('T')[0]
      : (item.reportedDate || new Date().toISOString().split('T')[0]),
    acceptedDeveloper: item.accepted_developer_name || item.assigned_to_name || item.assigned_to || item.acceptedDeveloper || 'Unassigned',
    acceptedDeveloperId: item.accepted_by ? String(item.accepted_by) : (item.assigned_to_id || item.acceptedDeveloperId),
    acceptedDate: item.accepted_at || item.acceptedDate,
    status,
    priority: item.issue_priority || item.priority || 'P2 – Moderate',
    assignedTo: item.accepted_developer_name || item.assigned_to || item.acceptedDeveloper,
    rca: item.rca || undefined,
    resolvedDate: item.resolved_at || item.resolvedDate || undefined,
    isEligibleForDelete: status === 'Open'
  };
}

/**
 * Fetch projects from API endpoint /issues/projects
 */
export async function apiFetchProjects(): Promise<{ success: boolean; data: ProjectItem[]; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response = await fetch(`${API_BASE_URL}/issues/projects `, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/projects`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const json = await response.json();
      const rawList = Array.isArray(json) ? json : json.data || json.projects || json.results || [];
      const list: ProjectItem[] = rawList.map((p: any) => ({
        id: p.project_id ?? p.id ?? p.projectId ?? String(p),
        name: p.project_name ?? p.name ?? p.title ?? String(p),
        description: p.project_description || p.description
      }));
      if (list.length > 0) {
        return { success: true, data: list };
      }
    }
  } catch (err: any) {
    console.warn('Could not fetch projects from API:', err.message);
  }

  return {
    success: false,
    data: [
      { id: '1', name: 'Nokia Production Dashboard' },
      { id: '2', name: 'Manufacturing Analytics' },
      { id: '3', name: 'Inventory Monitoring' },
      { id: '4', name: 'Network Monitoring' }
    ]
  };
}

/**
 * Fetch developers from API endpoint /issues/developers
 */
export async function apiFetchDevelopers(): Promise<{ success: boolean; data: DeveloperItem[]; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response = await fetch(`${API_BASE_URL}/issues/developers `, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/developers/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const json = await response.json();
      const rawList = Array.isArray(json) ? json : json.data || json.developers || json.users || json.results || [];
      const list: DeveloperItem[] = rawList.map((d: any) => ({
        id: d.user_id ?? d.id ?? d.employee_id ?? String(d),
        name: d.full_name ?? d.name ?? d.username ?? `Developer ${d.id || ''}`,
        employeeId: d.employee_id || d.employeeId || '',
        roleType: d.role_type || d.roleType || '',
        email: d.email || d.emial || ''
      }));
      if (list.length > 0) {
        return { success: true, data: list };
      }
    }
  } catch (err: any) {
    console.warn('Could not fetch developers from API:', err.message);
  }

  return {
    success: false,
    data: []
  };
}

/**
 * Fetch My Issues from backend API:
 * GET http://10.91.17.113:8000/api/v1/my-issues/
 */
export async function apiFetchMyIssues(): Promise<{ success: boolean; data?: Issue[]; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/my-issues`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: `Backend returned error ${response.status} when fetching My Issues from ${API_BASE_URL}/my-issues/`
      };
    }

    const json = await response.json();
    const rawList = Array.isArray(json) ? json : json.data || json.issues || json.results || [];
    const issues = rawList.map(normalizeIssue);

    return { success: true, data: issues };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'My Issues API request timed out.' : error.message
    };
  }
}

/**
 * Fetch Previous Issues from backend API:
 * GET http://10.91.17.113:8000/api/v1/previous-issues/
 */
export async function apiFetchPreviousIssues(): Promise<{ success: boolean; data?: Issue[]; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/previous-issues`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: `Backend returned error ${response.status} when fetching Previous Issues from ${API_BASE_URL}/previous-issues/`
      };
    }

    const json = await response.json();
    const rawList = Array.isArray(json) ? json : json.data || json.issues || json.results || [];
    const issues = rawList.map(normalizeIssue);

    return { success: true, data: issues };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Previous Issues API request timed out.' : error.message
    };
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
export async function apiDeleteIssue(issueId: string): Promise<{ success: boolean; message?: string }> {
  try {
    let response = await fetch(`${API_BASE_URL}/my-issues/${issueId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    }).catch(() => null);

    if (!response || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/issues/${issueId}/`, {
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
 * Fetch discussion messages for an issue
 */
export async function apiFetchMessages(issueId: string): Promise<DiscussionMessage[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/issues/${issueId}/messages/`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) return [];

    const json = await response.json();
    const list = Array.isArray(json) ? json : json.data || json.messages || [];

    return list.map((m: any) => ({
      id: String(m.id || `msg-${Date.now()}`),
      issueId: String(m.isuue_id || m.issue_id || issueId),
      senderId: String(m.sender_id || m.senderId || ''),
      senderName: m.sender_name || m.senderName || 'User',
      senderRole: m.sender_role || m.senderRole || 'Supporter',
      message: m.message || '',
      timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (m.timestamp || '')
    }));
  } catch {
    return [];
  }
}

/**
 * Send a discussion message
 */
export async function apiSendMessage(
  issueId: string,
  message: string,
  senderId?: string
): Promise<{ success: boolean; message?: DiscussionMessage }> {
  try {
    const payload = {
      isuue_id: issueId,
      issue_id: issueId,
      message,
      sender_id: senderId
    };

    const response = await fetch(`${API_BASE_URL}/issues/${issueId}/messages/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) return { success: false };

    const data = await response.json();
    const item = data.data || data;

    return {
      success: true,
      message: {
        id: String(item.id || `msg-${Date.now()}`),
        issueId,
        senderId: String(item.sender_id || senderId || ''),
        senderName: item.sender_name || 'User',
        senderRole: item.sender_role || 'Supporter',
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };
  } catch {
    return { success: false };
  }
}
