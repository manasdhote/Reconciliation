import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SidebarRun {
  runId: string;
  timestamp: string;
  status: string;
  summary?: {
    matchedCount: number;
    conflictingCount: number;
    unmatchedUserCount: number;
    unmatchedExchangeCount: number;
  };
}

interface SidebarProps {
  runs: SidebarRun[];
  currentRunId: string | null;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  runs,
  currentRunId,
  onSelectRun,
  onRefresh,
  loading,
}) => {
  return (
    <aside className="runs-sidebar">
      <div className="sidebar-header">
        <h3>Reconciliation Runs</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className={loading ? 'spinning' : ''}
          title="Refresh runs list"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="runs-list">
        {loading && runs.length === 0 ? (
          <div className="loading-spinner-container">
            <div className="spinner"></div>
            <p>Loading previous runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="loading-spinner-container">
            <p style={{ fontSize: '0.75rem' }}>No runs completed yet</p>
          </div>
        ) : (
          runs.map((run) => {
            const s = run.summary || {
              matchedCount: 0,
              conflictingCount: 0,
              unmatchedUserCount: 0,
              unmatchedExchangeCount: 0,
            };
            const totalMatched = s.matchedCount;
            const totalConflicting = s.conflictingCount;
            const totalUnmatched = s.unmatchedUserCount + s.unmatchedExchangeCount;
            const total = totalMatched + totalConflicting + totalUnmatched || 1;

            const matchedPct = (totalMatched / total) * 100;
            const conflictingPct = (totalConflicting / total) * 100;
            const unmatchedPct = (totalUnmatched / total) * 100;

            const dateStr = new Date(run.timestamp).toLocaleString();
            const isActive = run.status !== 'COMPLETED' && run.status !== 'FAILED';

            return (
              <div
                key={run.runId}
                className={`run-item ${currentRunId === run.runId ? 'active' : ''}`}
                onClick={() => onSelectRun(run.runId)}
              >
                <div className="run-item-header">
                  <span className="run-id" title={run.runId}>
                    Run ID: {run.runId.substring(0, 8)}...
                    {run.status !== 'COMPLETED' && (
                      <span
                        className={`category-badge ${
                          run.status === 'FAILED' ? 'unmatched-exchange' : 'unmatched-user'
                        }`}
                        style={{ fontSize: '0.6rem', padding: '1px 4px', marginLeft: '6px' }}
                      >
                        {run.status}
                      </span>
                    )}
                  </span>
                  <span className="run-date">{isActive ? 'Active' : dateStr}</span>
                </div>
                <div className="run-summary-bar">
                  <div
                    className="summary-segment matched"
                    style={{ width: `${matchedPct}%` }}
                    title={`Matched: ${totalMatched}`}
                  ></div>
                  <div
                    className="summary-segment conflicting"
                    style={{ width: `${conflictingPct}%` }}
                    title={`Conflicting: ${totalConflicting}`}
                  ></div>
                  <div
                    className="summary-segment unmatched"
                    style={{ width: `${unmatchedPct}%` }}
                    title={`Unmatched: ${totalUnmatched}`}
                  ></div>
                </div>
                <div className="run-stats-text">
                  <span>Match: {totalMatched}</span>
                  <span>Conflict: {totalConflicting}</span>
                  <span>Unmatched: {totalUnmatched}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
