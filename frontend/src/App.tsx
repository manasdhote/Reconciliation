import { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { ProgressBanner } from './components/ProgressBanner';
import { StatsCards } from './components/StatsCards';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ReportTable } from './components/ReportTable';
import { DataQualityTable } from './components/DataQualityTable';
import { AlertCircle, Download } from 'lucide-react';

interface SidebarRun {
  runId: string;
  timestamp: string;
  status: string;
  summary?: any;
}

export default function App() {
  const [runs, setRuns] = useState<SidebarRun[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<any | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [submittingReconcile, setSubmittingReconcile] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'quality'>('report');
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  const pollingIntervalRef = useRef<number | null>(null);

  // 1. Fetch reconciliation runs initially
  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch('/api/runs');
      const data = await response.json();
      if (data.success) {
        setRuns(data.runs);
      }
    } catch (err) {
      console.error('Error fetching runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // 2. Fetch specific run details
  const loadRunDetails = async (runId: string) => {
    setCurrentRunId(runId);
    
    // Clear any active polling timers
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      const response = await fetch(`/api/report/${runId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      const run = data.run;
      setPollingStatus(run.status);

      if (run.status !== 'COMPLETED' && run.status !== 'FAILED') {
        // Still processing! Initiate status polling
        setRunDetails(null);
        startPolling(runId);
      } else {
        // Completed or failed! Set details
        setRunDetails(data);
      }
    } catch (err: any) {
      console.error('Error loading run details:', err);
      alert(`Error loading run details: ${err.message}`);
    }
  };

  // 3. Start polling for an active job
  const startPolling = (runId: string) => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/report/${runId}`);
        const data = await response.json();

        if (!data.success) {
          if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
          return;
        }

        const run = data.run;
        setPollingStatus(run.status);

        if (run.status === 'COMPLETED' || run.status === 'FAILED') {
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Refresh lists and load complete data
          await fetchRuns();
          loadRunDetails(runId);
        }
      } catch (err) {
        console.error('Polling status error:', err);
        if (pollingIntervalRef.current) {
          window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // 4. Trigger reconciliation run
  const handleRunReconcile = async (formData: FormData) => {
    setSubmittingReconcile(true);
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to initialize reconciliation.');
      }

      // Refresh side list and automatically load/poll new run
      await fetchRuns();
      loadRunDetails(data.runId);
    } catch (err: any) {
      console.error('Reconciliation submission error:', err);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingReconcile(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            <path d="M8 12L12 16L8 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 20H24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="header-text">
            <h1>Reconcile.IO</h1>
            <p>Transaction Reconciliation Engine</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="status-indicator">
            <span className="pulse-dot"></span>
            Connected to MongoDB
          </span>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar
          runs={runs}
          currentRunId={currentRunId}
          onSelectRun={loadRunDetails}
          onRefresh={fetchRuns}
          loading={loadingRuns}
        />

        {/* Dashboard Panels */}
        <main className="dashboard-panel">
          {/* Configuration Form */}
          <ConfigPanel onSubmit={handleRunReconcile} submitting={submittingReconcile} />

          {/* Background Async Job Progress */}
          {pollingStatus && <ProgressBanner status={pollingStatus} />}

          {/* Empty Placeholder Screen */}
          {!currentRunId && (
            <div className="no-run-placeholder">
              <AlertCircle size={64} />
              <h3>No Reconciliation Run Selected</h3>
              <p>
                Please select a previous reconciliation run from the sidebar or click "Run Reconciliation Process" to
                ingest fresh files and run the engine.
              </p>
            </div>
          )}

          {/* Active Run Content */}
          {currentRunId && runDetails && (
            <>
              {/* If FAILED, render visual error panel */}
              {runDetails.run?.status === 'FAILED' ? (
                <div className="panel-section" style={{ textAlign: 'center', padding: '40px' }}>
                  <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '12px' }} />
                  <h3 style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>Run Execution Failed</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{runDetails.run.error}</p>
                </div>
              ) : (
                <>
                  {/* Stats Summary Cards */}
                  {runDetails.summary && <StatsCards summary={runDetails.summary} />}

                  {/* Telemetry Speeds */}
                  {runDetails.run?.metrics && <TelemetryPanel metrics={runDetails.run.metrics} />}

                  {/* Report Details and Data Quality Tabs */}
                  <section className="panel-section report-details-section">
                    <div className="section-tabs-header">
                      <div className="tabs-titles">
                        <button
                          className={`tab-link ${activeTab === 'report' ? 'active' : ''}`}
                          onClick={() => setActiveTab('report')}
                        >
                          Reconciliation Report
                        </button>
                        <button
                          className={`tab-link ${activeTab === 'quality' ? 'active' : ''}`}
                          onClick={() => setActiveTab('quality')}
                        >
                          Data Quality Log
                          {runDetails.invalidTransactions?.length > 0 && (
                            <span className="red-badge">{runDetails.invalidTransactions.length}</span>
                          )}
                        </button>
                      </div>
                      <div className="tabs-actions">
                        <a
                          href={`/api/report/${currentRunId}/download`}
                          className="btn secondary-btn"
                          download
                        >
                          <Download size={16} />
                          Download Report CSV
                        </a>
                      </div>
                    </div>

                    {/* Render active tab */}
                    {activeTab === 'report' ? (
                      <ReportTable entries={runDetails.report || []} />
                    ) : (
                      <DataQualityTable invalids={runDetails.invalidTransactions || []} />
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
