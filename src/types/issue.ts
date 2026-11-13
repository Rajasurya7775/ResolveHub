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
  id: string; // e.g. "ISS-1001"
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
