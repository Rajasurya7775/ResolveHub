import { ShiftType } from './user';

export type IssueStatus = 'Open' | 'Accepted' | 'In Progress' | 'Resolved';

export type IssueProject =
  | 'Nokia Production Dashboard'
  | 'Manufacturing Analytics'
  | 'Inventory Monitoring'
  | 'Network Monitoring';

export type IssueCategory =
  | 'Production Issue'
  | 'Dashboard Issue'
  | 'Network Issue'
  | 'Application Issue'
  | 'Hardware Issue'
  | 'Other';

export interface DiscussionMessage {
  id: string;
  issueId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Supporter' | 'Developer' | 'Admin';
  message: string;
  timestamp: string;
}

export interface Issue {
  id: string; // e.g. "ISS-1001"
  projectId: IssueProject;
  title: string;
  shortDescription: string;
  description: string;
  issueType: IssueCategory;
  occurrenceTime: string;
  shift: ShiftType; // Shift A, Shift B, or Shift C
  reportedBy: string; // Supporter Name
  reportedById: string; // Supporter Employee ID
  reportedDate: string; // ISO date or formatted string
  acceptedDeveloper: string; // "Unassigned" or Developer Name
  acceptedDeveloperId?: string;
  acceptedDate?: string;
  status: IssueStatus;
  rca?: string; // Root Cause Analysis
  resolvedDate?: string;
  isEligibleForDelete?: boolean;
}
