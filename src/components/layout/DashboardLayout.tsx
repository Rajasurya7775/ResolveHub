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

  // Role-based authorization: Developers must only access Developer dashboard
  if (currentUser?.role === 'Developer') {
    return <Navigate to="/developer" replace />;
  }

  const getPageTitle = (path: string): string => {
    if (path.includes('/home') || path.includes('/dashboard')) return 'Home';
    if (path.includes('/issues/new') || path.includes('/issues/report')) return 'Report New Issue';
    if (path.includes('/issues/my') || path.includes('/issues/all')) return 'My Issues';
    if (path.includes('/issues/previous')) return 'Previous Issues';
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
