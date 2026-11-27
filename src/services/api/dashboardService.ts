import { API_BASE_URL, getAuthHeaders } from './apiClient';

export interface DashboardSummary {
  totalLogged: number;
  activeCount: number;
  resolvedCount: number;
  inProgressCount: number;
  openCount: number;
  acceptedCount: number;
  raw?: any;
}

export interface DeveloperDashboardSummary {
  totalIssues: number;
  assignedIssues: number;
  inProgressCount: number;
  pendingCount: number;
  raw?: any;
}

export interface IssueTrendsStats {
  peak_day?: string;
  peak_day_open_count?: number;
  resolution_rate?: number;
  total_resolved?: number;
  total_logged?: number;
  net_backlog?: number;
  net_backlog_direction?: string;
}

export interface IssueTrendsResponse {
  labels: string[];
  open_tickets: number[];
  resolved_tickets: number[];
  on_hold_tickets: number[];
  in_progress_tickets: number[];
  stats?: IssueTrendsStats;
}

export interface IssueTypeDistributionStats {
  top_category?: string | null;
  top_category_count?: number | null;
  top_category_percentage?: number | null;
  fastest_growing_type?: string | null;
  growth_count?: number | null;
  growth_direction?: string | null;
  current_week_counts?: Record<string, number | null>;
  previous_week_counts?: Record<string, number | null>;
  slowest_to_resolve?: string | null;
  average_resolution_hours?: number | null;
  average_resolution_by_type?: Record<string, number | null>;
}

export interface IssueTypeDistributionResponse {
  labels: string[];
  counts: number[];
  stats?: IssueTypeDistributionStats;
}

export interface DeveloperPriorityStats {
  total_assigned?: number | null;
  high_priority?: number | null;
  medium_priority?: number | null;
  low_priority?: number | null;
}

export interface DeveloperPriorityDistributionResponse {
  labels: string[];
  high: number[];
  medium: number[];
  low: number[];
  stats?: DeveloperPriorityStats;
}

/**
 * Fetches dashboard summary and KPI metrics from:
 * http://10.91.17.113:8000/api/v1/dashboard/summary
 */
export async function apiFetchDashboardSummary(): Promise<{
  success: boolean;
  data?: DashboardSummary;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    // Try /dashboard/summary first, fall back to /dashboard/summary
    let response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response) {
      return {
        success: false,
        message: `Failed to connect to dashboard summary endpoint at ${API_BASE_URL}/dashboard/summary`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Dashboard summary endpoint returned error ${response.status}`
      };
    }

    const json = await response.json();
    const payload = json.data || json.summary || json;

    // Normalizing numbers from various backend field formats (snake_case or camelCase)
    const total =
      Number(payload.total_logged_issues ?? payload.totalLogged ?? payload.total ?? payload.total_count) || 0;
    const resolved =
      Number(payload.resolved_issues ?? payload.resolvedCount ?? payload.resolved ?? payload.closed) || 0;
    const inProgress =
      Number(payload.in_progress_issues ?? payload.inProgressCount ?? payload.in_progress ?? payload.inProgress) || 0;
    const open =
      Number(payload.open_issues ?? payload.openCount ?? payload.open ?? payload.pending) || 0;
    const accepted =
      Number(payload.accepted_issues ?? payload.acceptedCount ?? payload.accepted) || 0;
    const active =
      Number(payload.active_issues ?? payload.activeCount ?? payload.active) || Math.max(0, total - resolved);

    return {
      success: true,
      data: {
        totalLogged: total,
        activeCount: active,
        resolvedCount: resolved,
        inProgressCount: inProgress,
        openCount: open,
        acceptedCount: accepted,
        raw: payload
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Dashboard summary request timed out.' : error.message
    };
  }
}

/**
 * Fetches Developer Dashboard summary and KPI metrics from:
 * GET /api/v1/dashboard/summary
 * (Role is authenticated through the session Bearer token)
 */
export async function apiFetchDeveloperSummary(): Promise<{
  success: boolean;
  data?: DeveloperDashboardSummary;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response) {
      return {
        success: false,
        message: `Failed to connect to Developer dashboard summary at ${API_BASE_URL}/dashboard/summary`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Developer dashboard API returned error ${response.status}`
      };
    }

    const json = await response.json();
    const payload = json.data || json.summary || json;

    const total =
      Number(
        payload.total_issues ??
        payload.totalIssues ??
        payload.total_logged_issues ??
        payload.totalLogged ??
        payload.total
      ) || 0;

    const assigned =
      Number(
        payload.assigned_issues ??
        payload.assignedIssues ??
        payload.assigned_to_me ??
        payload.assignedCount ??
        payload.accepted_issues ??
        payload.acceptedCount
      ) || 0;

    const inProgress =
      Number(
        payload.in_progress_issues ??
        payload.inProgressCount ??
        payload.in_progress ??
        payload.inProgress
      ) || 0;

    const pending =
      Number(
        payload.pending_issues ??
        payload.pendingCount ??
        payload.pending ??
        payload.on_hold_issues ??
        payload.onHoldCount ??
        payload.open_issues ??
        payload.openCount
      ) || 0;

    return {
      success: true,
      data: {
        totalIssues: total,
        assignedIssues: assigned,
        inProgressCount: inProgress,
        pendingCount: pending,
        raw: payload
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Developer dashboard request timed out.' : error.message
    };
  }
}

/**
 * Graph 1: Fetch Support Incident Trends (Multi-series Line Chart: Open, Resolved, On-Hold, In-Progress)
 */
