import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, SignupFormData } from '../types/user';
import { apiLogin, apiSignup, apiGetProfile } from '../services/api/authService';
import { getAuthToken, isTokenValid } from '../services/api/apiClient';

interface AuthContextType {
  currentUser: User | null;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  login: (role: UserRole, identifier: string, password?: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  signup: (data: SignupFormData) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'resolvehub_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMock = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';

  // Pure dynamic session: Requires both stored user and valid auth token
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const token = getAuthToken();
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!saved) return null;

      // In real backend mode, verify token exists and is valid
      if (!isMock && (!token || !isTokenValid(token))) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('resolvehub_auth_token');
        return null;
      }

      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>('Support');

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('resolvehub_auth_token');
    }
  }, [currentUser]);

  const login = async (
    role: UserRole,
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
    const isMock = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';

    // 1. Authenticate via real Backend API (Authorization is handled directly by the backend)
    if (!isMock) {
      const apiResult = await apiLogin(role, identifier, password);

      if (!apiResult.success || !apiResult.user) {
        return {
          success: false,
          message: apiResult.message || 'Invalid credentials. Please verify your Email/Employee ID and Password.'
        };
      }

      const returnedUser = apiResult.user;

      // Authenticated session accepted from backend
      setCurrentUser(returnedUser);
      setSelectedRole(returnedUser.role);
      return { success: true, user: returnedUser };
    }

    // 2. Mock mode: Only available if user explicitly turns on mock in .env
    return {
      success: false,
      message: 'Mock data has been disabled. Please connect to the backend server.'
    };
  };

  const signup = async (
    data: SignupFormData
  ): Promise<{ success: boolean; message?: string }> => {
    const isMock = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';

    if (!isMock) {
      const apiResult = await apiSignup(data);
      if (apiResult.success) {
        // Clear any auto-stored token so the user explicitly logs in on the login page
        localStorage.removeItem('resolvehub_auth_token');
        return { success: true };
      }
      return {
        success: false,
        message: apiResult.message || 'Registration failed on backend server.'
      };
    }

    return {
      success: false,
      message: 'Mock data has been disabled.'
    };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('resolvehub_auth_token');
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const sanitized: User = {
      ...currentUser,
      ...updatedData,
      role: currentUser.role,
      employeeId: currentUser.employeeId
    };
    setCurrentUser(sanitized);
  };

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return;
    try {
      const res = await apiGetProfile();
      if (res.success && res.user) {
        const newUser = res.user;
        setCurrentUser((prev) => {
          if (!prev) return newUser;
          if (
            prev.id === newUser.id &&
            prev.employeeId === newUser.employeeId &&
            prev.role === newUser.role &&
            prev.name === newUser.name &&
            prev.email === newUser.email
          ) {
            return prev;
          }
          return newUser;
        });
      }
    } catch {
      // silently fallback to current user session
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        selectedRole,
        setSelectedRole,
        login,
        signup,
        logout,
        updateProfile,
        refreshProfile,
        isAuthenticated: !!currentUser && (isMock || isTokenValid(getAuthToken()))
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
