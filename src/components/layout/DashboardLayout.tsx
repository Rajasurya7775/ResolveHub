import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based authorization:
  // If Developer visits Supporter-only routes, redirect to Developer dashboard
  const isDev = String(currentUser?.role || '').toLowerCase().includes('dev');
  const supporterOnlyPaths = ['/support', '/home', '/dashboard', '/issues/my', '/issues/previous', '/issues/new', '/issues/report'];
  const developerOnlyPaths = ['/developer'];

  if (isDev && supporterOnlyPaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) {
    return <Navigate to="/developer/home" replace />;
  }

  // If Supporter visits Developer-only routes, redirect to Supporter home
  if (!isDev && developerOnlyPaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) {
    return <Navigate to="/support/home" replace />;
  }

  const getPageTitle = (path: string): string => {
    if (path === '/developer' || path === '/developer/' || path === '/developer/home' || path === '/support' || path === '/support/' || path === '/support/home' || path === '/home' || path === '/dashboard') {
      return 'Home';
    }
    if (path.includes('/developer/assigned')) return 'Assigned Issues';
    if (path.includes('/developer/all')) return 'All Issues';
    if (path.includes('/support/my-issues') || path.includes('/issues/my')) return 'My Issues';
    if (path.includes('/support/previous-issues') || path.includes('/issues/previous')) return 'Previous Issues';
    if (path.includes('/issues/new') || path.includes('/issues/report')) return 'Report New Issue';
    if (path.startsWith('/issues/')) return 'Issue Details';
    if (path.includes('/profile')) return 'Profile';
    return 'Home';
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="app-viewport">
      {/* Clean Sidebar */}
      <Sidebar
        isOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Fixed Stage */}
      <div className="main-stage">
        {/* Topbar */}
        <TopNavbar
          pageTitle={title}
          onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        />

        {/* Content Pane: Fits strictly within remaining viewport height */}
        <main className="content-pane">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
