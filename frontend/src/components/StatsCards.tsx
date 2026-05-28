import React from 'react';
import { Layers, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface StatsSummary {
  totalUserIngested: number;
  totalExchangeIngested: number;
  totalUserValid: number;
  totalExchangeValid: number;
  matchedCount: number;
  conflictingCount: number;
  unmatchedUserCount: number;
  unmatchedExchangeCount: number;
}

interface StatsCardsProps {
  summary: StatsSummary;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ summary }) => {
  const userIn = summary.totalUserIngested || 0;
  const exchangeIn = summary.totalExchangeIngested || 0;
  const totalIngested = userIn + exchangeIn;

  const totalValid = (summary.totalUserValid || 0) + (summary.totalExchangeValid || 0);
  const matchedCount = summary.matchedCount || 0;
  const matchRatePct = totalValid > 0 ? ((matchedCount * 2) / totalValid) * 100 : 0;

  const conflictCount = summary.conflictingCount || 0;

  const unmatchedUser = summary.unmatchedUserCount || 0;
  const unmatchedExchange = summary.unmatchedExchangeCount || 0;
  const totalUnmatched = unmatchedUser + unmatchedExchange;

  return (
    <section className="panel-section stats-grid">
      {/* Total Ingested */}
      <div className="stat-card total-card">
        <div className="stat-header">
          <h3>Total Ingested</h3>
          <div className="icon-bg purple">
            <Layers size={20} />
          </div>
        </div>
        <div className="stat-main">
          <span className="stat-value">{totalIngested}</span>
          <span className="stat-sub">
            User: {userIn} | Exchange: {exchangeIn}
          </span>
        </div>
      </div>

      {/* Match Rate */}
      <div className="stat-card match-card">
        <div className="stat-header">
          <h3>Match Rate</h3>
          <div className="icon-bg green">
            <CheckCircle size={20} />
          </div>
        </div>
        <div className="stat-main">
          <span className="stat-value">{matchRatePct.toFixed(1)}%</span>
          <span className="stat-sub">
            {matchedCount} pairs ({matchedCount * 2} txs) matched
          </span>
        </div>
      </div>

      {/* Conflicts Found */}
      <div className="stat-card conflict-card">
        <div className="stat-header">
          <h3>Conflicts Found</h3>
          <div className="icon-bg orange">
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className="stat-main">
          <span className="stat-value">{conflictCount}</span>
          <span className="stat-sub">Tolerances exceeded</span>
        </div>
      </div>

      {/* Unmatched Items */}
      <div className="stat-card unmatched-card">
        <div className="stat-header">
          <h3>Unmatched Items</h3>
          <div className="icon-bg red">
            <HelpCircle size={20} />
          </div>
        </div>
        <div className="stat-main">
          <span className="stat-value">{totalUnmatched}</span>
          <span className="stat-sub">
            User: {unmatchedUser} | Exchange: {unmatchedExchange}
          </span>
        </div>
      </div>
    </section>
  );
};
