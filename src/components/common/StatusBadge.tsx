import React from 'react';
import { IssueStatus } from '../../types/issue';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeClass = 'badge-status-open';
  let icon = 'bi-circle-fill';

  switch (status) {
    case 'Open':
      badgeClass = 'badge-status-open';
      icon = 'bi-exclamation-circle';
      break;
    case 'Accepted':
      badgeClass = 'badge-status-accepted';
      icon = 'bi-person-check';
      break;
    case 'In Progress':
      badgeClass = 'badge-status-in-progress';
      icon = 'bi-arrow-repeat';
      break;
    case 'Resolved':
      badgeClass = 'badge-status-resolved';
      icon = 'bi-check-circle-fill';
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const fontSize = size === 'sm' ? '0.75rem' : '0.82rem';

  return (
    <span
      className={`d-inline-flex align-items-center gap-1.5 rounded-pill fw-semibold ${padding} ${badgeClass}`}
      style={{ fontSize, letterSpacing: '0.2px' }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: '0.75rem' }}></i>
      {status}
    </span>
  );
};

