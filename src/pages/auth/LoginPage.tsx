import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
import { BrandLogo } from '../../components/common/BrandLogo';
import { LoginHeroGraphic } from '../../components/auth/LoginHeroGraphic';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setSelectedRole, login } = useAuth();

  const [identifier, setIdentifier] = useState('surya@resolvehub.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'Supporter') {
      setIdentifier('surya@resolvehub.com');
    } else {
      setIdentifier('arun@resolvehub.com');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    setTimeout(() => {
      const result = login(selectedRole, identifier, password);
      setIsSubmitting(false);

      if (result.success) {
        if (selectedRole === 'Supporter') {
          navigate('/home');
        } else {
          navigate('/admin');
        }
      } else {
        setErrorMsg(result.message || 'Authentication failed. Please verify your credentials.');
      }
    }, 350);
  };

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

            {/* Hero Graphic - Scaled cleanly to fill column */}
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

              {/* Clean Role Selection Cards */}
              <div className="row g-2.5 mb-3">
                
                {/* Supporter Tile */}
                <div className="col-6">
                  <div
                    className={`role-card-minimal h-100 ${selectedRole === 'Supporter' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('Supporter')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                      <i className={`bi bi-headset fs-5 ${selectedRole === 'Supporter' ? 'text-primary' : 'text-secondary'}`}></i>
                      <span className="fw-bold text-navy" style={{ fontSize: '0.95rem' }}>Supporter</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                      Support Team Members
                    </div>

                    {selectedRole === 'Supporter' && (
                      <div className="role-check-badge">
                        <i className="bi bi-check-lg"></i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Tile */}
                <div className="col-6">
                  <div
                    className={`role-card-minimal h-100 ${selectedRole === 'Admin' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('Admin')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                      <i className={`bi bi-code-square fs-5 ${selectedRole === 'Admin' ? 'text-primary' : 'text-secondary'}`}></i>
                      <span className="fw-bold text-navy" style={{ fontSize: '0.95rem' }}>Admin</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                      Developers & Admins
                    </div>

                    {selectedRole === 'Admin' && (
                      <div className="role-check-badge">
                        <i className="bi bi-check-lg"></i>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Sub-greeting */}
              <div className="text-center text-muted mb-2.5" style={{ fontSize: '0.88rem' }}>
                Hello! Please login to continue
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="alert alert-danger py-1.5 px-3 small rounded-3 d-flex align-items-center mb-2.5">
                  <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                
                {/* Email / Username */}
                <div className="mb-2.5">
                  <div className="input-icon-group">
                    <i className="bi bi-envelope leading-icon"></i>
                    <input
                      type="text"
                      className="form-control custom-form-control"
                      placeholder="Email or Employee ID"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
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
                    <a
                      href="#signup"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Account provisioning is managed by ResolveHub IT Directory.');
                      }}
                      className="text-primary text-decoration-none fw-semibold"
                    >
                      Sign Up
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary-action px-4 py-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Logging in...
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
