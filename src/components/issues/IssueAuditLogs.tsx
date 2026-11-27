import { useCallback, useEffect, useState } from 'react';
import { useIssueAuditSSE } from '../../hooks/useIssueAuditSSE';
import { fetchIssueAuditLogs, IssueAuditEntry, IssueAuditScope } from '../../services/api/auditLogService';
import { formatDateTime } from '../../utils/dateUtils';

function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function IssueAuditLogs({ issueId, scope }: { issueId: string; scope: IssueAuditScope }) {
  const [entries, setEntries] = useState<IssueAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);
  useIssueAuditSSE(issueId, scope, refresh);

  useEffect(() => {
    let active = true;

    fetchIssueAuditLogs(issueId, scope)
      .then((items) => {
        if (!active) return;
        setEntries(items);
        setError('');
      })
      .catch(() => {
        if (active) setError('Unable to load audit logs.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [issueId, scope, attempt]);

  return (
    <div id="issue-audit-logs" className="flex-grow-1 min-h-0 overflow-y-auto bg-light p-3 small">
      {loading ? (
        <p className="text-secondary text-center py-3 mb-0" role="status">Loading audit logs…</p>
      ) : error ? (
        <div className="text-center py-3">
          <p className="text-danger mb-2" role="alert">{error}</p>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => {
            setLoading(true);
            refresh();
          }}>
            Retry
          </button>
        </div>
      ) : entries.every((entry) => entry.changes.length === 0) ? (
        <p className="text-secondary text-center py-3 mb-0">No edits recorded for this issue.</p>
      ) : (
        <ol className="list-unstyled mb-0 ms-3 border-start">
          {entries.flatMap((entry) => entry.changes.map((change) => (
            <li key={change.audit_id} className="position-relative ps-4 pb-4">
              <span className="position-absolute start-0 translate-middle-x rounded-circle border bg-white text-primary px-1" aria-hidden="true">
                <i className="bi bi-arrow-repeat"></i>
              </span>
              <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                <strong className="text-navy text-break">{entry.user_name}</strong>
                <span className="badge rounded-pill text-secondary bg-secondary-subtle">{entry.user_role}</span>
              </div>
              <div className="fw-semibold text-navy text-break mb-2">
                {change.field.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
              </div>
              <dl className="row g-2 mb-2">
                <div className="col-6">
                  <dt className="text-secondary fw-normal">Previous</dt>
                  <dd className="text-secondary text-break mb-0" style={{ whiteSpace: 'pre-wrap' }}>{displayValue(change.old_value)}</dd>
                </div>
                <div className="col-6">
                  <dt className="text-secondary fw-normal">New</dt>
                  <dd className="text-primary text-break mb-0" style={{ whiteSpace: 'pre-wrap' }}>{displayValue(change.new_value)}</dd>
                </div>
              </dl>
              <time className="text-secondary" dateTime={entry.changed_at}>{formatDateTime(entry.changed_at)}</time>
            </li>
          )))}
        </ol>
      )}
    </div>
  );
}
