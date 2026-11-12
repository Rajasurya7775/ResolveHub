import { User, UserRole, SignupFormData } from '../../types/user';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

/**
 * Normalizes backend user payload into frontend User model
 */
export function normalizeUser(data: any): User {
  let role: UserRole = 'Support';
  const rawRole = String(data.role || '').toLowerCase();
  if (rawRole.includes('dev')) role = 'Developer';
  else role = 'Support';

  return {
    id: String(data.user_id || data.id || `usr-${Date.now()}`),
    employeeId: String(data.employee_id || data.employeeId || ''),
    name: String(data.full_name || data.name || ''),
    email: String(data.email || data.emial || ''),
    phone: data.phone_number || data.phone || '',
    role,
    roleType: data.role_type || data.roleType || '',
    accountStatus: (data.account_status as 'Active' | 'Inactive') || 'Active',
    avatarUrl: data.avatar_url || ''
  };
}

/**
 * Helper to execute fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    return null;
  }
}

/**
 * Executes login strictly through the auth/login API endpoints
 */
export async function apiLogin(
  role: UserRole,
  identifier: string,
  password?: string
): Promise<AuthResponse> {
  const trimmedId = identifier.trim();

  const payload: Record<string, any> = {
    identifier: trimmedId,
    username: trimmedId,
    password: password || '',
    role: role === 'Support' || role === 'Supporter' ? 'Support' : 'Developer'
  };

  if (trimmedId.includes('@')) {
    payload.email = trimmedId;
  } else {
    payload.employee_id = trimmedId;
  }

  const reqOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  };

  // Try /auth/login/ first, fall back to /auth/login or /login/
  let response = await fetchWithTimeout(`${API_BASE_URL}/auth/login/`, reqOptions);

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, reqOptions);
  }

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/login/`, reqOptions);
  }

  if (!response) {
    return {
      success: false,
      message: `Failed to connect to backend server at ${API_BASE_URL}. Ensure the server is online.`
    };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.detail ||
      data?.message ||
      data?.error ||
      (response.status === 401
        ? 'Invalid credentials. Please verify your Email/Employee ID and Password.'
        : response.status === 404
        ? 'User account not found.'
        : `Server returned error (${response.status})`);

    return {
      success: false,
      message: errorMsg
    };
  }

  const rawUser = data.user || data.data || data;
  const token = data.access_token || data.token || data.jwt;

  if (token) {
    localStorage.setItem('resolvehub_auth_token', token);
  }

  const user = normalizeUser(rawUser);

  return {
    success: true,
    user,
    token
  };
}

/**
 * Executes user sign-up strictly through the auth/signup API endpoints
 */
export async function apiSignup(formData: SignupFormData): Promise<AuthResponse> {
  const payload = {
    employee_id: formData.employee_id.trim().toUpperCase(),
    full_name: formData.full_name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone_number: formData.phone_number.trim(),
    password: formData.password,
    role: formData.role === 'Support' || formData.role === 'Supporter' ? 'Support' : 'Developer',
    role_type: formData.role_type.trim()
  };

  const reqOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  };

  // Try /auth/signup/ first, fall back to /auth/signup or /auth/register/
  let response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup/`, reqOptions);

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, reqOptions);
  }

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/register/`, reqOptions);
  }

  if (!response) {
    return {
      success: false,
      message: `Failed to connect to backend server at ${API_BASE_URL}. Ensure the server is online.`
    };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.detail ||
      data?.message ||
      data?.error ||
      (response.status === 409
        ? 'An account with this Email or Employee ID already exists.'
        : `Registration failed (${response.status})`);

    return {
      success: false,
      message: errorMsg
    };
  }

  const rawUser = data.user || data.data || data;
  const token = data.access_token || data.token || data.jwt;

  if (token) {
    localStorage.setItem('resolvehub_auth_token', token);
  }

  const user = normalizeUser(rawUser);

  return {
    success: true,
    user,
    token
  };
}
