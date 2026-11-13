import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SignupFormData } from '../../types/user';
import { BrandLogo } from '../../components/common/BrandLogo';

const DEVELOPER_ROLE_TYPES = [
  'Frontend',
  'Backend',
  'Database',
  'Others'
];

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Exactly matching the requested field format:
  // "employee_id", "full_name", "email", "phone_number", "password", "role_type", "role"
  // Role is NOT pre-selected by default (user must choose Support or Developer)
  const [formData, setFormData] = useState<SignupFormData>({
    employee_id: '',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role_type: '',
    role: '' as any
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Toggle between Support and Developer
  const handleRoleChange = (newRole: 'Support' | 'Developer') => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      // For Support: designation is auto-assigned as 'Support Engineer' (no selection required)
      // For Developer: defaults to 'Frontend'
      role_type: newRole === 'Support' ? 'Support Engineer' : (prev.role === 'Developer' && prev.role_type ? prev.role_type : DEVELOPER_ROLE_TYPES[0])
    }));

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.role;
      delete copy.role_type;
      return copy;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.role) {
      errs.role = 'Please select your role (Support or Developer) at the top.';
    }

    if (!formData.employee_id.trim()) {
      errs.employee_id = 'Employee ID is required (e.g. EMP109).';
    } else if (formData.employee_id.trim().length < 3) {
      errs.employee_id = 'Employee ID must be at least 3 characters.';
    }

    if (!formData.full_name.trim()) {
      errs.full_name = 'Full Name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.phone_number.trim()) {
      errs.phone_number = 'Phone number is required.';
    }

    // Role type validation only applies to Developer
    if (formData.role === 'Developer' && !formData.role_type.trim()) {
      errs.role_type = 'Developer Role Type is required.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (formData.password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup(formData);
      setIsSubmitting(false);

      if (result.success) {
        setSignupSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: {
              registeredId: formData.employee_id,
              registeredEmail: formData.email,
              message: 'Account created successfully! Please log in with your credentials.'
            }
          });
        }, 1500);
      } else {
        setServerError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setServerError(err.message || 'Registration error occurred.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="container-xl my-auto py-2 py-sm-3">
        <div className="row g-3 g-xl-4 align-items-center justify-content-center">
          
          {/* ================= LEFT COLUMN: HERO BRANDING ================= */}
          <div className="col-12 col-lg-5 col-xl-5 pe-lg-3 d-none d-lg-flex flex-column justify-content-center">
            <div className="mb-3">
              <BrandLogo size="lg" />
            </div>

            <h1
              className="fw-bold text-navy lh-sm mb-2"
              style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.5rem)', letterSpacing: '-0.5px' }}
            >
              Join Resolve<span className="text-primary">Hub</span>
            </h1>

            <p className="text-secondary mb-4" style={{ fontSize: '0.96rem', lineHeight: 1.55 }}>
              Register your employee profile to track, report, and collaborate on production incidents with role-based access.
            </p>
          </div>

          {/* ================= RIGHT COLUMN: SIGNUP CARD ================= */}
          <div className="col-12 col-sm-11 col-md-9 col-lg-7 col-xl-6">
            <div className="signup-card-container">
              
              {/* Card Header */}
              <div className="text-center mb-3">
                <span
                  className="d-block text-muted fw-bold mb-0.5"
                  style={{ fontSize: '0.72rem', letterSpacing: '2.5px' }}
                >
                  ACCOUNT REGISTRATION
                </span>
                <h2 className="fw-bold text-navy mb-0.5" style={{ fontSize: '1.75rem', letterSpacing: '-0.4px' }}>
                  Create Account
                </h2>
                <p className="text-muted small mb-0" style={{ fontSize: '0.84rem' }}>
                  Enter your employee credentials to get started
                </p>
              </div>

              {/* Server Alert Message */}
              {serverError && (
                <div className="alert alert-danger py-1.5 px-3 small rounded-3 d-flex align-items-center mb-2.5">
                  <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                  <span>{serverError}</span>
                </div>
              )}

              {/* Success Notification */}
              {signupSuccess && (
                <div className="alert alert-success py-2.5 px-3 small rounded-3 d-flex align-items-center mb-3 shadow-xs">
                  <i className="bi bi-check-circle-fill me-2 fs-5 text-success flex-shrink-0"></i>
                  <div>
                    <strong className="d-block text-success-emphasis">Account created successfully!</strong>
                    <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                      Redirecting you to the Login page...
                    </span>
                  </div>
                </div>
              )}

              {/* Role Selection Tiles: ONLY TWO OPTIONS (Support & Developer) - Not selected by default */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1.5">
                  <label className="form-label small fw-semibold text-muted mb-0">
                    Select Your Role: <span className="text-danger">*</span>
                  </label>
                  {!formData.role && (
                    <span className="badge bg-warning-subtle text-warning-emphasis small">Required</span>
                  )}
                </div>
                <div className="row g-2.5">
                  
                  {/* 1. Support Tile */}
                  <div className="col-6">
                    <div
                      className={`role-card-minimal py-2.5 px-2 text-center h-100 ${
                        formData.role === 'Support' ? 'selected' : ''
                      }`}
                      onClick={() => handleRoleChange('Support')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                        <i
                          className={`bi bi-headset fs-5 ${
                            formData.role === 'Support' ? 'text-primary' : 'text-secondary'
                          }`}
                        ></i>
                        <span className="fw-bold text-navy" style={{ fontSize: '0.92rem' }}>
                          Support
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                        Incident reporting & shift triage
                      </div>
                      {formData.role === 'Support' && (
                        <div className="role-check-badge">
                          <i className="bi bi-check-lg"></i>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Developer Tile */}
                  <div className="col-6">
                    <div
                      className={`role-card-minimal py-2.5 px-2 text-center h-100 ${
                        formData.role === 'Developer' ? 'selected' : ''
                      }`}
                      onClick={() => handleRoleChange('Developer')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                        <i
                          className={`bi bi-code-slash fs-5 ${
                            formData.role === 'Developer' ? 'text-primary' : 'text-secondary'
                          }`}
                        ></i>
                        <span className="fw-bold text-navy" style={{ fontSize: '0.92rem' }}>
                          Developer
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                        Incident diagnostics & bug fixes
                      </div>
                      {formData.role === 'Developer' && (
                        <div className="role-check-badge">
                          <i className="bi bi-check-lg"></i>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {errors.role && (
                  <div className="text-danger small mt-1.5" style={{ fontSize: '0.74rem' }}>
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.role}
                  </div>
                )}
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-2.5">
                  
                  {/* 1. employee_id */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Employee ID <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-person-badge leading-icon"></i>
                      <input
                        type="text"
                        name="employee_id"
                        className={`form-control custom-form-control ${errors.employee_id ? 'is-invalid border-danger' : ''}`}
                        placeholder="e.g. EMP109"
                        value={formData.employee_id}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.employee_id && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.employee_id}
                      </div>
                    )}
                  </div>

                  {/* 2. full_name */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-person leading-icon"></i>
                      <input
                        type="text"
                        name="full_name"
                        className={`form-control custom-form-control ${errors.full_name ? 'is-invalid border-danger' : ''}`}
                        placeholder="e.g. Alex Morgan"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.full_name && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.full_name}
                      </div>
                    )}
                  </div>

                  {/* 3. email */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-envelope leading-icon"></i>
                      <input
                        type="email"
                        name="email"
                        className={`form-control custom-form-control ${errors.email ? 'is-invalid border-danger' : ''}`}
                        placeholder="e.g. alex@resolvehub.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.email && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.email}
                      </div>
                    )}
                  </div>

                  {/* 4. phone_number */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-telephone leading-icon"></i>
                      <input
                        type="tel"
                        name="phone_number"
                        className={`form-control custom-form-control ${errors.phone_number ? 'is-invalid border-danger' : ''}`}
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.phone_number && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.phone_number}
                      </div>
                    )}
                  </div>

                  {/* 5. Role Designation / Role Type */}
                  {/* FOR SUPPORT: No role-type dropdown selection. Show only designation: Support Engineer */}
                  {formData.role === 'Support' && (
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                        Designation
                      </label>
                      <div className="p-2.5 rounded-3 bg-light border d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-workspace text-primary fs-5"></i>
                          <div>
                            <div className="fw-bold text-navy" style={{ fontSize: '0.9rem' }}>Support Engineer</div>
                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Assigned automatically for Support operations</small>
                          </div>
                        </div>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-1 fw-semibold small">
                          Support Engineer
                        </span>
                      </div>
                    </div>
                  )}

                  {/* FOR DEVELOPER: Display role type dropdown with exact options: Frontend, Backend, Database, Others */}
                  {formData.role === 'Developer' && (
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                        Role Type <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-group">
                        <i className="bi bi-diagram-3 leading-icon"></i>
                        <select
                          name="role_type"
                          className={`form-select custom-form-control ${errors.role_type ? 'is-invalid border-danger' : ''}`}
                          value={formData.role_type}
                          onChange={handleChange}
                        >
                          {DEVELOPER_ROLE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.role_type && (
                        <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                          {errors.role_type}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. password */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-lock leading-icon"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className={`form-control custom-form-control ${errors.password ? 'is-invalid border-danger' : ''}`}
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={handleChange}
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
                    {errors.password && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.password}
                      </div>
                    )}
                  </div>

                  {/* 7. Confirm Password */}
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-group">
                      <i className="bi bi-shield-lock leading-icon"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        className={`form-control custom-form-control ${errors.confirmPassword ? 'is-invalid border-danger' : ''}`}
                        placeholder="Re-type password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) {
                            setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                          }
                        }}
                        required
                      />
                    </div>
                    {errors.confirmPassword && (
                      <div className="text-danger small mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>

                </div>

                {/* Submit Row */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-3 mt-1 border-top">
                  <div className="text-secondary small">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                      Log In
                    </Link>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary-action px-4 py-2"
                    disabled={isSubmitting || signupSuccess}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Registering...
                      </>
                    ) : (
                      'Sign Up'
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
