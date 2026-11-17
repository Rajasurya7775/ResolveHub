export type IssueStatus =
  | 'Open'
  | 'In progress'
  | 'In Progress'
  | 'Pending'
  | 'On Hold'
  | 'Escalated'
  | 'Resolved'
  | 'Accepted';

export type IssuePriority =
  | 'P0 – Critical'
  | 'P1 – High'
  | 'P2 – Moderate'
  | 'P3 – Low'
  | 'P4 – Negligible';

export type IssueCategory =
  | 'Front-end'
  | 'Backend'
  | 'Database'
  | 'Hardware'
  | 'Others';

export type IssueShift =
  | 'Shift-A'
  | 'Shift-B'
  | 'Shift-C'
  | 'General';

export type IssueProject = string;

export interface ProjectItem {
  id: string | number;
  name: string;
  description?: string;
}

export interface DeveloperItem {
  id: string | number;
  name: string;
  employeeId?: string;
  roleType?: string;
  email?: string;
}

export interface DiscussionMessage {
  id: string;
  issueId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Support' | 'Supporter' | 'Developer';
  message: string;
  timestamp: string;
}

export interface Issue {
  id: string; // The primary UUID or unique identifier for API operations
  issueId?: string; // UUID alias (e.g. 004cfd00-a551-4284-a397-6c0d77dd2b25)
  issueNumber?: string; // Human-readable issue code (e.g. RES-1012)
  issue_id?: string;
  issue_number?: string;
  projectId: string;
  projectName?: string;
  title: string;
  shortDescription: string;
  description: string;
  issueType: IssueCategory | string;
  occurrenceTime: string; // Calendar with time
  shift: IssueShift | string; // Shift-A, Shift-B, Shift-C, General
  reportedBy: string; // Supporter Name
  reportedById: string; // Supporter Employee ID
  reportedDate: string; // ISO date or formatted string
  acceptedDeveloper: string; // Developer Name or "Unassigned"
  acceptedDeveloperId?: string;
  acceptedDate?: string;
  status: IssueStatus;
  priority?: IssuePriority | string;
  assignedTo?: string;
  assignedToId?: string;
  rca?: string; // Root Cause Analysis (If available)
  resolvedDate?: string;
  isEligibleForDelete?: boolean;
}

export interface PaginationMetadata {
  total_items: number;
  total_pages: number;
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
  page_size?: number;
}

export interface PaginatedIssuesResponse {
  items: Issue[];
  pagination?: PaginationMetadata;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FetchIssuesParams {
  page?: number;
  pageSize?: number;
  project?: string;
  projectName?: string;
  issueType?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  shift?: string;
  status?: string;
  search?: string;
}
