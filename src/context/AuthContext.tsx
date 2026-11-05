import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/user';
import { MOCK_USERS, DEFAULT_SUPPORTER } from '../data/mockUsers';

interface AuthContextType {
  currentUser: User | null;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  login: (role: UserRole, identifier: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'resolvehub_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SUPPORTER;
    } catch {
      return DEFAULT_SUPPORTER;
    }
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>('Supporter');

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const login = (role: UserRole, identifier: string, _password?: string): { success: boolean; message?: string } => {
    const trimmedId = identifier.trim().toLowerCase();

    // Look for matching user by email or employeeId
    const matched = MOCK_USERS.find(
      (u) =>
        (u.email.toLowerCase() === trimmedId || u.employeeId.toLowerCase() === trimmedId) &&
        (role === 'Supporter' ? u.role === 'Supporter' : u.role === 'Admin' || u.role === 'Developer')
    );

    if (matched) {
      setCurrentUser(matched);
      return { success: true };
    }

    // If no exact match found, provide helpful mock fallback for prototype
    if (role === 'Supporter') {
      const fallbackUser: User = {
        ...DEFAULT_SUPPORTER,
        name: trimmedId.includes('@') ? trimmedId.split('@')[0] : trimmedId.toUpperCase(),
        email: trimmedId.includes('@') ? trimmedId : `${trimmedId.toLowerCase()}@resolvehub.com`
      };
      setCurrentUser(fallbackUser);
      return { success: true };
    } else {
      const adminFallback = MOCK_USERS.find((u) => u.role === 'Admin' || u.role === 'Developer') || MOCK_USERS[3];
      setCurrentUser(adminFallback);
      return { success: true };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!currentUser) return;
    // Supporter cannot modify role or employee ID
    const sanitized: User = {
      ...currentUser,
      ...updatedData,
      role: currentUser.role,
      employeeId: currentUser.employeeId
    };
    setCurrentUser(sanitized);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        selectedRole,
        setSelectedRole,
        login,
        logout,
        updateProfile,
        isAuthenticated: !!currentUser
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

