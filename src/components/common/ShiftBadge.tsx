import React from 'react';
import { getCurrentShift } from '../../utils/shiftUtils';

export const ShiftBadge: React.FC = () => {
  const currentShift = getCurrentShift();

  return (
    <div className="d-inline-flex align-items-center gap-1.5 bg-light border border-primary-subtle px-3 py-1 rounded-pill shadow-sm">
      <span className="badge bg-primary text-white rounded-pill px-2.5 py-0.5 fw-bold">
        {currentShift.shift}
      </span>
    </div>
  );
};
