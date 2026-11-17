export interface UseDashboardWebSocketOptions {
  url?: string | null;
  enabled?: boolean;
}

export interface UseDashboardWebSocketReturn {
  isConnected: boolean;
  lastEvent: any;
  reconnect: () => void;
}

export function getDashboardWebSocketUrl(customUrl?: string | null): string;

export function useDashboardWebSocket(
  onDashboardUpdated: (payload?: any) => void,
  options?: UseDashboardWebSocketOptions
): UseDashboardWebSocketReturn;

export default useDashboardWebSocket;
