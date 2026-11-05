import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'light' | 'dark'; // 'dark' = for dark backgrounds (white text)
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  variant = 'light'
}) => {
  const iconSize = size === 'sm' ? 26 : size === 'lg' ? 44 : 34;
  const titleSize = size === 'sm' ? 'fs-6' : size === 'lg' ? 'fs-3' : 'fs-5';
  const subtitleSize = size === 'sm' ? '0.66rem' : size === 'lg' ? '0.8rem' : '0.7rem';

  const isDarkBg = variant === 'dark';

  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      {/* 4-square grid logo matching the reference image */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect x="2" y="2" width="14" height="14" rx="4" fill="#0d6efd" />
        <rect x="20" y="2" width="14" height="14" rx="4" fill="#6ea8fe" />
        <rect x="2" y="20" width="14" height="14" rx="4" fill="#0b5ed7" />
        <rect x="20" y="20" width="14" height="14" rx="4" fill="#3d8bfd" />
      </svg>

      <div className="d-flex flex-column lh-1">
        <span
          className={`fw-bold ${isDarkBg ? 'text-white' : 'text-navy'} ${titleSize}`}
          style={{ letterSpacing: '-0.3px' }}
        >
          Resolve<span className="text-primary">Hub</span>
        </span>
        {showSubtitle && (
          <span
            className={isDarkBg ? 'text-white-50 fw-normal mt-1' : 'text-secondary fw-medium mt-1'}
            style={{ fontSize: subtitleSize, letterSpacing: '0.2px' }}
          >
            Issue Management System
          </span>
        )}
      </div>
    </div>
  );
};
