import { apiClient, buildApiUrl, getAuthHeaders } from './apiClient';

export type IssueAuditScope = 'my-issues' | 'previous-issues';

function auditLogPath(issueId: string, scope: IssueAuditScope): string {
  return `/${scope}/${encodeURIComponent(issueId)}/audit-logs`;
}

export interface IssueAuditEntry {
  user_name: string;
  user_role: string;
  changed_at: string;
  changes: {
    audit_id: number;
    field: string;
    old_value: unknown;
    new_value: unknown;
  }[];
}

export async function fetchIssueAuditLogs(issueId: string, scope: IssueAuditScope): Promise<IssueAuditEntry[]> {
  const response = await apiClient.get<{ items: IssueAuditEntry[] }>(
    auditLogPath(issueId, scope)
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to load audit logs.');
  }
  if (response.status === 204) return [];
  if (!Array.isArray(response.data?.items)) {
    throw new Error('The audit log response could not be read.');
  }
  return response.data.items;
}

export async function streamIssueAuditEvents(
  issueId: string,
  scope: IssueAuditScope,
  signal: AbortSignal,
  onUpdate: () => void,
  onOpen: () => void
): Promise<void> {
  const suffix = scope === 'previous-issues' ? 'event' : 'events';
  const response = await fetch(buildApiUrl(`${auditLogPath(issueId, scope)}/${suffix}`), {
    headers: getAuthHeaders({ Accept: 'text/event-stream' }),
    signal
  });
  if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('Unable to connect to the audit log stream.');
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = '';
  try {
    onOpen();
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      pending += value;
      const frames = pending.split(/\r?\n\r?\n/);
      pending = frames.pop() ?? '';
      const hasUpdate = frames.some((frame) =>
        /^data:/m.test(frame) && !/^event: *(?:ping|heartbeat|keepalive)\s*$/im.test(frame)
      );
      if (hasUpdate) onUpdate();
    }
  } finally {
    reader.releaseLock();
  }
}
