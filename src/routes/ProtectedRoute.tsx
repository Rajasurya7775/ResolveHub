import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveRoleKey } from '../config/roleConfig';

export interface ProtectedRouteProps {
  allowedRole?: 'Developer' | 'Support';
  redirectUnauthenticatedTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRole,
  redirectUnauthenticatedTo = '/login',
  children
}) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={redirectUnauthenticatedTo} replace />;
  }

  if (allowedRole) {
    const userRoleKey = resolveRoleKey(currentUser.role);
    if (userRoleKey !== allowedRole) {
      const fallbackHome = userRoleKey === 'Developer' ? '/developer/home' : '/support/home';
      return <Navigate to={fallbackHome} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
