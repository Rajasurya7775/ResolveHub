import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../services/api/apiClient';

const DEBOUNCE_COOLDOWN_MS = 300;     // Prevent duplicate API calls on message bursts
const FALLBACK_POLL_INTERVAL_MS = 30000; // Background fallback sync if SSE is offline

export interface DashboardSSEOptions {
  url?: string | null;
  enabled?: boolean;
}

export interface DashboardSSEReturn {
  isConnected: boolean;
  lastEvent: any;
  reconnect: () => void;
}

/**
 * Resolves the primary SSE endpoint URL for dashboard events.
 * Priority:
 * 1. customUrl passed directly to the hook
 * 2. VITE_SSE_URL in environment variables
 * 3. ${API_BASE_URL}/dashboard/events
 */
export function getDashboardSSEUrl(customUrl: string | null = null): string {
  if (customUrl) {
    return customUrl;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SSE_URL) {
    const envSseUrl = import.meta.env.VITE_SSE_URL.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (envSseUrl) {
      return envSseUrl;
    }
  }

  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/dashboard/events`;
}

/**
 * Custom React Hook: useDashboardSSE
 *
 * Establishes a real-time Server-Sent Events (SSE) connection with the backend
 * endpoint `/api/v1/dashboard/events`. Automatically triggers `onDashboardUpdated`
 * whenever new dashboard events, issue modifications, or metric updates arrive.
 */
export function useDashboardSSE(
  onDashboardUpdated: (payload?: any) => void,
  options: DashboardSSEOptions = {}
): DashboardSSEReturn {
  const { url = null, enabled = true } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  // Maintain latest callback via useRef to avoid re-triggering connection effect
  const callbackRef = useRef<(payload?: any) => void>(onDashboardUpdated);
  useEffect(() => {
    callbackRef.current = onDashboardUpdated;
  }, [onDashboardUpdated]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastFiredTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const fallbackPollTimerRef = useRef<any>(null);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);

  // Debounced callback invocation to prevent burst floods
  const triggerUpdate = useCallback((payload?: any) => {
    const now = Date.now();
    const timeSinceLast = now - lastFiredTimeRef.current;

    if (timeSinceLast >= DEBOUNCE_COOLDOWN_MS) {
      lastFiredTimeRef.current = now;
      try {
        callbackRef.current?.(payload);
      } catch (err) {
        console.error('[useDashboardSSE] Error executing update callback:', err);
      }
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        lastFiredTimeRef.current = Date.now();
        try {
          callbackRef.current?.(payload);
        } catch (err) {
          console.error('[useDashboardSSE] Error executing debounced callback:', err);
        }
      }, DEBOUNCE_COOLDOWN_MS - timeSinceLast);
    }
  }, []);

  // Manual reconnect trigger
  const reconnect = useCallback(() => {
    setReconnectCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const sseUrl = getDashboardSSEUrl(url);

    // Close any previous connection
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {}
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      // 1. Generic message handler
      eventSource.onmessage = (event) => {
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          setLastEvent(data);
          triggerUpdate(data);
        } catch {
          setLastEvent(event.data);
          triggerUpdate({ raw: event.data });
        }
      };

      // 2. Named custom event listeners supported by FastAPI SSE
      const handleNamedEvent = (event: any) => {
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          setLastEvent(data);
          triggerUpdate(data);
        } catch {
          triggerUpdate();
        }
      };

      eventSource.addEventListener('dashboard_updated', handleNamedEvent);
      eventSource.addEventListener('issue_created', handleNamedEvent);
      eventSource.addEventListener('issue_updated', handleNamedEvent);
      eventSource.addEventListener('issue_resolved', handleNamedEvent);
      eventSource.addEventListener('metric_update', handleNamedEvent);

      // Keepalive ping from server
      eventSource.addEventListener('ping', () => {
        setIsConnected(true);
      });

      eventSource.onerror = (err) => {
        console.warn(`[useDashboardSSE] SSE disconnected from ${sseUrl}:`, err);
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('[useDashboardSSE] Failed to instantiate EventSource:', err);
      setIsConnected(false);
    }

    // 3. Fallback polling interval: if SSE drops, poll every 30s to keep metrics fresh
    fallbackPollTimerRef.current = setInterval(() => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        triggerUpdate({ fallback: true });
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current);
      }
      setIsConnected(false);
    };
  }, [enabled, url, reconnectCounter, triggerUpdate]);

  return {
    isConnected,
    lastEvent,
    reconnect
  };
}

export default useDashboardSSE;
