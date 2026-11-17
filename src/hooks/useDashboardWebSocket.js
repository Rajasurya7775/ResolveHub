import { useEffect, useRef, useState, useCallback } from 'react';

const INITIAL_RECONNECT_DELAY_MS = 1000; // 1 second initial backoff
const MAX_RECONNECT_DELAY_MS = 30000;     // 30 seconds max backoff as specified
const BACKOFF_FACTOR = 1.5;
const DEBOUNCE_COOLDOWN_MS = 300;         // Prevent duplicate API calls on message bursts
const HEARTBEAT_INTERVAL_MS = 25000;      // 25s keepalive ping to prevent idle connection drops

/**
 * Normalizes host from an API URL or environment string
 */
function extractHostAndProtocol(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { host: 'localhost:8000', isSecure: false };
  }

  // 1. Clean quotes and whitespace
  let clean = rawUrl.trim().replace(/^['"]+|['"]+$/g, '').trim();

  // 2. Detect HTTPS/WSS
  const isSecure =
    (typeof window !== 'undefined' && window.location.protocol === 'https:') ||
    /^https:/i.test(clean) ||
    /^wss:/i.test(clean);

  // 3. Strip any leading protocols, slashes or whitespace
  clean = clean.replace(/^(https?:|wss?:)?\s*\/\/+/i, '').replace(/^\/+/, '').replace(/\/+$/, '');

  // 4. Strip path elements like /api/v1 if present to isolate host:port
  const host = clean.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '');

  return { host: host || 'localhost:8000', isSecure };
}

/**
 * Returns candidate WebSocket URLs for the FastAPI backend.
 * Provides both `/ws/dashboard` and `/api/v1/ws/dashboard` for maximum compatibility.
 */
export function getCandidateWebSocketUrls(customUrl = null) {
  if (customUrl) {
    return [customUrl];
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) {
    const envWsUrl = import.meta.env.VITE_WS_URL.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (envWsUrl) {
      return [envWsUrl];
    }
  }

  const rawApiBase =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    'http://localhost:8000/api/v1';

  const { host, isSecure } = extractHostAndProtocol(rawApiBase);
  const protocol = isSecure ? 'wss:' : 'ws:';

  return [
    `${protocol}//${host}/ws/dashboard`,
    `${protocol}//${host}/api/v1/ws/dashboard`
  ];
}

/**
 * Resolves the primary FastAPI WebSocket URL
 */
export function getDashboardWebSocketUrl(customUrl = null) {
  const candidates = getCandidateWebSocketUrls(customUrl);
  return candidates[0];
}

/**
 * Custom React Hook: useDashboardWebSocket
 *
 * Establishes a resilient, auto-reconnecting WebSocket connection with the FastAPI backend.
 * Listens for `dashboard_updated`, `issue_created`, `issue_updated` events and triggers
 * the callback to refresh dashboard KPIs & charts immediately.
 *
 * @param {Function} onDashboardUpdated - Callback triggered when real-time update is received
 * @param {Object} [options] - Configuration options
 * @param {string} [options.url] - Optional override WebSocket URL
 * @param {boolean} [options.enabled=true] - Toggle connection active state
 * @returns {{ isConnected: boolean, lastEvent: any, reconnect: Function }}
 */
