import React from 'react';
import { Issue } from '../../types/issue';
import { StatusBadge } from '../common/StatusBadge';

export interface IssueTableProps {
  issues: Issue[];
  isLoading: boolean;
  onRowClick: (issue: Issue) => void;
  emptyMessage?: string;
}

export const IssueTable: React.FC<IssueTableProps> = ({
  issues,
  isLoading,
  onRowClick,
  emptyMessage = 'No issues found matching your selected filters.'
}) => {
  return (
    <div className="table-scroll-area">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
          <tr className="small text-muted text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.4px' }}>
            <th style={{ minWidth: '95px', width: '95px' }}>Issue ID</th>
            <th style={{ minWidth: '160px' }}>Project</th>
            <th style={{ minWidth: '220px' }}>Issue Title</th>
            <th style={{ minWidth: '110px' }}>Issue Type</th>
            <th style={{ minWidth: '110px' }}>Status</th>
            <th style={{ minWidth: '140px' }}>Resolved By</th>
            <th style={{ minWidth: '115px' }}>Created Date</th>
            <th style={{ minWidth: '95px' }}>Shift</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Loading issues...
              </td>
            </tr>
          ) : issues.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-2 d-block mb-1 text-secondary opacity-50"></i>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            issues.map((issue) => {
              const displayProject =
                typeof issue.projectName === 'string' && issue.projectName
                  ? issue.projectName
                  : typeof issue.projectId === 'string' && issue.projectId
                    ? issue.projectId
                    : ((issue.projectName as any)?.project_name ||
                      (issue.projectId as any)?.project_name ||
                      (issue.projectName as any)?.name ||
                      'General Project');

              return (
                <tr
                  key={issue.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onRowClick(issue)}
                  title="Click row to view issue details"
                >
                  <td className="fw-bold text-primary small">
                    {issue.issueNumber || issue.id}
                  </td>
                  <td className="small text-navy fw-medium text-truncate" style={{ maxWidth: '180px' }} title={displayProject}>
                    {displayProject}
                  </td>
                  <td className="small text-navy fw-semibold text-truncate" style={{ maxWidth: '240px' }} title={issue.title}>
                    {issue.title}
                  </td>
                  <td>
                    <span className="badge bg-light text-navy border small">
                      {issue.issueType || 'General'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={issue.status} size="sm" />
                  </td>
                  <td className="small text-secondary">
                    {issue.acceptedDeveloper || (
                      <span className="text-muted fst-italic">Unassigned</span>
                    )}
                  </td>
                  <td className="small text-secondary">
                    {issue.reportedDate || issue.resolvedDate || '-'}
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                      {issue.shift || 'Shift-A'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default IssueTable;
