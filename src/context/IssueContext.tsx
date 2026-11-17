import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Issue, DiscussionMessage, IssueStatus, PaginatedIssuesResponse } from '../types/issue';
import { useAuth } from './AuthContext';
import {
  apiFetchMyIssues,
  apiFetchPreviousIssues,
  apiCreateIssue,
  apiUpdateIssue,
  apiDeleteIssue,
  apiSendMessage,
  apiFetchMessages
} from '../services/api/issueService';
import { useLocation } from 'react-router-dom';

export interface AddIssueInput {
  projectId: string;
  shift: string;
  occurrenceTime: string;
  title: string;
  description: string;
  issueType: string;
  rca?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  assignedToId?: string;
}

interface IssueContextType {
  issues: Issue[];
  myIssues: Issue[];
  previousIssues: Issue[];
  discussions: Record<string, DiscussionMessage[]>;

  isLoading: boolean;
  apiError: string | null;
  myIssuesError: string | null;
  previousIssuesError: string | null;

  refreshIssues: () => Promise<void>;
  myIssuesPagination: Omit<PaginatedIssuesResponse, 'items'>;
  previousIssuesPagination: Omit<PaginatedIssuesResponse, 'items'>;
  refreshMyIssues: (page?: number) => Promise<void>;
  refreshPreviousIssues: (page?: number) => Promise<void>;

  addIssue: (newIssueData: AddIssueInput) => Promise<Issue>;
  updateIssue: (id: string, updatedFields: Partial<Issue>, source?: 'my-issues' | 'previous-issues') => Promise<void>;
  deleteIssue: (id: string, source?: 'my-issues' | 'previous-issues') => Promise<boolean>;
  addDiscussionMessage: (issueId: string, text: string) => Promise<void>;
  getIssueById: (id: string) => Issue | undefined;
  getDiscussion: (issueId: string) => DiscussionMessage[];
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

const MY_ISSUES_STORAGE_KEY = 'resolvehub_my_issues_v3';
const PREVIOUS_ISSUES_STORAGE_KEY = 'resolvehub_previous_issues_v3';
const DISCUSSIONS_STORAGE_KEY = 'resolvehub_discussions_data_v2';
const ISSUE_PAGE_SIZE = 10;

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const isMock = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
  const location = useLocation();

