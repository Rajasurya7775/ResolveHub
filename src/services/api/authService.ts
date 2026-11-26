import { User, UserRole, SignupFormData } from '../../types/user';
import { API_BASE_URL } from './apiClient';

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

/**
 * Decode JWT token to extract claims (e.g. role, sub, email)
 */
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Normalizes backend user payload into frontend User model
 */
export function normalizeUser(data: any, fallbackRole?: UserRole): User {
  if (!data || typeof data !== 'object') {
    data = {};
  }

  const source = data.user || data.data || data;

  const rawRole = String(
    source.role ||
    source.user_role ||
    source.role_name ||
    source.userRole ||
    data.role ||
    data.user_role ||
    ''
  ).trim().toLowerCase();

  const rawRoleType = String(
    source.role_type ||
    source.roleType ||
    data.role_type ||
    data.roleType ||
    ''
  ).trim().toLowerCase();

  const rawDesignation = String(
    source.designation ||
    data.designation ||
    ''
  ).trim().toLowerCase();

  // Determine user role
  let role: UserRole;

  if (
    rawRole.includes('dev') ||
    rawRoleType.includes('front') ||
    rawRoleType.includes('back') ||
    rawRoleType.includes('data') ||
    rawDesignation.includes('dev')
  ) {
    role = 'Developer';
  } else if (
    rawRole.includes('supp') ||
    rawDesignation.includes('supp')
  ) {
    role = 'Support';
  } else if (fallbackRole) {
    role = fallbackRole === 'Developer' ? 'Developer' : 'Support';
  } else {
    role = 'Support';
  }

  const empId = String(
    source.employee_id ||
    source.employeeId ||
    source.sub ||
    data.employee_id ||
    data.employeeId ||
    data.sub ||
    ''
  );

  const fullName = String(
    source.full_name ||
    source.name ||
    data.full_name ||
    data.name ||
    empId ||
    (role === 'Developer' ? 'Developer' : 'Supporter')
  );

  const email = String(
    source.email ||
    data.email ||
    ''
  );

  return {
    id: String(source.user_id || source.id || data.user_id || data.id || empId || `usr-${Date.now()}`),
    employeeId: empId,
    name: fullName,
    email: email,
    phone: source.phone_number || source.phone || data.phone_number || data.phone || '',
    role,
    roleType: source.role_type || source.roleType || data.role_type || data.roleType || (role === 'Developer' ? 'Frontend' : 'Support Engineer'),
    accountStatus: (source.account_status || data.account_status) || 'Active',
    avatarUrl: source.avatar_url || data.avatar_url || ''
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

  // Try /auth/login first, fall back to /auth/login/ or /login
  let response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, reqOptions);

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/login/`, reqOptions);
  }

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/login`, reqOptions);
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

  const token = data?.access_token || data?.token || data?.jwt;

  if (token) {
    localStorage.setItem('resolvehub_auth_token', token);
  }

  const jwtPayload = token ? decodeJwt(token) : null;
  const rawUser = {
    ...(jwtPayload || {}),
    ...(data?.user || {}),
    ...(data?.data || {}),
    ...(data || {})
  };

  const user = normalizeUser(rawUser, role);

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
    confirm_password: formData.confirm_password,
    confirmPassword: formData.confirm_password,
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

  // Try /auth/signup first, fall back to /auth/signup/ or /auth/register
  let response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, reqOptions);

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup/`, reqOptions);
  }

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, reqOptions);
  }

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/signup`, reqOptions);
  }
  if (!response) {
    return {
      success: false,
      message: `Failed to connect to backend server at ${API_BASE_URL}. Ensure the server is online.`
    };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg =
      data?.detail ||
      data?.message ||
      data?.error;

    if (!errorMsg && typeof data === 'object' && data !== null) {
      const fieldErrors = Object.entries(data)
        .map(([field, msgs]) => {
          const formattedField = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          return `${formattedField}: ${msgStr}`;
        })
        .join(' | ');
      if (fieldErrors) errorMsg = fieldErrors;
    }

    if (!errorMsg) {
      errorMsg =
        response.status === 409
          ? 'An account with this Email or Employee ID already exists.'
          : `Registration failed (${response.status})`;
    }

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

  const fallbackRole: UserRole =
    formData.role === 'Support' || formData.role === 'Supporter' ? 'Support' : 'Developer';
  const user = normalizeUser(rawUser, fallbackRole);

  return {
    success: true,
    user,
    token
  };
}

/**
 * Fetch authenticated user profile details from:
 * GET /api/v1/auth/me
 */
export async function apiGetProfile(): Promise<{ success: boolean; user?: User; message?: string }> {
  const token = localStorage.getItem('resolvehub_auth_token');
  if (!token) {
    return { success: false, message: 'No authentication token found.' };
  }

  const reqOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  };

  let response = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, reqOptions);

  if (!response || response.status === 404) {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/me/`, reqOptions);
  }

  if (!response) {
    return { success: false, message: 'Failed to connect to /auth/me endpoint.' };
  }

  if (!response.ok) {
    return { success: false, message: `Profile endpoint returned error ${response.status}` };
  }

  const data = await response.json().catch(() => null);
  const rawUser = data?.user || data?.data || data;
  const user = normalizeUser(rawUser);

  return {
    success: true,
    user
  };
}
