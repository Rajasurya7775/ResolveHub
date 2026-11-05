import React, { createContext, useContext, useState, useEffect } from 'react';
import { Issue, DiscussionMessage } from '../types/issue';
import { ShiftType } from '../types/user';
import { INITIAL_ISSUES, INITIAL_DISCUSSIONS } from '../data/mockIssues';
import { useAuth } from './AuthContext';
import { getCurrentShift } from '../utils/shiftUtils';

interface AddIssueInput {
  projectId: Issue['projectId'];
  title: string;
  description: string;
  issueType: Issue['issueType'];
  occurrenceTime: string;
  shift?: ShiftType;
}

interface IssueContextType {
  issues: Issue[];
  discussions: Record<string, DiscussionMessage[]>;
  addIssue: (newIssueData: AddIssueInput) => Issue;
  updateIssue: (id: string, updatedFields: Partial<Issue>) => void;
  deleteIssue: (id: string) => boolean;
  addDiscussionMessage: (issueId: string, text: string) => void;
  getIssueById: (id: string) => Issue | undefined;
  getDiscussion: (issueId: string) => DiscussionMessage[];
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

const ISSUES_STORAGE_KEY = 'resolvehub_issues_data_v2';
const DISCUSSIONS_STORAGE_KEY = 'resolvehub_discussions_data_v2';

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [discussions, setDiscussions] = useState<Record<string, DiscussionMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(DISCUSSIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_DISCUSSIONS;
    } catch {
      return INITIAL_DISCUSSIONS;
    }
  });

  useEffect(() => {
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(DISCUSSIONS_STORAGE_KEY, JSON.stringify(discussions));
  }, [discussions]);

  const addIssue = (data: AddIssueInput): Issue => {
    // Generate next ID
    const numericIds = issues
      .map((i) => parseInt(i.id.replace('ISS-', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1009;
    const newId = `ISS-${nextNum}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const shortDesc =
      data.description.length > 85 ? `${data.description.substring(0, 85)}...` : data.description;

    const detectedShift = data.shift || getCurrentShift().shift;

    const newIssue: Issue = {
      id: newId,
      projectId: data.projectId,
      title: data.title,
      shortDescription: shortDesc,
      description: data.description,
      issueType: data.issueType,
      occurrenceTime: data.occurrenceTime,
      shift: detectedShift,
      reportedBy: currentUser?.name || 'Surya',
      reportedById: currentUser?.employeeId || 'EMP101',
      reportedDate: todayStr,
      acceptedDeveloper: 'Unassigned',
      status: 'Open',
      isEligibleForDelete: true
    };

    setIssues((prev) => [newIssue, ...prev]);

    // Initialize discussion thread
    setDiscussions((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `msg-${Date.now()}`,
          issueId: newId,
          senderId: currentUser?.employeeId || 'EMP101',
          senderName: currentUser?.name || 'Surya',
          senderRole: 'Supporter',
          message: `Issue reported: ${data.title}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }));

    return newIssue;
  };

  const updateIssue = (id: string, updatedFields: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const { acceptedDeveloper, status, acceptedDate, resolvedDate, ...allowed } = updatedFields;
          void acceptedDeveloper; void status; void acceptedDate; void resolvedDate;
          return { ...item, ...allowed };
        }
        return item;
      })
    );
  };

  const deleteIssue = (id: string): boolean => {
    const target = issues.find((i) => i.id === id);
    if (!target) return false;

    if (target.status !== 'Open' && !target.isEligibleForDelete) {
      return false;
    }

    setIssues((prev) => prev.filter((i) => i.id !== id));
    return true;
  };

  const addDiscussionMessage = (issueId: string, text: string) => {
    if (!text.trim()) return;

    const newMsg: DiscussionMessage = {
      id: `msg-${Date.now()}`,
      issueId,
      senderId: currentUser?.employeeId || 'EMP101',
      senderName: currentUser?.name || 'Surya',
      senderRole: (currentUser?.role as 'Supporter' | 'Developer' | 'Admin') || 'Supporter',
      message: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDiscussions((prev) => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), newMsg]
    }));
  };

  const getIssueById = (id: string): Issue | undefined => {
    return issues.find((i) => i.id === id);
  };

  const getDiscussion = (issueId: string): DiscussionMessage[] => {
    return discussions[issueId] || [];
  };

  return (
    <IssueContext.Provider
      value={{
        issues,
        discussions,
        addIssue,
        updateIssue,
        deleteIssue,
        addDiscussionMessage,
        getIssueById,
        getDiscussion
      }}
    >
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = (): IssueContextType => {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssues must be used within an IssueProvider');
  }
  return context;
};
