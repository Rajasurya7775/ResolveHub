import { useEffect, useRef, useState, useCallback } from 'react';
import { DiscussionMessage } from '../types/issue';
import { normalizeDiscussionMessage } from '../services/api/issueService';
import { API_BASE_URL, getAuthToken } from '../services/api/apiClient';

const INITIAL_RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30000;
const BACKOFF_FACTOR = 1.5;
const HEARTBEAT_INTERVAL_MS = 25000;

interface UseIssueMessagesWebSocketOptions {
  issueId?: string;
  onNewMessage?: (msg: DiscussionMessage) => void;
  onMessageUpdated?: (msg: DiscussionMessage) => void;
  onMessagesUpdated?: (messages: DiscussionMessage[]) => void;
  enabled?: boolean;
}

/**
 * Extracts host and security flag from an HTTP/WS URL
 */
function extractHostAndProtocol(rawUrl?: string): { host: string; isSecure: boolean } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { host: 'localhost:8000', isSecure: false };
  }

  const clean = rawUrl.trim().replace(/^['"]+|['"]+$/g, '').trim();
  const isSecure =
    (typeof window !== 'undefined' && window.location.protocol === 'https:') ||
    /^https:/i.test(clean) ||
    /^wss:/i.test(clean);

  const stripped = clean
    .replace(/^(https?:|wss?:)?\s*\/\/+/i, '')
    .replace(/^\/+/, '')
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/+$/, '');

  return { host: stripped || 'localhost:8000', isSecure };
}

/**
 * Resolves the single WebSocket endpoint for issue message discussions.
 */
