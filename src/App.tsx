import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { IssueProvider } from './context/IssueContext';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { HomePage } from './pages/dashboard/HomePage';
import { MyIssuesPage } from './pages/issues/MyIssuesPage';
import { PreviousIssuesPage } from './pages/issues/PreviousIssuesPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { AdminPlaceholder } from './pages/admin/AdminPlaceholder';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <IssueProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Supporter Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/issues/my" element={<MyIssuesPage />} />
              <Route path="/issues/all" element={<Navigate to="/issues/my" replace />} />
              <Route path="/issues/previous" element={<PreviousIssuesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Developer / Admin Module Placeholder */}
            <Route path="/admin" element={<AdminPlaceholder />} />

            {/* Default Catch-all */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </IssueProvider>
    </AuthProvider>
  );
};

export default App;
