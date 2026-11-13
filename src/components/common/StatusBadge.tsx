import React from 'react';
import { IssueStatus } from '../../types/issue';

interface StatusBadgeProps {
  status: IssueStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeClass = 'badge-status-open';
  let icon = 'bi-circle-fill';

  const normalized = String(status || '').trim();

  switch (normalized) {
    case 'Open':
      badgeClass = 'badge-status-open';
      icon = 'bi-exclamation-circle';
      break;
    case 'Accepted':
      badgeClass = 'badge-status-accepted';
      icon = 'bi-person-check';
      break;
    case 'In Progress':
    case 'In progress':
      badgeClass = 'badge-status-in-progress';
      icon = 'bi-arrow-repeat';
      break;
    case 'Pending':
      badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      icon = 'bi-clock-history';
      break;
    case 'On Hold':
      badgeClass = 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle';
      icon = 'bi-pause-circle';
      break;
    case 'Escalated':
      badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
      icon = 'bi-exclamation-triangle-fill';
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
