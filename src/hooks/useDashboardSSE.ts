import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL, getAuthToken } from '../services/api/apiClient';

const INITIAL_RECONNECT_DELAY_MS = 1000; // 1 second initial delay
const MAX_RECONNECT_DELAY_MS = 30000;     // 30 seconds maximum delay
const BACKOFF_FACTOR = 2;
const DEBOUNCE_COOLDOWN_MS = 300;         // Prevent duplicate API refresh calls on rapid event bursts

export type SSEConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface DashboardSSEEvent {
  event: string;
  data: unknown;
  id?: string;
}

export interface DashboardSSEOptions {
  url?: string | null;
  enabled?: boolean;
}

export interface DashboardSSEReturn {
  connectionState: SSEConnectionState;
  isConnected: boolean;
  error: string | null;
  lastEvent: DashboardSSEEvent | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Resolves the SSE endpoint URL for dashboard live updates.
 * Defaults to `${API_BASE_URL}/dashboard/events` (e.g. http://10.x.x.x:8003/api/v1/dashboard/events).
 */
export function getDashboardSSEUrl(customUrl: string | null = null): string {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SSE_URL) {
    const envSseUrl = import.meta.env.VITE_SSE_URL.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (envSseUrl) {
      return envSseUrl;
    }
  }

  return `${API_BASE_URL}/dashboard/events`;
}

/**
 * Parses raw SSE event data safely without throwing on malformed payloads.
 */
function safeParseEventData(rawData: string): unknown {
  const trimmed = rawData.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

/**
 * Custom React Hook: useDashboardSSE
 *
 * Connects to the backend Server-Sent Events (SSE) endpoint to receive live dashboard updates.
 * - Uses native EventSource (withCredentials: true) when no Bearer header is required.
 * - Uses authenticated fetch streaming (Authorization: Bearer <token>, without exposing tokens
 *   in URL query strings) when a Bearer token is stored in localStorage.
 * - Handles exponential reconnection backoff (1s initial up to 30s max) and debounces rapid bursts.
 */
export function useDashboardSSE(
  onDashboardUpdated: (event?: DashboardSSEEvent) => void,
  options: DashboardSSEOptions = {}
): DashboardSSEReturn {
  const { url = null, enabled = true } = options;

  const [connectionState, setConnectionState] = useState<SSEConnectionState>(
    enabled ? 'reconnecting' : 'disconnected'
  );
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardSSEEvent | null>(null);

  const callbackRef = useRef<(event?: DashboardSSEEvent) => void>(onDashboardUpdated);
  useEffect(() => {
    callbackRef.current = onDashboardUpdated;
  }, [onDashboardUpdated]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef<number>(INITIAL_RECONNECT_DELAY_MS);
  const isUnmountedRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);
  const lastTriggerTimeRef = useRef<number>(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const closeActiveTransport = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.onopen = null;
      eventSourceRef.current.onmessage = null;
      eventSourceRef.current.onerror = null;
      try {
        eventSourceRef.current.close();
      } catch {
        // ignore close errors
      }
      eventSourceRef.current = null;
    }

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore abort errors
      }
      abortControllerRef.current = null;
    }