export async function apiFetchSupportIssueTrends(): Promise<{
  success: boolean;
  data?: IssueTrendsResponse;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const endpoints = [
      `${API_BASE_URL}/dashboard/issue-trends`,
      `${API_BASE_URL}/support/dashboard/trends`,
      `${API_BASE_URL}/support/trends`,
      `${API_BASE_URL}/dashboard/trends`,
      `${API_BASE_URL}/issues/trends`
    ];

    let response: Response | null = null;
    for (const url of endpoints) {
      response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
      if (response && response.ok) break;
      if (response && response.status !== 404) break;
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return {
        success: false,
        message: response
          ? `Issue Trends API returned status ${response.status}`
          : `Failed to connect to backend server at ${API_BASE_URL}`
      };
    }

    const json = await response.json();
    const payload = json.data || json;

    return {
      success: true,
      data: {
        labels: Array.isArray(payload.labels) ? payload.labels : [],
        open_tickets: Array.isArray(payload.open_tickets) ? payload.open_tickets.map(Number) : [],
        resolved_tickets: Array.isArray(payload.resolved_tickets) ? payload.resolved_tickets.map(Number) : [],
        on_hold_tickets: Array.isArray(payload.on_hold_tickets)
          ? payload.on_hold_tickets.map(Number)
          : Array.isArray(payload.hold_tickets)
          ? payload.hold_tickets.map(Number)
          : [],
        in_progress_tickets: Array.isArray(payload.in_progress_tickets) ? payload.in_progress_tickets.map(Number) : [],
        stats: payload.stats || undefined
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Issue Trends API request timed out.' : error.message
    };
  }
}

/**
 * Graph 2: Fetch Support Issue Type Distribution (Vertical Bar Chart: Front-end, Backend, Database, Others)
 */
export async function apiFetchSupportIssueTypeDistribution(): Promise<{
  success: boolean;
  data?: IssueTypeDistributionResponse;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const endpoints = [
      `${API_BASE_URL}/support/dashboard/issue-type-distribution`,
      `${API_BASE_URL}/support/issue-type-distribution`,
      `${API_BASE_URL}/dashboard/issue-type-distribution`,
      `${API_BASE_URL}/dashboard/issue-types`,
      `${API_BASE_URL}/issues/distribution`
    ];

    let response: Response | null = null;
    for (const url of endpoints) {
      response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      }).catch(() => null);
      if (response && response.ok) break;
      if (response && response.status !== 404) break;
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return {
        success: false,
        message: response
          ? `Issue Type Distribution API returned status ${response.status}`
          : `Failed to connect to backend server at ${API_BASE_URL}`
      };
    }

    const json = await response.json();
    const payload = json.data || json;

    return {
      success: true,
      data: {
        labels: Array.isArray(payload.labels) ? payload.labels : [],
        counts: Array.isArray(payload.counts) ? payload.counts.map(Number) : [],
        stats: payload.stats || undefined
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Issue Type Distribution API request timed out.' : error.message
    };
  }
}

/**
 * Graph 3: Fetch Developer Issue Trends:
 * GET /api/v1/dashboard/issue-trends
 * (Multi-series Line Chart: Open, Resolved, On-Hold, In-Progress)
 */
export async function apiFetchDeveloperIssueTrends(): Promise<{
  success: boolean;
  data?: IssueTrendsResponse;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/dashboard/issue-trends`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return {
        success: false,
        message: response
          ? `Developer Issue Trends API returned status ${response.status}`
          : `Failed to connect to backend server at ${API_BASE_URL}/dashboard/issue-trends`
      };
    }

    const json = await response.json();
    const payload = json.data || json;

    return {
      success: true,
      data: {
        labels: Array.isArray(payload.labels) ? payload.labels : [],
        open_tickets: Array.isArray(payload.open_tickets) ? payload.open_tickets.map(Number) : [],
        resolved_tickets: Array.isArray(payload.resolved_tickets) ? payload.resolved_tickets.map(Number) : [],
        on_hold_tickets: Array.isArray(payload.on_hold_tickets)
          ? payload.on_hold_tickets.map(Number)
          : (Array.isArray(payload.hold_tickets) ? payload.hold_tickets.map(Number) : []),
        in_progress_tickets: Array.isArray(payload.in_progress_tickets) ? payload.in_progress_tickets.map(Number) : [],
        stats: payload.stats || undefined
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Developer Issue Trends API request timed out.' : error.message
    };
  }
}

/**
 * Graph 4: Fetch Developer Weekly Priority Distribution:
 * GET /api/v1/dashboard/weekly-priority-distribution
 * (Multi-series: High, Medium, Low for Week 1..4)
 */
export async function apiFetchDeveloperPriorityDistribution(): Promise<{
  success: boolean;
  data?: DeveloperPriorityDistributionResponse;
  message?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/dashboard/weekly-priority-distribution`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return {
        success: false,
        message: response
          ? `Developer Priority API returned status ${response.status}`
          : `Failed to connect to backend server at ${API_BASE_URL}/dashboard/weekly-priority-distribution`
      };
    }

    const json = await response.json();
    const payload = json.data || json;

    return {
      success: true,
      data: {
        labels: Array.isArray(payload.labels) ? payload.labels : [],
        high: Array.isArray(payload.high) ? payload.high.map(Number) : [],
        medium: Array.isArray(payload.medium) ? payload.medium.map(Number) : [],
        low: Array.isArray(payload.low) ? payload.low.map(Number) : [],
        stats: payload.stats || undefined
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Developer Priority API request timed out.' : error.message
    };
  }
}

// Aliases for role-agnostic consumption
export const apiFetchSupportDashboardSummary = apiFetchDashboardSummary;
export const apiFetchDeveloperDashboardSummary = apiFetchDeveloperSummary;


