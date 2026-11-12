import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Issue, DiscussionMessage } from '../types/issue';
import { ShiftType } from '../types/user';
import { useAuth } from './AuthContext';
import { getCurrentShift } from '../utils/shiftUtils';
import {
  apiFetchMyIssues,
  apiFetchPreviousIssues,
  apiCreateIssue,
  apiDeleteIssue,
  apiSendMessage,
  apiFetchMessages
} from '../services/api/issueService';
import { useLocation } from 'react-router-dom';

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
  myIssues: Issue[];
  previousIssues: Issue[];
  discussions: Record<string, DiscussionMessage[]>;

  isLoading: boolean;
  apiError: string | null;
  myIssuesError: string | null;
  previousIssuesError: string | null;

  refreshIssues: () => Promise<void>;
  refreshMyIssues: () => Promise<void>;
  refreshPreviousIssues: () => Promise<void>;

  addIssue: (newIssueData: AddIssueInput) => Promise<Issue>;
  updateIssue: (id: string, updatedFields: Partial<Issue>) => void;
  deleteIssue: (id: string) => Promise<boolean>;
  addDiscussionMessage: (issueId: string, text: string) => Promise<void>;
  getIssueById: (id: string) => Issue | undefined;
  getDiscussion: (issueId: string) => DiscussionMessage[];
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

const MY_ISSUES_STORAGE_KEY = 'resolvehub_my_issues_v3';
const PREVIOUS_ISSUES_STORAGE_KEY = 'resolvehub_previous_issues_v3';
const DISCUSSIONS_STORAGE_KEY = 'resolvehub_discussions_data_v2';

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const isMock = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
  const location = useLocation();

  // No mock data: purely dynamic lists initialized empty or from user session cache
  const [myIssues, setMyIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(MY_ISSUES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [previousIssues, setPreviousIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(PREVIOUS_ISSUES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [myIssuesError, setMyIssuesError] = useState<string | null>(null);
  const [previousIssuesError, setPreviousIssuesError] = useState<string | null>(null);

  // 1. Fetch My Issues: GET /my-issues/
  const refreshMyIssues = useCallback(async () => {
    if (isMock) return;
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return; // Do not fetch if unauthenticated
    if (location?.pathname.includes('/login') || location?.pathname.includes('/signup')) return;

    setIsLoading(true);
    setMyIssuesError(null);

    const res = await apiFetchMyIssues();
    setIsLoading(false);

    if (res.success && res.data) {
      setMyIssues(res.data);
    } else {
      setMyIssuesError(res.message || 'Failed to fetch My Issues.');
    }
  }, [isMock, location?.pathname]);

  // 2. Fetch Previous Issues: GET /previous-issues/
  const refreshPreviousIssues = useCallback(async () => {
    if (isMock) return;
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return; // Do not fetch if unauthenticated
    if (location?.pathname.includes('/login') || location?.pathname.includes('/signup')) return;

    setIsLoading(true);
    setPreviousIssuesError(null);

    const res = await apiFetchPreviousIssues();
    setIsLoading(false);

    if (res.success && res.data) {
      setPreviousIssues(res.data);
    } else {
      setPreviousIssuesError(res.message || 'Failed to fetch Previous Issues.');
    }
  }, [isMock, location?.pathname]);

  // Combined refresh
  const refreshIssues = useCallback(async () => {
    const token = localStorage.getItem('resolvehub_auth_token');
    if (!token) return;
    await Promise.all([refreshMyIssues(), refreshPreviousIssues()]);
  }, [refreshMyIssues, refreshPreviousIssues]);

  // ONLY fetch issues when user is logged in with active session / token!
  // Prevents any calls to /my-issues/ or /previous-issues/ when on login/signup pages!
  useEffect(() => {
    const token = localStorage.getItem('resolvehub_auth_token');
    const isAuthPage = location?.pathname.includes('/login') || location?.pathname.includes('/signup');
    if (!isMock && isAuthenticated && currentUser && token && !isAuthPage) {
      refreshIssues();
    } else if (!isAuthenticated) {
      // Clear cached data on logout
      setMyIssues([]);
      setPreviousIssues([]);
      setDiscussions({});
    }
  }, [isMock, isAuthenticated, currentUser?.id, refreshIssues, location?.pathname]);

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
    const detectedShift = data.shift || getCurrentShift().shift;
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
        shift: detectedShift,
        reportedById: currentUser?.employeeId || currentUser?.id,
        reportedBy: currentUser?.name
      });

      if (apiRes.success && apiRes.data) {
        setMyIssues((prev) => [apiRes.data!, ...prev]);
        return apiRes.data;
      }
    }

    // Fallback if backend returns created issue or for local state
    const newId = `ISS-${Date.now().toString().slice(-4)}`;
    const newIssue: Issue = {
      id: newId,
      projectId: data.projectId,
      title: data.title,
      shortDescription: shortDesc,
      description: data.description,
      issueType: data.issueType,
      occurrenceTime: data.occurrenceTime,
      shift: detectedShift,
      reportedBy: currentUser?.name || 'User',
      reportedById: currentUser?.employeeId || currentUser?.id || 'EMP',
      reportedDate: todayStr,
      acceptedDeveloper: 'Unassigned',
      status: 'Open',
      isEligibleForDelete: true
    };

    setMyIssues((prev) => [newIssue, ...prev]);
    return newIssue;
  };

  const updateIssue = (id: string, updatedFields: Partial<Issue>) => {
    setMyIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
    setPreviousIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  const deleteIssue = async (id: string): Promise<boolean> => {
    const target = myIssues.find((i) => i.id === id);
    if (!target) return false;

    if (!isMock) {
      await apiDeleteIssue(id);
    }

    setMyIssues((prev) => prev.filter((i) => i.id !== id));
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
    return myIssues.find((i) => i.id === id) || previousIssues.find((i) => i.id === id);
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
        issues: myIssues,
        myIssues,
        previousIssues,
        discussions,
        isLoading,
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
