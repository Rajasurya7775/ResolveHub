import { Issue, DiscussionMessage } from '../../types/issue';

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
    else if (s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'INPROGRESS') status = 'In Progress';
    else if (s === 'RESOLVED' || s === 'CLOSED') status = 'Resolved';
  }

  return {
    id: item.issue_number || item.id || `ISS-${item.issue_id ? String(item.issue_id).substring(0, 6) : Date.now()}`,
    projectId: item.project_name || item.project || item.projectId || 'Nokia Production Dashboard',
    title: item.issue_title || item.title || 'Untitled Issue',
    shortDescription: shortDesc,
    description: desc,
    issueType: item.issue_type || item.issueType || 'Production Issue',
    occurrenceTime: item.issue_time || item.occurrenceTime || new Date().toISOString(),
    shift: item.issue_shift || item.shift || 'Shift A',
    reportedBy: item.created_by_name || item.reportedBy || item.creator_name || 'Supporter',
    reportedById: String(item.issue_created_by || item.reportedById || item.employee_id || ''),
    reportedDate: item.issue_created_at
      ? item.issue_created_at.split('T')[0]
      : (item.reportedDate || new Date().toISOString().split('T')[0]),
    acceptedDeveloper: item.accepted_developer_name || item.acceptedDeveloper || 'Unassigned',
    acceptedDeveloperId: item.accepted_by ? String(item.accepted_by) : item.acceptedDeveloperId,
    acceptedDate: item.accepted_at || item.acceptedDate,
    status,
    rca: item.rca || undefined,
    resolvedDate: item.resolved_at || item.resolvedDate || undefined,
    isEligibleForDelete: status === 'Open'
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

    const response = await fetch(`${API_BASE_URL}/my-issues/`, {
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

    const response = await fetch(`${API_BASE_URL}/previous-issues/`, {
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
  title: string;
  description: string;
  issueType: string;
  occurrenceTime: string;
  shift: string;
  reportedById?: string;
  reportedBy?: string;
}): Promise<{ success: boolean; data?: Issue; message?: string }> {
  try {
    const payload = {
      issue_title: data.title,
      issue_description: data.description,
      project_id: data.projectId,
      issue_type: data.issueType,
      issue_time: data.occurrenceTime,
      issue_shift: data.shift,
      issue_created_by: data.reportedById,
      // Compatibility fields
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      issueType: data.issueType,
      shift: data.shift
    };

    // Try /my-issues/ first, fall back to /issues/
    let response = await fetch(`${API_BASE_URL}/my-issues/`, {
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
