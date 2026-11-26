/**
 * Centralized API Client for ResolveHub
 * Handles Base URL resolution, authentication headers, timeouts, and standardized error parsing.
 */

export const API_BASE_URL: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS: number = Number(
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_TIMEOUT) || 15000
);

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  status?: number;
  total?: number;
  totalPages?: number;
  page?: number;
}

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('resolvehub_auth_token');
}

/**
 * Checks whether an auth token is non-empty and unexpired
 */
export function isTokenValid(token: string | null): boolean {
  if (!token || typeof token !== 'string' || !token.trim()) return false;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true; // Non-JWT standard string token
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded && typeof decoded.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp < nowInSeconds) {
        return false; // Expired token
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function getAuthHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders
  };
}

/**
 * Builds a normalized absolute URL from an endpoint path
 */
export function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

/**
 * Base fetch wrapper with timeout and error handling
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ApiResponse<T>> {
  const url = buildApiUrl(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: getAuthHeaders(options.headers || {}),
      signal: controller.signal
    });

    clearTimeout(timer);

    // 204 No Content
    if (response.status === 204) {
      return { success: true, status: 204 };
    }

    const contentType = response.headers.get('content-type') || '';
    let parsed: any = null;

    if (contentType.includes('application/json')) {
      parsed = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      parsed = text;
    }

    if (!response.ok) {
      const errorMsg =
        (typeof parsed === 'object' && parsed !== null
          ? parsed.detail || parsed.message || parsed.error
          : parsed) || `Request failed with status ${response.status}`;

      return {
        success: false,
        status: response.status,
        message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        data: parsed
      };
    }

    // Standardize response payload
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'success' in parsed) {
      return {
        success: true,
        status: response.status,
        data: parsed.data,
        message: parsed.message,
        total: parsed.total,
        totalPages: parsed.totalPages || parsed.total_pages,
        page: parsed.page
      };
    }

    return {
      success: true,
      status: response.status,
      data: parsed
    };
  } catch (error: any) {
    clearTimeout(timer);
    const isAbort = error.name === 'AbortError';
    return {
      success: false,
      status: 0,
      message: isAbort ? `Request timeout after ${timeoutMs}ms` : error.message || 'Network error'
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options: RequestInit = {}) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),

  patch: <T = any>(endpoint: string, body?: any, options: RequestInit = {}) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),

  delete: <T = any>(endpoint: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  request
};

export default apiClient;
