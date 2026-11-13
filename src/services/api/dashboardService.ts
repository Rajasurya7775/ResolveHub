const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export interface DashboardSummary {
  totalLogged: number;
  activeCount: number;
  resolvedCount: number;
  inProgressCount: number;
  openCount: number;
  acceptedCount: number;
  raw?: any;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('resolvehub_auth_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
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

