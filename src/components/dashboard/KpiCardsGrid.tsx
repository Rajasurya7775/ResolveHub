import React from 'react';
import { RoleKpiConfig } from '../../config/roleConfig';

export interface KpiCardData {
  config: RoleKpiConfig;
  value: React.ReactNode;
  hint: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

export interface KpiCardsGridProps {
  cards: KpiCardData[];
  isLoading?: boolean;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ cards }) => {
  return (
    <div className="row g-3 flex-shrink-0">
      {cards.map((card, idx) => (
        <div key={idx} className="col-6 col-xl-3">
          <div className="kpi-card-reference">
            <div
              className="kpi-icon-badge"
              style={{ backgroundColor: card.iconBg, color: card.iconColor }}
            >
              <i className={`bi ${card.icon}`}></i>
            </div>
            <div>
              <span
                className="text-muted fw-semibold d-block text-uppercase"
                style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}
              >
                {card.config.label}
              </span>
              <h4
                className="fw-bold text-navy mb-0 mt-0.5"
                style={{
                  fontSize: '1.5rem',
                  letterSpacing: '-0.3px',
                  color: card.valueColor || undefined
                }}
              >
                {card.value}
              </h4>
              <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                {card.hint}
              </small>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCardsGrid;
