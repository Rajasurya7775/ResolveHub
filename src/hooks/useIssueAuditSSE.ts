import { useEffect } from 'react';
import { IssueAuditScope, streamIssueAuditEvents } from '../services/api/auditLogService';

export function useIssueAuditSSE(issueId: string, scope: IssueAuditScope, onUpdate: () => void) {
  useEffect(() => {
    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (controller.signal.aborted || refreshTimer !== undefined) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        onUpdate();
      }, 300);
    };

    const connect = () => {
      void streamIssueAuditEvents(issueId, scope, controller.signal, refresh, refresh)
        .catch(() => undefined)
        .finally(() => {
          if (controller.signal.aborted) return;
          reconnectTimer = setTimeout(connect, 5000);
        });
    };
    connect();

    return () => {
      controller.abort();
      clearTimeout(reconnectTimer);
      clearTimeout(refreshTimer);
    };
  }, [issueId, scope, onUpdate]);
}
