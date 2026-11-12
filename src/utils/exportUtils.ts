import { Issue } from '../types/issue';

/**
 * Utility to export an array of Issue objects to a sanitized CSV file
 */
export function exportIssuesToCsv(issues: Issue[], filename = 'resolvehub_issues.csv'): void {
  if (!issues || issues.length === 0) {
    alert('No issues available to export.');
    return;
  }

  const headers = [
    'Issue ID',
    'Title',
    'Project',
    'Category',
    'Status',
    'Shift',
    'Occurrence Time',
    'Reported By',
    'Reported Date',
    'Accepted Developer',
    'Resolved Date',
    'Root Cause Analysis (RCA)'
  ];

  const escapeCsvField = (val: string | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = issues.map((issue) => [
    escapeCsvField(issue.id),
    escapeCsvField(issue.title),
    escapeCsvField(issue.projectId),
    escapeCsvField(issue.issueType),
    escapeCsvField(issue.status),
    escapeCsvField(issue.shift),
    escapeCsvField(issue.occurrenceTime),
    escapeCsvField(issue.reportedBy),
    escapeCsvField(issue.reportedDate),
    escapeCsvField(issue.acceptedDeveloper),
    escapeCsvField(issue.resolvedDate || ''),
    escapeCsvField(issue.rca || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

