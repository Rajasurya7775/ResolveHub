import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Direct explicit imports (No barrel exports)
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { IssuesListPage } from '../pages/issues/IssuesListPage';
import { IssueDetailsPage } from '../pages/issues/IssueDetailsPage';
import { IssueFormPage } from '../pages/issues/IssueFormPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ================= PUBLIC AUTH ROUTES ================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* ================= PROTECTED DASHBOARD ROUTES ================= */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Support Routes */}
          <Route path="/support/home" element={<DashboardPage role="Support" />} />
          <Route path="/support" element={<Navigate to="/support/home" replace />} />
          <Route path="/support/my-issues" element={<IssuesListPage key="support-my" scope="my-issues" />} />
          <Route path="/support/previous-issues" element={<IssuesListPage key="support-prev" scope="previous-issues" />} />

          {/* Developer Routes */}
          <Route path="/developer/home" element={<DashboardPage role="Developer" />} />
          <Route path="/developer" element={<Navigate to="/developer/home" replace />} />
          <Route path="/developer/assigned" element={<IssuesListPage key="dev-assigned" scope="my-issues" />} />
          <Route path="/developer/all" element={<IssuesListPage key="dev-all" scope="previous-issues" />} />

          {/* Shared Incident Details, Reporting & Profile */}
          <Route path="/issues/new" element={<IssueFormPage />} />
          <Route path="/issues/:id" element={<IssueDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Backward-Compatible Shortcuts */}
          <Route path="/home" element={<Navigate to="/support/home" replace />} />
          <Route path="/dashboard" element={<Navigate to="/support/home" replace />} />
          <Route path="/issues/my" element={<Navigate to="/support/my-issues" replace />} />
          <Route path="/issues/all" element={<Navigate to="/support/my-issues" replace />} />
          <Route path="/issues/previous" element={<Navigate to="/support/previous-issues" replace />} />
          <Route path="/issues/report" element={<Navigate to="/issues/new" replace />} />
        </Route>
      </Route>

      {/* ================= CATCH-ALL & ROOT ================= */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
