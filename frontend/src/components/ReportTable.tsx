import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Transaction {
  transaction_id: string;
  timestamp: string;
  asset: string;
  type: string;
  quantity: number;
  fee?: number;
}

interface AuditTrail {
  matchingRuleApplied: string;
  timeDifferenceSec?: number;
  quantityDifferencePct?: number;
}

interface ReportEntry {
  category: string;
  reason: string;
  userTransaction?: Transaction;
  exchangeTransaction?: Transaction;
  auditTrail?: AuditTrail;
}

interface ReportTableProps {
  entries: ReportEntry[];
}

export const ReportTable: React.FC<ReportTableProps> = ({ entries }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredEntries = entries.filter((entry) => {
    const u = entry.userTransaction;
    const e = entry.exchangeTransaction;

    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'UNMATCHED') {
        if (entry.category !== 'UNMATCHED_USER' && entry.category !== 'UNMATCHED_EXCHANGE') return false;
      } else {
        if (entry.category !== categoryFilter) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const asset = (u ? u.asset : e ? e.asset : '').toLowerCase();
      const type = (u ? u.type : e ? e.type : '').toLowerCase();
      const uId = (u ? u.transaction_id : '').toLowerCase();
      const eId = (e ? e.transaction_id : '').toLowerCase();
      const reason = entry.reason.toLowerCase();

      return (
        asset.includes(q) ||
        type.includes(q) ||
        uId.includes(q) ||
        eId.includes(q) ||
        reason.includes(q)
      );
    }

    return true;
  });

  return (
    <div id="reconciliationReportTab" className="tab-content default-tab">
      <div className="table-filters">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by Asset, Tx ID or Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="categoryFilter">Category:</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Transactions</option>
            <option value="MATCHED">Matched</option>
            <option value="CONFLICTING">Conflicting</option>
            <option value="UNMATCHED">Unmatched (All)</option>
            <option value="UNMATCHED_USER">Unmatched User</option>
            <option value="UNMATCHED_EXCHANGE">Unmatched Exchange</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Asset</th>
              <th>Type</th>
              <th>User transaction</th>
              <th>Exchange transaction</th>
              <th>Matching details / Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No entries found in this report.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => {
                const u = entry.userTransaction;
                const e = entry.exchangeTransaction;

                let categoryClass = 'matched';
                if (entry.category === 'CONFLICTING') categoryClass = 'conflicting';
                if (entry.category === 'UNMATCHED_USER') categoryClass = 'unmatched-user';
                if (entry.category === 'UNMATCHED_EXCHANGE') categoryClass = 'unmatched-exchange';

                let categoryText = entry.category;
                if (entry.category === 'UNMATCHED_USER') categoryText = 'Unmatched (User)';
                if (entry.category === 'UNMATCHED_EXCHANGE') categoryText = 'Unmatched (Exchange)';

                const asset = u ? u.asset : e ? e.asset : '';
                const type = u ? u.type : e ? e.type : '';

                return (
                  <tr key={index}>
                    <td>
                      <span className={`category-badge ${categoryClass}`}>{categoryText}</span>
                    </td>
                    <td>
                      <strong>{asset.toUpperCase()}</strong>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>
                        {type}
                      </span>
                    </td>
                    <td>
                      {u ? (
                        <div className="tx-cell-box">
                          <span className="tx-cell-id" title={u.transaction_id}>
                            {u.transaction_id}
                          </span>
                          <span className="tx-cell-details">
                            Qty: {u.quantity} | Fee: {u.fee || 0}
                          </span>
                          <span className="tx-cell-details">
                            {new Date(u.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="tx-cell-empty">Not present</span>
                      )}
                    </td>
                    <td>
                      {e ? (
                        <div className="tx-cell-box">
                          <span className="tx-cell-id" title={e.transaction_id}>
                            {e.transaction_id}
                          </span>
                          <span className="tx-cell-details">
                            Qty: {e.quantity} | Fee: {e.fee || 0}
                          </span>
                          <span className="tx-cell-details">
                            {new Date(e.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="tx-cell-empty">Not present</span>
                      )}
                    </td>
                    <td className="reason-col">
                      <span style={{ fontWeight: 500 }}>{entry.reason}</span>
                      {entry.auditTrail && (
                        <div
                          className="audit-trail-container"
                          style={{
                            marginTop: '6px',
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            borderTop: '1px dashed rgba(255,255,255,0.06)',
                            paddingTop: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>🔍 Audit Trace:</span>
                          <span>• Rule: {entry.auditTrail.matchingRuleApplied}</span>
                          {(entry.category === 'MATCHED' || entry.category === 'CONFLICTING') &&
                            entry.auditTrail.timeDifferenceSec !== undefined &&
                            entry.auditTrail.quantityDifferencePct !== undefined && (
                              <span>
                                • Margin: Time diff: {entry.auditTrail.timeDifferenceSec}s | Qty diff:{' '}
                                {entry.auditTrail.quantityDifferencePct.toFixed(4)}%
                              </span>
                            )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
