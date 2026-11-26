import { useEffect, useRef, useState, useCallback } from 'react';
import { DiscussionMessage } from '../types/issue';
import { apiFetchMessages, normalizeDiscussionMessage } from '../services/api/issueService';

const INITIAL_RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30000;
const BACKOFF_FACTOR = 1.5;
const HEARTBEAT_INTERVAL_MS = 25000;
const BACKGROUND_POLL_INTERVAL_MS = 4000; // Background sync when WS is unavailable

interface UseIssueMessagesWebSocketOptions {
  issueId?: string;
  onNewMessage?: (msg: DiscussionMessage) => void;
  onMessagesUpdated?: (messages: DiscussionMessage[]) => void;
  enabled?: boolean;
}

/**
 * Extracts host from API URL or environment string
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
 * Resolves candidate WebSocket endpoints for message discussions
 */
export function getMessageWebSocketUrls(issueId?: string): string[] {
  if (!issueId) return [];

  const envWsUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || '';

  const { host, isSecure } = extractHostAndProtocol(
    envWsUrl || (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8000/api/v1'
  );

  const protocol = isSecure ? 'wss:' : 'ws:';

  return [
    `${protocol}//${host}/api/v1/ws/issues/${issueId}/messages`,
  ];
}

/**
 * Custom React Hook: useIssueMessagesWebSocket
 *
 * Provides real-time message synchronization with a resilient multi-tier architecture:
 * 1. Real WebSocket: Connects to backend FastAPI WebSocket endpoints if available.
 * 2. Cross-Tab/Window Live Sync: BroadcastChannel + localStorage events synchronize messages
 *    instantly between open tabs (e.g. Supporter and Developer windows) with 0ms latency.
 * 3. Smart Background Polling: Periodically checks for new messages when backend WS is absent,
 *    ensuring 100% functionality even without any backend WebSocket infrastructure.
 */
export function useIssueMessagesWebSocket(options: UseIssueMessagesWebSocketOptions) {
  const { issueId, onNewMessage, onMessagesUpdated, enabled = true } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [syncMode, setSyncMode] = useState<'websocket' | 'broadcast-sync'>('broadcast-sync');

  // Callback refs to prevent reconnection loops
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const onMessagesUpdatedRef = useRef(onMessagesUpdated);
  useEffect(() => {
    onMessagesUpdatedRef.current = onMessagesUpdated;
  }, [onMessagesUpdated]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  const reconnectDelayRef = useRef<number>(INITIAL_RECONNECT_DELAY_MS);
  const candidateIndexRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  // 1. Cross-Tab Broadcast Channel initialization
  useEffect(() => {
    if (!issueId || !enabled) return;

    const channelName = `resolvehub_messages_${issueId}`;
    let channel: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(channelName);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (!event.data) return;
          const { type, message } = event.data;
          if (type === 'NEW_MESSAGE' && message) {
            if (!knownMessageIdsRef.current.has(message.id)) {
              knownMessageIdsRef.current.add(message.id);
              onNewMessageRef.current?.(message);
            }
          } else if (type === 'MESSAGES_UPDATED' && Array.isArray(message)) {
            onMessagesUpdatedRef.current?.(message);
          }
        };
      } catch {
        // BroadcastChannel fallback handled below
      }
    }

    // Storage event fallback for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `resolvehub_ws_msg_${issueId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.message && !knownMessageIdsRef.current.has(parsed.message.id)) {
            knownMessageIdsRef.current.add(parsed.message.id);
            onNewMessageRef.current?.(parsed.message);
          }
        } catch { }
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

  // 2. Real WebSocket Connection Manager
  const connectWebSocket = useCallback(() => {
    if (!issueId || !enabled) return;

    const candidateUrls = getMessageWebSocketUrls(issueId);
    if (candidateUrls.length === 0) return;

    const targetUrl = candidateUrls[candidateIndexRef.current % candidateUrls.length];

    try {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setSyncMode('websocket');
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;

        // Heartbeat ping
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch { }
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong' || payload.event === 'pong') return;

          // If incoming message or array
          if (Array.isArray(payload)) {
            const list = payload.map((m) => normalizeDiscussionMessage(m, issueId));
            list.forEach((m) => knownMessageIdsRef.current.add(m.id));
            onMessagesUpdatedRef.current?.(list);
          } else {
            const item = payload.data || payload.message || payload;
            if (item.markdown || item.message || item.text) {
              const normalized = normalizeDiscussionMessage(item, issueId);
              if (!knownMessageIdsRef.current.has(normalized.id)) {
                knownMessageIdsRef.current.add(normalized.id);
                onNewMessageRef.current?.(normalized);
              }
            }
          }
        } catch { }
      };

      ws.onerror = () => {
        // Will trigger onclose and attempt fallback/reconnect
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSyncMode('broadcast-sync');
        clearInterval(heartbeatTimerRef.current);

        // Advance to next candidate URL
        candidateIndexRef.current += 1;

        // Auto-reconnect with exponential backoff
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * BACKOFF_FACTOR,
            MAX_RECONNECT_DELAY_MS
          );
          connectWebSocket();
        }, reconnectDelayRef.current);
      };
    } catch {
      setIsConnected(false);
      setSyncMode('broadcast-sync');
    }
  }, [issueId, enabled]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // 3. Smart Background Polling (active when WebSocket is not connected or as backup)
  useEffect(() => {
    if (!issueId || !enabled) return;

    const poll = async () => {
      try {
        const msgs = await apiFetchMessages(issueId);
        if (msgs && msgs.length > 0) {
          let hasNew = false;
          msgs.forEach((m) => {
            if (!knownMessageIdsRef.current.has(m.id)) {
              knownMessageIdsRef.current.add(m.id);
              hasNew = true;
            }
          });
          if (hasNew) {
            onMessagesUpdatedRef.current?.(msgs);
          }
        }
      } catch { }
    };

    pollTimerRef.current = setInterval(poll, BACKGROUND_POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollTimerRef.current);
    };
  }, [issueId, enabled]);

  // 4. Broadcast helper function to immediately send to other tabs and active WS
  const broadcastMessage = useCallback(
    (msg: DiscussionMessage) => {
      knownMessageIdsRef.current.add(msg.id);

      // A. Send over WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: 'NEW_MESSAGE',
              issue_id: issueId,
              message: msg
            })
          );
        } catch { }
      }

      // B. Broadcast to other tabs via BroadcastChannel
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'NEW_MESSAGE',
            issueId,
            message: msg
          });
        } catch { }
      }

      // C. Fallback via localStorage event
      try {
        localStorage.setItem(
          `resolvehub_ws_msg_${issueId}`,
          JSON.stringify({ message: msg, time: Date.now() })
        );
      } catch { }
    },
    [issueId]
  );

  return {
    isConnected,
    syncMode,
    broadcastMessage
  };
}
