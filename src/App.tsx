import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IssueProvider } from './context/IssueContext';
import { LoginPage, SignupPage } from './pages/auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { SupportDashboard, MyIssuesPage, PreviousIssuesPage } from './pages/support';
import { DeveloperDashboard, DeveloperAssignedIssuesPage, DeveloperAllIssuesPage } from './pages/developer';
import { IssueDetailsPage, IssueFormPage } from './pages/issues';
import { ProfilePage } from './pages/profile';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  if (isAuthenticated && currentUser) {
    const isDev = String(currentUser.role || '').toLowerCase().includes('dev');
    return <Navigate to={isDev ? '/developer/home' : '/support/home'} replace />;
  }
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <IssueProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Authenticated Dashboard Routes */}
              <Route element={<DashboardLayout />}>
                {/* Support Routes */}
                <Route path="/support/home" element={<SupportDashboard />} />
                <Route path="/support" element={<Navigate to="/support/home" replace />} />
                <Route path="/support/my-issues" element={<MyIssuesPage />} />
                <Route path="/support/previous-issues" element={<PreviousIssuesPage />} />

                {/* Developer Routes */}
                <Route path="/developer/home" element={<DeveloperDashboard />} />
                <Route path="/developer" element={<Navigate to="/developer/home" replace />} />
                <Route path="/developer/assigned" element={<DeveloperAssignedIssuesPage />} />
                <Route path="/developer/all" element={<DeveloperAllIssuesPage />} />

                {/* Legacy / Helper Redirects */}
                <Route path="/home" element={<Navigate to="/support/home" replace />} />
                <Route path="/dashboard" element={<Navigate to="/support/home" replace />} />
                <Route path="/issues/my" element={<Navigate to="/support/my-issues" replace />} />
                <Route path="/issues/all" element={<Navigate to="/support/my-issues" replace />} />
                <Route path="/issues/previous" element={<Navigate to="/support/previous-issues" replace />} />
                <Route path="/issues/new" element={<IssueFormPage />} />
                <Route path="/issues/report" element={<Navigate to="/issues/new" replace />} />

                {/* Shared Ticket Details & Profile */}
                <Route path="/issues/:id" element={<IssueDetailsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Default Root & Catch-all with smart session redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </IssueProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