export function useDashboardWebSocket(onDashboardUpdated, options = {}) {
  const { url = null, enabled = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  // Maintain latest callback via useRef
  const callbackRef = useRef(onDashboardUpdated);
  useEffect(() => {
    callbackRef.current = onDashboardUpdated;
  }, [onDashboardUpdated]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const candidateIndexRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const lastTriggerTimeRef = useRef(0);

  // Safe trigger with debounce to avoid firing multiple duplicate API calls on rapid bursts
  const triggerRefresh = useCallback((payload) => {
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < DEBOUNCE_COOLDOWN_MS) {
      return;
    }
    lastTriggerTimeRef.current = now;
    setLastEvent(payload);

    console.log('[useDashboardWebSocket] Real-time event received, triggering dashboard refresh:', payload);

    if (typeof callbackRef.current === 'function') {
      try {
        callbackRef.current(payload);
      } catch (err) {
        console.error('[useDashboardWebSocket] Error executing refresh callback:', err);
      }
    }
  }, []);

  const clearHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore send error
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const connect = useCallback(() => {
    if (!enabled || isUnmountedRef.current) return;

    // Prevent duplicate active connections
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const candidates = getCandidateWebSocketUrls(url);
    const candidateUrl = candidates[candidateIndexRef.current % candidates.length];

    try {
      let targetUrl = candidateUrl;
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('resolvehub_auth_token') : null;
      if (token) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(token)}`;
      }

      console.log(`[useDashboardWebSocket] Connecting to real-time endpoint: ${targetUrl}`);
      const socket = new WebSocket(targetUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isUnmountedRef.current) {
          socket.close();
          return;
        }
        console.log(`[useDashboardWebSocket] Connected successfully to ${candidateUrl}`);
        setIsConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        startHeartbeat();

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        if (isUnmountedRef.current) return;

        try {
          let parsedData = null;
          if (typeof event.data === 'string') {
            try {
              parsedData = JSON.parse(event.data);
            } catch {
              parsedData = { event: event.data };
            }
          } else {
            parsedData = event.data;
          }

          // Ignore server heartbeat responses
          if (parsedData?.type === 'pong' || parsedData?.event === 'pong') {
            return;
          }

          const eventIdentifier = String(
            parsedData?.event || parsedData?.type || parsedData?.action || parsedData?.message || ''
          ).toLowerCase();

          const rawDataString = typeof event.data === 'string' ? event.data.toLowerCase() : '';

          // Match dashboard updates or issue lifecycle changes
          const isDashboardEvent =
            eventIdentifier.includes('dashboard_updated') ||
            eventIdentifier.includes('issue_created') ||
            eventIdentifier.includes('issue_updated') ||
            eventIdentifier.includes('issue_deleted') ||
            eventIdentifier.includes('issue_') ||
            rawDataString.includes('dashboard_updated') ||
            rawDataString.includes('issue_created');

          if (isDashboardEvent) {
            triggerRefresh(parsedData);
          }
        } catch (err) {
          console.warn('[useDashboardWebSocket] Error parsing incoming message:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn(`[useDashboardWebSocket] WebSocket error on ${candidateUrl}:`, err);
        setIsConnected(false);
      };

      socket.onclose = (closeEvent) => {
        clearHeartbeat();
        setIsConnected(false);
        wsRef.current = null;

        if (!isUnmountedRef.current && enabled) {
          console.log(
            `[useDashboardWebSocket] Disconnected (code: ${closeEvent.code}). Reconnecting in ${reconnectDelayRef.current}ms...`
          );

          // Cycle candidate endpoint if connection was rejected
          if (closeEvent.code !== 1000) {
            candidateIndexRef.current = (candidateIndexRef.current + 1) % candidates.length;
          }

          if (!reconnectTimeoutRef.current) {
            const nextDelay = reconnectDelayRef.current;
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              reconnectDelayRef.current = Math.min(
                reconnectDelayRef.current * BACKOFF_FACTOR,
                MAX_RECONNECT_DELAY_MS
              );
              connect();
            }, nextDelay);
          }
        }
      };
    } catch (err) {
      console.warn('[useDashboardWebSocket] Failed to instantiate WebSocket:', err);
      candidateIndexRef.current = (candidateIndexRef.current + 1) % candidates.length;
      if (!isUnmountedRef.current && enabled && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * BACKOFF_FACTOR,
            MAX_RECONNECT_DELAY_MS
          );
          connect();
        }, reconnectDelayRef.current);
      }
    }
  }, [enabled, url, triggerRefresh]);

  const reconnect = useCallback(() => {
    clearHeartbeat();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
    }
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
    candidateIndexRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearHeartbeat();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        try {
          wsRef.current.close(1000, 'Component unmounted');
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    reconnect
  };
}

export default useDashboardWebSocket;
