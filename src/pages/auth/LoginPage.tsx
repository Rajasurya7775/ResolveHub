import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
import { BrandLogo } from '../../components/common/BrandLogo';
import { LoginHeroGraphic } from '../../components/auth/LoginHeroGraphic';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRole, setSelectedRole, login } = useAuth();

  const stateMsg = (location.state as any)?.message;
  const prefillId = (location.state as any)?.registeredId || (location.state as any)?.registeredEmail || '';

  // No mock data: purely user-entered credentials (or prefilled from recent signup)
  const [identifier, setIdentifier] = useState(prefillId);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(stateMsg || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your Email or Employee ID.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(selectedRole, identifier, password);
      setIsSubmitting(false);

      if (result.success) {
        // Navigate based on the authenticated user's role returned by the backend
        const userRole = result.user?.role || selectedRole;
        if (userRole === 'Developer') {
          navigate('/developer');
        } else {
          navigate('/home');
        }
      } else {
        setErrorMsg(result.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Authentication error occurred.');
    }
  };

  const isSupportActive = selectedRole === 'Support' || selectedRole === 'Supporter';
  const isDeveloperActive = selectedRole === 'Developer';

  return (
    <div className="login-page-wrapper">
      <div className="container-xl my-auto py-2 py-sm-3">
        <div className="row g-3 g-xl-5 align-items-center justify-content-center">
          
          {/* ================= LEFT COLUMN: HERO BRANDING ================= */}
          <div className="col-12 col-lg-6 col-xl-6 pe-lg-3 pe-xl-4 d-flex flex-column justify-content-center">
            
            {/* Top Brand Logo */}
            <div className="mb-2 mb-xl-3">
              <BrandLogo size="lg" />
            </div>

            {/* Hero Heading */}
            <div className="mb-2 mb-xl-3">
              <h1 className="fw-bold text-navy lh-sm mb-1.5" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.5px' }}>
                Manage Issues <span className="text-primary">Together</span>
              </h1>
              <p className="text-secondary mb-2" style={{ maxWidth: '480px', fontSize: '0.96rem', lineHeight: 1.5 }}>
                Track, assign, collaborate and resolve technical incidents efficiently with role-based access.
              </p>
            </div>

            {/* Hero Graphic */}
            <div className="my-1 d-none d-md-block" style={{ maxHeight: 'min(290px, 32vh)' }}>
              <LoginHeroGraphic />
            </div>

          </div>

          {/* ================= RIGHT COLUMN: LOGIN CARD ================= */}
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <div className="login-card-container">
              
              {/* Card Header */}
              <div className="text-center mb-3">
                <span
                  className="d-block text-muted fw-bold mb-1"
                  style={{ fontSize: '0.74rem', letterSpacing: '2.5px' }}
                >
                  WELCOME TO
                </span>
                <h2 className="fw-bold text-navy mb-0.5" style={{ fontSize: '1.95rem', letterSpacing: '-0.4px' }}>
                  Resolve<span className="text-primary">Hub</span>
                </h2>
                <p className="text-muted small mb-0" style={{ fontSize: '0.86rem' }}>
                  Issue Management System
                </p>
              </div>

              {/* Role Selection Cards: ONLY Support & Developer */}
              <div className="row g-2.5 mb-3">
                
                {/* Support Tile */}
                <div className="col-6">
                  <div
                    className={`role-card-minimal h-100 ${isSupportActive ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('Support')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                      <i className={`bi bi-headset fs-5 ${isSupportActive ? 'text-primary' : 'text-secondary'}`}></i>
                      <span className="fw-bold text-navy" style={{ fontSize: '0.95rem' }}>Support</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                      Incident Reporting & Shifts
                    </div>

                    {isSupportActive && (
                      <div className="role-check-badge">
                        <i className="bi bi-check-lg"></i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Developer Tile */}
                <div className="col-6">
                  <div
                    className={`role-card-minimal h-100 ${isDeveloperActive ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('Developer')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                      <i className={`bi bi-code-slash fs-5 ${isDeveloperActive ? 'text-primary' : 'text-secondary'}`}></i>
                      <span className="fw-bold text-navy" style={{ fontSize: '0.95rem' }}>Developer</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                      Triage & Bug Fixes
                    </div>

                    {isDeveloperActive && (
                      <div className="role-check-badge">
                        <i className="bi bi-check-lg"></i>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Sub-greeting */}
              <div className="text-center text-muted mb-2.5" style={{ fontSize: '0.88rem' }}>
                Login to access your <strong>{isSupportActive ? 'Support' : 'Developer'}</strong> console
              </div>

              {/* Success Alert from Signup */}
              {successMsg && (
                <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center justify-content-between mb-2.5">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2 fs-6 flex-shrink-0"></i>
                    <span>{successMsg}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    onClick={() => setSuccessMsg('')}
                  ></button>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center mb-2.5">
                  <i className="bi bi-exclamation-triangle-fill me-2 fs-6 flex-shrink-0"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                
                {/* Email / Employee ID */}
                <div className="mb-2.5">
                  <div className="input-icon-group">
                    <i className="bi bi-person-badge leading-icon"></i>
                    <input
                      type="text"
                      className="form-control custom-form-control"
                      placeholder="Email or Employee ID"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password with Eye Toggle */}
                <div className="mb-3">
                  <div className="input-icon-group">
                    <i className="bi bi-lock leading-icon"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control custom-form-control"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="trailing-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Submit Row */}
                <div className="d-flex align-items-center justify-content-between pt-1">
                  <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    No account?{' '}
                    <Link
                      to="/signup"
                      className="text-primary text-decoration-none fw-semibold"
                    >
                      Sign Up
                    </Link>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary-action px-4 py-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Authenticating...
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
