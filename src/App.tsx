import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { IssueProvider } from './context/IssueContext';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { HomePage } from './pages/dashboard/HomePage';
import { MyIssuesPage } from './pages/issues/MyIssuesPage';
import { PreviousIssuesPage } from './pages/issues/PreviousIssuesPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { IssueFormPage } from './pages/issues/IssueFormPage';
import { DeveloperDashboard } from './pages/developer/DeveloperDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IssueProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Authenticated Supporter Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/issues/new" element={<IssueFormPage />} />
              <Route path="/issues/report" element={<Navigate to="/issues/new" replace />} />
              <Route path="/issues/my" element={<MyIssuesPage />} />
              <Route path="/issues/all" element={<Navigate to="/issues/my" replace />} />
              <Route path="/issues/previous" element={<PreviousIssuesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Developer Module */}
            <Route path="/developer" element={<DeveloperDashboard />} />

            {/* Default Catch-all */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </IssueProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