    isConnectingRef.current = false;
  }, []);

  const triggerRefresh = useCallback((sseEvent: DashboardSSEEvent) => {
    const now = Date.now();
    setLastEvent(sseEvent);

    if (now - lastTriggerTimeRef.current < DEBOUNCE_COOLDOWN_MS) {
      return;
    }
    lastTriggerTimeRef.current = now;

    if (typeof callbackRef.current === 'function') {
      try {
        callbackRef.current(sseEvent);
      } catch (err) {
        console.error('[useDashboardSSE] Error executing dashboard refresh callback:', err);
      }
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connectFn: () => void) => {
      if (isUnmountedRef.current || !enabled) return;
      if (reconnectTimeoutRef.current !== null) return;

      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * BACKOFF_FACTOR,
        MAX_RECONNECT_DELAY_MS
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (!isUnmountedRef.current && enabled) {
          setConnectionState('reconnecting');
          connectFn();
        }
      }, delay);
    },
    [enabled]
  );

  const connect = useCallback(() => {
    if (!enabled || isUnmountedRef.current) {
      setConnectionState('disconnected');
      return;
    }

    // Prevent duplicate concurrent connections
    if (
      isConnectingRef.current ||
      abortControllerRef.current !== null ||
      (eventSourceRef.current &&
        (eventSourceRef.current.readyState === EventSource.OPEN ||
          eventSourceRef.current.readyState === EventSource.CONNECTING))
    ) {
      return;
    }

    const targetUrl = getDashboardSSEUrl(url);
    const token = getAuthToken();

    isConnectingRef.current = true;
    clearReconnectTimer();

    // Native EventSource cannot attach custom Authorization headers and tokens must never
    // be placed in URL query strings. Use authenticated fetch SSE stream when a Bearer token
    // is stored, and native EventSource with cookie credentials otherwise.
    if (!token && typeof EventSource !== 'undefined') {
      try {
        const es = new EventSource(targetUrl, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isUnmountedRef.current) {
            es.close();
            return;
          }
          isConnectingRef.current = false;
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
          setError(null);
          setConnectionState('connected');
        };

        es.onmessage = (event: MessageEvent) => {
          if (isUnmountedRef.current) return;
          if (typeof event.data !== 'string' || !event.data.trim()) return;

          const parsed = safeParseEventData(event.data);
          triggerRefresh({
            event: event.type || 'message',
            data: parsed,
            id: event.lastEventId || undefined
          });
        };

        es.onerror = () => {
          if (isUnmountedRef.current) return;
          closeActiveTransport();
          setError('Dashboard SSE connection interrupted.');
          setConnectionState('error');
          scheduleReconnect(connect);
        };
      } catch (err: any) {
        closeActiveTransport();
        setError(err?.message || 'Failed to open dashboard EventSource connection.');
        setConnectionState('error');
        scheduleReconnect(connect);
      }
      return;
    }

    // Authenticated SSE stream over fetch (preserves Authorization: Bearer without query tokens)
    const controller = new AbortController();
    abortControllerRef.current = controller;

    (async () => {
      try {
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache'
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
          signal: controller.signal
        });

        if (isUnmountedRef.current || controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error(`SSE endpoint returned HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('SSE response stream body is unavailable.');
        }

        isConnectingRef.current = false;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        setError(null);
        setConnectionState('connected');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEventName = 'message';
        let currentEventId: string | undefined;
        let dataLines: string[] = [];

        const dispatchBufferedEvent = () => {
          if (dataLines.length === 0) {
            currentEventName = 'message';
            currentEventId = undefined;
            return;
          }

          const rawPayload = dataLines.join('\n');
          const eventName = currentEventName || 'message';
          const eventId = currentEventId;

          currentEventName = 'message';
          currentEventId = undefined;
          dataLines = [];

          if (!rawPayload.trim()) return;

          const parsed = safeParseEventData(rawPayload);
          triggerRefresh({
            event: eventName,
            data: parsed,
            id: eventId
          });
        };

        while (!isUnmountedRef.current && !controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) {
            dispatchBufferedEvent();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r\n|\n|\r/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line === '') {
              dispatchBufferedEvent();
              continue;
            }

            // Ignore SSE comment / keepalive lines
            if (line.startsWith(':')) {
              continue;
            }

            const colonIdx = line.indexOf(':');
            const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
            const rawValue = colonIdx === -1 ? '' : line.slice(colonIdx + 1);
            const val = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

            if (field === 'event') {
              currentEventName = val || 'message';
            } else if (field === 'data') {
              dataLines.push(val);
            } else if (field === 'id') {
              currentEventId = val;
            } else if (field === 'retry') {
              const serverRetry = Number(val);
              if (Number.isFinite(serverRetry) && serverRetry > 0) {
                reconnectDelayRef.current = Math.min(
                  Math.max(serverRetry, INITIAL_RECONNECT_DELAY_MS),
                  MAX_RECONNECT_DELAY_MS
                );
              }
            }
          }
        }

        // Stream closed cleanly or unexpectedly by server
        if (!isUnmountedRef.current && !controller.signal.aborted && enabled) {
          closeActiveTransport();
          setError('Dashboard SSE stream closed by server.');
          setConnectionState('error');
          scheduleReconnect(connect);
        }
      } catch (err: any) {
        if (isUnmountedRef.current || controller.signal.aborted || err?.name === 'AbortError') {
          return;
        }
        closeActiveTransport();
        setError(err?.message || 'Dashboard SSE connection error.');
        setConnectionState('error');
        scheduleReconnect(connect);
      }
    })();
  }, [enabled, url, clearReconnectTimer, closeActiveTransport, triggerRefresh, scheduleReconnect]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    closeActiveTransport();
    setConnectionState('disconnected');
  }, [clearReconnectTimer, closeActiveTransport]);

  const reconnect = useCallback(() => {
    clearReconnectTimer();
    closeActiveTransport();
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
    setError(null);
    if (enabled && !isUnmountedRef.current) {
      setConnectionState('reconnecting');
      connect();
    }
  }, [clearReconnectTimer, closeActiveTransport, connect, enabled]);

  useEffect(() => {
    isUnmountedRef.current = false;
    if (enabled) {
      setConnectionState('reconnecting');
      connect();
    } else {
      disconnect();
    }

    return () => {
      isUnmountedRef.current = true;
      clearReconnectTimer();
      closeActiveTransport();
    };
  }, [enabled, connect, disconnect, clearReconnectTimer, closeActiveTransport]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    error,
    lastEvent,
    reconnect,
    disconnect
  };
}

export default useDashboardSSE;