  // No mock data: purely dynamic lists initialized empty or from user session cache
  const [myIssues, setMyIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(MY_ISSUES_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      return [];
    } catch {
      return [];
    }
  });

  const [previousIssues, setPreviousIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(PREVIOUS_ISSUES_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      return [];
    } catch {
      return [];
    }
  });

  const [discussions, setDiscussions] = useState<Record<string, DiscussionMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(DISCUSSIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const initialPagination = {
    total: 0,
    page: 1,
    pageSize: ISSUE_PAGE_SIZE,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false
  };

  const [myIssuesPagination, setMyIssuesPagination] = useState<Omit<PaginatedIssuesResponse, 'items'>>(initialPagination);
  const [previousIssuesPagination, setPreviousIssuesPagination] = useState<Omit<PaginatedIssuesResponse, 'items'>>(initialPagination);
  const [myIssuesLoading, setMyIssuesLoading] = useState<boolean>(false);
  const [previousIssuesLoading, setPreviousIssuesLoading] = useState<boolean>(false);
  const isLoading = myIssuesLoading || previousIssuesLoading;
  const [myIssuesError, setMyIssuesError] = useState<string | null>(null);
  const [previousIssuesError, setPreviousIssuesError] = useState<string | null>(null);

  // Fetch one page of My Issues from the backend.
  const refreshMyIssues = useCallback(async (page: number = 1) => {
    if (isMock) return;
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return;
    if (location?.pathname.includes('/login') || location?.pathname.includes('/signup')) return;

    setMyIssuesLoading(true);
    setMyIssuesError(null);

    try {
      const res = await apiFetchMyIssues({ page, pageSize: ISSUE_PAGE_SIZE });
      if (res.success && res.data) {
        setMyIssues(Array.isArray(res.data.items) ? res.data.items : []);
        const total = res.data.pagination?.total_items ?? res.data.total;
        const curPage = res.data.pagination?.current_page ?? res.data.page;
        const size = res.data.pagination?.page_size ?? res.data.pageSize;
        const pages = res.data.pagination?.total_pages ?? res.data.totalPages;
        const next = res.data.pagination?.has_next ?? res.data.hasNext;
        const prev = res.data.pagination?.has_previous ?? res.data.hasPrevious;
        setMyIssuesPagination({
          total,
          page: curPage,
          pageSize: size,
          totalPages: pages,
          hasNext: next,
          hasPrevious: prev
        });
      } else {
        setMyIssuesError(res.message || 'Failed to fetch My Issues.');
      }
    } finally {
      setMyIssuesLoading(false);
    }
  }, [isMock, location?.pathname]);

  // Fetch one page of Previous Issues from the backend.
  const refreshPreviousIssues = useCallback(async (page: number = 1) => {
    if (isMock) return;
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return;
    if (location?.pathname.includes('/login') || location?.pathname.includes('/signup')) return;

    setPreviousIssuesLoading(true);
    setPreviousIssuesError(null);

    try {
      const res = await apiFetchPreviousIssues({ page, pageSize: ISSUE_PAGE_SIZE });
      if (res.success && res.data) {
        setPreviousIssues(Array.isArray(res.data.items) ? res.data.items : []);
        const total = res.data.pagination?.total_items ?? res.data.total;
        const curPage = res.data.pagination?.current_page ?? res.data.page;
        const size = res.data.pagination?.page_size ?? res.data.pageSize;
        const pages = res.data.pagination?.total_pages ?? res.data.totalPages;
        const next = res.data.pagination?.has_next ?? res.data.hasNext;
        const prev = res.data.pagination?.has_previous ?? res.data.hasPrevious;
        setPreviousIssuesPagination({
          total,
          page: curPage,
          pageSize: size,
          totalPages: pages,
          hasNext: next,
          hasPrevious: prev
        });
      } else {
        setPreviousIssuesError(res.message || 'Failed to fetch Previous Issues.');
      }
    } finally {
      setPreviousIssuesLoading(false);
    }
  }, [isMock, location?.pathname]);

  // Combined refresh
  const refreshIssues = useCallback(async () => {
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return;
    await Promise.all([refreshMyIssues(), refreshPreviousIssues()]);
  }, [refreshMyIssues, refreshPreviousIssues]);

  // Clear cached data on logout (Page-based lazy fetching handles actual API calls when visiting pages)
  useEffect(() => {
    if (!isAuthenticated) {
      setMyIssues([]);
      setPreviousIssues([]);
      setMyIssuesPagination(initialPagination);
      setPreviousIssuesPagination(initialPagination);
      setDiscussions({});
    }
  }, [isAuthenticated]);

  // Sync to session storage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(MY_ISSUES_STORAGE_KEY, JSON.stringify(myIssues));
    } else {
      localStorage.removeItem(MY_ISSUES_STORAGE_KEY);
    }
  }, [myIssues, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(PREVIOUS_ISSUES_STORAGE_KEY, JSON.stringify(previousIssues));
    } else {
      localStorage.removeItem(PREVIOUS_ISSUES_STORAGE_KEY);
    }
  }, [previousIssues, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(DISCUSSIONS_STORAGE_KEY, JSON.stringify(discussions));
    } else {
      localStorage.removeItem(DISCUSSIONS_STORAGE_KEY);
    }
  }, [discussions, isAuthenticated]);

  const addIssue = async (data: AddIssueInput): Promise<Issue> => {
    const chosenShift = data.shift || 'Shift-A';
    const shortDesc =
      data.description.length > 85 ? `${data.description.substring(0, 85)}...` : data.description;
    const todayStr = new Date().toISOString().split('T')[0];

    // Live backend creation
    if (!isMock) {
      const apiRes = await apiCreateIssue({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        issueType: data.issueType,
        occurrenceTime: data.occurrenceTime,
        shift: chosenShift,
        status: (data.status as IssueStatus) || 'Open',
        priority: data.priority || 'P2 – Moderate',
        rca: data.rca,
        assignedTo: data.assignedTo,
        assignedToId: data.assignedToId,
        reportedById: currentUser?.employeeId || currentUser?.id,
        reportedBy: currentUser?.name
      });

      if (apiRes.success && apiRes.data) {
        setMyIssues((prev) => [apiRes.data!, ...prev]);
        return apiRes.data;
      }
    }

    // Fallback for local state
    const newId = `ISS-${Date.now().toString().slice(-4)}`;
    const newIssue: Issue = {
      id: newId,
      projectId: data.projectId,
      title: data.title,
      shortDescription: shortDesc,
      description: data.description,
      issueType: data.issueType,
      occurrenceTime: data.occurrenceTime,
      shift: chosenShift,
      status: (data.status as IssueStatus) || 'Open',
      priority: data.priority || 'P2 – Moderate',
      rca: data.rca,
      acceptedDeveloper: data.assignedTo || 'Unassigned',
      acceptedDeveloperId: data.assignedToId,
      reportedBy: currentUser?.name || 'User',
      reportedById: currentUser?.employeeId || currentUser?.id || 'EMP',
      reportedDate: todayStr,
      isEligibleForDelete: true
    };

    setMyIssues((prev) => [newIssue, ...prev]);
    return newIssue;
  };

  const updateIssue = async (
    id: string,
    updatedFields: Partial<Issue>,
    source?: 'my-issues' | 'previous-issues'
  ) => {
    if (!isMock) {
      await apiUpdateIssue(id, updatedFields, source);
    }
    setMyIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
    setPreviousIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  const deleteIssue = async (
    id: string,
    source?: 'my-issues' | 'previous-issues'
  ): Promise<boolean> => {
    if (!isMock) {
      await apiDeleteIssue(id, source);
    }

    setMyIssues((prev) => prev.filter((i) => i.id !== id));
    setPreviousIssues((prev) => prev.filter((i) => i.id !== id));
    return true;
  };

  const addDiscussionMessage = async (issueId: string, text: string) => {
    if (!text.trim()) return;

    if (!isMock) {
      const apiRes = await apiSendMessage(
        issueId,
        text.trim(),
        currentUser?.employeeId || currentUser?.id
      );

      if (apiRes.success && apiRes.message) {
        setDiscussions((prev) => ({
          ...prev,
          [issueId]: [...(prev[issueId] || []), apiRes.message!]
        }));
        return;
      }
    }

    const newMsg: DiscussionMessage = {
      id: `msg-${Date.now()}`,
      issueId,
      senderId: currentUser?.employeeId || currentUser?.id || '',
      senderName: currentUser?.name || 'User',
      senderRole: (currentUser?.role as 'Support' | 'Supporter' | 'Developer') || 'Support',
      message: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDiscussions((prev) => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), newMsg]
    }));
  };

  const getIssueById = (id: string): Issue | undefined => {
    return (
      myIssues.find((i) => i.id === id || i.issueNumber === id || i.issueId === id) ||
      previousIssues.find((i) => i.id === id || i.issueNumber === id || i.issueId === id)
    );
  };

  const getDiscussion = (issueId: string): DiscussionMessage[] => {
    if (!discussions[issueId] && !isMock) {
      apiFetchMessages(issueId).then((msgs) => {
        if (msgs.length > 0) {
          setDiscussions((prev) => ({ ...prev, [issueId]: msgs }));
        }
      });
    }
    return discussions[issueId] || [];
  };

  return (
    <IssueContext.Provider
      value={{
        issues: Array.isArray(myIssues) ? myIssues : [],
        myIssues: Array.isArray(myIssues) ? myIssues : [],
        previousIssues: Array.isArray(previousIssues) ? previousIssues : [],
        discussions,
        isLoading,
        myIssuesPagination,
        previousIssuesPagination,
        apiError: myIssuesError || previousIssuesError,
        myIssuesError,
        previousIssuesError,
        refreshIssues,
        refreshMyIssues,
        refreshPreviousIssues,
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
