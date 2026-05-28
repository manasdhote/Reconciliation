import React from 'react';

interface InvalidTransaction {
  source: string;
  transaction_id?: string;
  timestamp?: string;
  asset?: string;
  validationError: string;
  rawRow: Record<string, any>;
}

interface DataQualityTableProps {
  invalids: InvalidTransaction[];
}

export const DataQualityTable: React.FC<DataQualityTableProps> = ({ invalids }) => {
  return (
    <div id="dataQualityTab" className="tab-content" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="data-quality-intro">
        <p>
          The following transactions were flagged as <strong>INVALID</strong> during ingestion. Bad rows are preserved for
          auditing and are excluded from the matching process.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table data-quality-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Transaction ID</th>
              <th>Timestamp</th>
              <th>Asset</th>
              <th>Quantity</th>
              <th>Validation Issue</th>
            </tr>
          </thead>
          <tbody>
            {invalids.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Excellent! Zero validation errors found in this run.
                </td>
              </tr>
            ) : (
              invalids.map((tx, index) => {
                const sourceClass = tx.source === 'user' ? 'unmatched-user' : 'unmatched-exchange';
                return (
                  <tr key={index}>
                    <td>
                      <span className={`category-badge ${sourceClass}`}>{tx.source}</span>
                    </td>
                    <td>
                      <code title={tx.transaction_id || 'N/A'}>{tx.transaction_id || 'N/A'}</code>
                    </td>
                    <td>{tx.timestamp || 'N/A'}</td>
                    <td>
                      <strong>{tx.asset || 'N/A'}</strong>
                    </td>
                    <td>{tx.rawRow?.quantity || 'N/A'}</td>
                    <td>
                      <span className="validation-error-text">{tx.validationError}</span>
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
