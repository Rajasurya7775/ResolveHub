import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  hasNext,
  hasPrevious,
  onPageChange,
  isLoading = false,
  className = ''
}) => {
  // If no items, show 0 range
  const startRange = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalItems);

  // Compute disabled states
  const canGoPrev = hasPrevious !== undefined ? hasPrevious : currentPage > 1;
  const canGoNext = hasNext !== undefined ? hasNext : currentPage < totalPages;

  // Build page numbers list with ellipsis for large ranges
  const getPageNumbers = (): (number | 'ellipsis-prev' | 'ellipsis-next')[] => {
    const safeTotalPages = Math.max(totalPages, 1);
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-prev' | 'ellipsis-next')[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis-prev');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(safeTotalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < safeTotalPages - 2) {
      pages.push('ellipsis-next');
    }

    pages.push(safeTotalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`px-3 py-2 border-top bg-light d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 flex-shrink-0 ${className}`}
    >
      {/* Current record range & totals */}
      <div className="d-flex align-items-center gap-2 text-center text-sm-start">
        <span className="small text-muted" style={{ fontSize: '0.78rem' }}>
          Showing <strong className="text-navy">{startRange}–{endRange}</strong> of{' '}
          <strong className="text-navy">{totalItems}</strong> issues
        </span>
        {totalPages > 0 && (
          <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill" style={{ fontSize: '0.7rem' }}>
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
        )}
      </div>

      {/* Pagination controls: Previous 1 2 3 4 Next */}
      <nav aria-label="Issue list pagination" className="d-flex justify-content-center">
        <ul className="pagination pagination-sm mb-0 align-items-center gap-1 flex-wrap justify-content-center">
          
          {/* Previous Button */}
          <li className={`page-item ${!canGoPrev || isLoading ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link rounded-2 px-2.5 py-1 d-inline-flex align-items-center"
              style={{ fontSize: '0.78rem' }}
              disabled={!canGoPrev || isLoading}
              onClick={() => canGoPrev && onPageChange(currentPage - 1)}
              aria-label="Previous Page"
            >
              <i className="bi bi-chevron-left me-1" style={{ fontSize: '0.7rem' }}></i>
              Previous
            </button>
          </li>

          {/* Numbered Page Buttons */}
          {pageNumbers.map((item, idx) => {
            if (item === 'ellipsis-prev' || item === 'ellipsis-next') {
              return (
                <li key={`ellipsis-${idx}`} className="page-item disabled">
                  <span className="page-link border-0 bg-transparent px-1.5 py-1 text-muted" style={{ fontSize: '0.78rem' }}>
                    …
                  </span>
                </li>
              );
            }

            const pageNum = item as number;
            const isActive = pageNum === currentPage;

            return (
              <li key={`page-${pageNum}`} className={`page-item ${isActive ? 'active' : ''}`}>
                <button
                  type="button"
                  className={`page-link rounded-2 px-2.5 py-1 fw-medium ${
                    isActive ? 'bg-primary text-white border-primary shadow-sm' : 'text-navy'
                  }`}
                  style={{ fontSize: '0.78rem', minWidth: '32px', textAlign: 'center' }}
                  disabled={isLoading}
                  onClick={() => onPageChange(pageNum)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              </li>
            );
          })}

          {/* Next Button */}
          <li className={`page-item ${!canGoNext || isLoading ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link rounded-2 px-2.5 py-1 d-inline-flex align-items-center"
              style={{ fontSize: '0.78rem' }}
              disabled={!canGoNext || isLoading}
              onClick={() => canGoNext && onPageChange(currentPage + 1)}
              aria-label="Next Page"
            >
              Next
              <i className="bi bi-chevron-right ms-1" style={{ fontSize: '0.7rem' }}></i>
            </button>
          </li>

        </ul>
      </nav>
    </div>
  );
};

