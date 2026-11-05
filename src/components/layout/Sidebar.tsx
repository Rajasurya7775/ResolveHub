import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/home', label: 'Home', icon: 'bi-house-door-fill' },
    { to: '/issues/my', label: 'My Issues', icon: 'bi-list-ul' },
    { to: '/issues/previous', label: 'Previous Issues', icon: 'bi-clock-history' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={onCloseMobile}
        />
      )}

      {/* Dark Navy Sidebar Matching Screenshot */}
      <aside
        className={`app-sidebar-dark ${
          isOpen ? 'd-flex' : 'd-none d-lg-flex'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between" style={{ height: 'var(--topbar-height)' }}>
          <BrandLogo size="sm" variant="dark" />
          <button
            type="button"
            className="btn btn-sm btn-link text-white-50 d-lg-none p-1"
            onClick={onCloseMobile}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Clean Nav Links */}
        <nav className="flex-grow-1 px-1 py-3 overflow-y-auto">
          <div className="px-3 mb-2 text-uppercase text-white-50 fw-semibold" style={{ fontSize: '0.66rem', letterSpacing: '1px' }}>
            MENU
          </div>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `sidebar-nav-item-dark ${isActive ? 'active' : ''}`
              }
            >
              <i className={`bi ${link.icon} fs-5`}></i>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Profile and Logout Section */}
        <div className="border-top border-secondary border-opacity-25 p-2">
          <NavLink
            to="/profile"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `sidebar-nav-item-dark mb-1 ${isActive ? 'active' : ''}`
            }
          >
            <i className="bi bi-person fs-5"></i>
            <span>Profile</span>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-nav-item-dark sidebar-logout-btn w-100 border-0 bg-transparent text-start"
          >
            <i className="bi bi-box-arrow-right fs-5"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