export function getMessageWebSocketUrl(issueId?: string): string | null {
  if (!issueId) return null;

  const envMessagesWsUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MESSAGES_WS_URL) || '';

  if (envMessagesWsUrl.trim()) {
    const cleanTemplate = envMessagesWsUrl.trim().replace(/^['"]+|['"]+$/g, '').trim().replace(/\/+$/, '');
    const replaced = cleanTemplate.replace(/\{issue_?id\}|<issue_?id>/gi, encodeURIComponent(issueId));
    if (replaced !== cleanTemplate) {
      return replaced;
    }
    return `${cleanTemplate}/${encodeURIComponent(issueId)}/messages`;
  }

  const { host, isSecure } = extractHostAndProtocol(API_BASE_URL);
  const protocol = isSecure ? 'wss:' : 'ws:';

  return `${protocol}//${host}/api/v1/ws/my-issues/${encodeURIComponent(issueId)}/messages`;
}

/**
 * Custom React Hook: useIssueMessagesWebSocket
 *
 * Uses WebSocket-only real-time messaging (no HTTP polling hits) plus zero-network
 * BroadcastChannel sync across browser tabs of the same origin.
 */
export function useIssueMessagesWebSocket(options: UseIssueMessagesWebSocketOptions) {
  const { issueId, onNewMessage, onMessageUpdated, onMessagesUpdated, enabled = true } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);

  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const onMessageUpdatedRef = useRef(onMessageUpdated);
  useEffect(() => {
    onMessageUpdatedRef.current = onMessageUpdated;
  }, [onMessageUpdated]);

  const onMessagesUpdatedRef = useRef(onMessagesUpdated);
  useEffect(() => {
    onMessagesUpdatedRef.current = onMessagesUpdated;
  }, [onMessagesUpdated]);

  const wsRef = useRef<WebSocket | null>(null);
  const isUnmountedRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectDelayRef = useRef<number>(INITIAL_RECONNECT_DELAY_MS);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  // Reset known IDs when switching issues
  useEffect(() => {
    knownMessageIdsRef.current.clear();
  }, [issueId]);

  // 1. Cross-Tab BroadcastChannel (zero network hits)
  useEffect(() => {
    if (!issueId || !enabled) return;

    const channelName = `resolvehub_messages_${issueId}`;
    let channel: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(channelName);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (!event.data || isUnmountedRef.current) return;
          const { type, message } = event.data;
          if (type === 'NEW_MESSAGE' && message) {
            if (!knownMessageIdsRef.current.has(message.id)) {
              knownMessageIdsRef.current.add(message.id);
              onNewMessageRef.current?.(message);
            }
          } else if (type === 'MESSAGE_UPDATED' && message) {
            knownMessageIdsRef.current.add(message.id);
            onMessageUpdatedRef.current?.(message);
          } else if (type === 'MESSAGES_UPDATED' && Array.isArray(message)) {
            onMessagesUpdatedRef.current?.(message);
          }
        };
      } catch {
        // ignore if BroadcastChannel is unsupported
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `resolvehub_ws_msg_${issueId}` && e.newValue && !isUnmountedRef.current) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.message) {
            if (parsed.type === 'MESSAGE_UPDATED') {
              knownMessageIdsRef.current.add(parsed.message.id);
              onMessageUpdatedRef.current?.(parsed.message);
            } else if (!knownMessageIdsRef.current.has(parsed.message.id)) {
              knownMessageIdsRef.current.add(parsed.message.id);
              onNewMessageRef.current?.(parsed.message);
            }
          }
        } catch {
          // ignore malformed storage payload
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.close();
        broadcastChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [issueId, enabled]);

  // 2. WebSocket Connection Manager (no HTTP polling)
  const connectWebSocket = useCallback(() => {
    if (!issueId || !enabled || isUnmountedRef.current) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const baseUrl = getMessageWebSocketUrl(issueId);
    if (!baseUrl) return;

    const token = getAuthToken();
    const targetUrl = token
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : baseUrl;

    try {
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          try {
            ws.close(1000, 'Component unmounted');
          } catch {
            // ignore
          }
          return;
        }
        setIsConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;

        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
        }
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // ignore send error
            }
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!payload || payload.type === 'pong' || payload.event === 'pong') return;

          const maybeList = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.data)
              ? payload.data
              : Array.isArray(payload.messages)
                ? payload.messages
                : null;

          if (maybeList) {
            const list = maybeList.map((m: unknown) => normalizeDiscussionMessage(m, issueId));
            list.forEach((m: DiscussionMessage) => knownMessageIdsRef.current.add(m.id));
            onMessagesUpdatedRef.current?.(list);
            return;
          }

          const eventName = String(payload.type || payload.event || '').toLowerCase();
          if (
            eventName === 'connected' ||
            eventName === 'ping' ||
            eventName === 'pong' ||
            eventName === 'subscribed' ||
            eventName === 'ack'
          ) {
            return;
          }

          const item =
            payload.data && typeof payload.data === 'object'
              ? payload.data
              : payload.message && typeof payload.message === 'object'
                ? payload.message
                : payload;

          const hasChatPayload =
            Boolean(item) &&
            (typeof item.markdown === 'string' ||
              ((typeof item.message === 'string' || typeof item.text === 'string') &&
                (item.id != null || item.sender_id != null || item.senderId != null || item.sender_name != null || item.senderName != null)));

          if (hasChatPayload) {
            const normalized = normalizeDiscussionMessage(item, issueId);
            const isUpdateEvent =
              eventName.includes('update') ||
              eventName.includes('edit') ||
              Boolean(normalized.isEdited);

            if (isUpdateEvent && knownMessageIdsRef.current.has(normalized.id)) {
              onMessageUpdatedRef.current?.(normalized);
            } else {
              knownMessageIdsRef.current.add(normalized.id);
              onNewMessageRef.current?.(normalized);
            }
          }
        } catch {
          // ignore non-JSON frames safely
        }
      };

      ws.onerror = () => {
        // Handled by onclose backoff reconnect
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        if (isUnmountedRef.current || !enabled) return;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * BACKOFF_FACTOR,
            MAX_RECONNECT_DELAY_MS
          );
          connectWebSocket();
        }, reconnectDelayRef.current);
      };
    } catch {
      setIsConnected(false);
    }
  }, [issueId, enabled]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      if (wsRef.current) {
        const activeWs = wsRef.current;
        wsRef.current = null;
        activeWs.onmessage = null;
        activeWs.onerror = null;
        activeWs.onclose = null;
        if (activeWs.readyState === WebSocket.OPEN) {
          activeWs.onopen = null;
          try {
            activeWs.close(1000, 'Component unmounted');
          } catch {
            // ignore
          }
        } else if (activeWs.readyState === WebSocket.CONNECTING) {
          activeWs.onopen = () => {
            try {
              activeWs.close(1000, 'Component unmounted');
            } catch {
              // ignore
            }
          };
        }
      }
    };
  }, [connectWebSocket]);

  // 3. Broadcast helper (WebSocket + same-origin tabs)
  const broadcastMessage = useCallback(
    (msg: DiscussionMessage, eventType: 'NEW_MESSAGE' | 'MESSAGE_UPDATED' = 'NEW_MESSAGE') => {
      knownMessageIdsRef.current.add(msg.id);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: eventType,
              issue_id: issueId,
              message: msg
            })
          );
        } catch {
          // ignore
        }
      }

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: eventType,
            issueId,
            message: msg
          });
        } catch {
          // ignore
        }
      }

      try {
        localStorage.setItem(
          `resolvehub_ws_msg_${issueId}`,
          JSON.stringify({ type: eventType, message: msg, time: Date.now() })
        );
      } catch {
        // ignore
      }
    },
    [issueId]
  );

  return {
    isConnected,
    broadcastMessage
  };
}
