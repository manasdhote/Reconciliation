// --- State Management ---
let currentRunId = null;
let currentReportData = [];
let currentInvalidData = [];
let pollingIntervalId = null;

// --- DOM Nodes ---
const runsList = document.getElementById('runsList');
const refreshRunsBtn = document.getElementById('refreshRunsBtn');
const reconcileForm = document.getElementById('reconcileForm');
const submitBtn = document.getElementById('submitBtn');

const userCsvInput = document.getElementById('userCsv');
const userCsvName = document.getElementById('userCsvName');
const exchangeCsvInput = document.getElementById('exchangeCsv');
const exchangeCsvName = document.getElementById('exchangeCsvName');

const timestampTolerance = document.getElementById('timestampTolerance');
const quantityTolerancePct = document.getElementById('quantityTolerancePct');
const timeVal = document.getElementById('timeVal');
const qtyVal = document.getElementById('qtyVal');

const noRunPlaceholder = document.getElementById('noRunPlaceholder');
const dashboardReportContainer = document.getElementById('dashboardReportContainer');

// Async Job Progress Nodes
const progressBanner = document.getElementById('progressBanner');
const progressStatusText = document.getElementById('progressStatusText');
const progressPercentageText = document.getElementById('progressPercentageText');
const progressBarFill = document.getElementById('progressBarFill');

// Stats Cards
const statTotalIngested = document.getElementById('statTotalIngested');
const statIngestedBreakdown = document.getElementById('statIngestedBreakdown');
const statMatchRate = document.getElementById('statMatchRate');
const statMatchCount = document.getElementById('statMatchCount');
const statConflictCount = document.getElementById('statConflictCount');
const statUnmatchedCount = document.getElementById('statUnmatchedCount');
const statUnmatchedBreakdown = document.getElementById('statUnmatchedBreakdown');
const invalidBadge = document.getElementById('invalidBadge');

// Performance Telemetry Nodes
const telemetrySection = document.getElementById('telemetrySection');
const metricIngestionThroughput = document.getElementById('metricIngestionThroughput');
const metricIngestionDuration = document.getElementById('metricIngestionDuration');
const metricMatchingThroughput = document.getElementById('metricMatchingThroughput');
const metricMatchingDuration = document.getElementById('metricMatchingDuration');
const metricTotalDuration = document.getElementById('metricTotalDuration');

// Tables and Filters
const reportTableBody = document.getElementById('reportTableBody');
const invalidTableBody = document.getElementById('invalidTableBody');
const reportSearch = document.getElementById('reportSearch');
const categoryFilter = document.getElementById('categoryFilter');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');

// --- Initialization & Event Binding ---
document.addEventListener('DOMContentLoaded', () => {
  fetchRuns();
  bindTolerances();
  bindFileInputs();
  bindFilters();
  
  reconcileForm.addEventListener('submit', handleReconcileForm);
  refreshRunsBtn.addEventListener('click', fetchRuns);
});

// Sync Slider Labels in real-time
function bindTolerances() {
  timestampTolerance.addEventListener('input', (e) => {
    timeVal.textContent = `${e.target.value}s`;
  });
  
  quantityTolerancePct.addEventListener('input', (e) => {
    qtyVal.textContent = `${parseFloat(e.target.value).toFixed(2)}%`;
  });
}

// Show selected filenames in Dropzones
function bindFileInputs() {
  userCsvInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      userCsvName.textContent = e.target.files[0].name;
    } else {
      userCsvName.textContent = "Upload user CSV (Optional)";
    }
  });

  exchangeCsvInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      exchangeCsvName.textContent = e.target.files[0].name;
    } else {
      exchangeCsvName.textContent = "Upload exchange CSV (Optional)";
    }
  });
}

// Bind search and category dropdown filters
function bindFilters() {
  reportSearch.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
}

// --- Tab Controller ---
window.openTab = function(evt, tabName) {
  const tabContents = document.getElementsByClassName('tab-content');
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].style.display = 'none';
  }

  const tabLinks = document.getElementsByClassName('tab-link');
  for (let i = 0; i < tabLinks.length; i++) {
    tabLinks[i].classList.remove('active');
  }

  document.getElementById(tabName).style.display = 'flex';
  evt.currentTarget.classList.add('active');
};

// --- Fetch Previous Reconciliation Runs ---
async function fetchRuns() {
  try {
    const response = await fetch('/api/runs');
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    renderRunsList(data.runs);
  } catch (err) {
    console.error('Error fetching runs:', err);
    runsList.innerHTML = `<div class="loading-spinner-container"><p class="validation-error-text">Failed to load previous runs</p></div>`;
  }
}

// Render runs into sidebar
function renderRunsList(runs) {
  if (runs.length === 0) {
    runsList.innerHTML = `<div class="loading-spinner-container"><p style="font-size:0.75rem">No runs completed yet</p></div>`;
    return;
  }

  runsList.innerHTML = '';
  runs.forEach(run => {
    const runItem = document.createElement('div');
    runItem.className = `run-item ${currentRunId === run.runId ? 'active' : ''}`;
    runItem.dataset.runId = run.runId;
    
    // Status text badge for runs that are not completed
    let statusHTML = '';
    if (run.status !== 'COMPLETED') {
      const statusClass = run.status === 'FAILED' ? 'unmatched-exchange' : 'unmatched-user';
      statusHTML = `<span class="category-badge ${statusClass}" style="font-size: 0.6rem; padding: 1px 4px; margin-left: 6px;">${run.status}</span>`;
    }

    const s = run.summary || {};
    const totalMatched = s.matchedCount || 0;
    const totalConflicting = s.conflictingCount || 0;
    const totalUnmatched = (s.unmatchedUserCount || 0) + (s.unmatchedExchangeCount || 0);
    const total = totalMatched + totalConflicting + totalUnmatched || 1;

    const matchedPct = (totalMatched / total) * 100;
    const conflictingPct = (totalConflicting / total) * 100;
    const unmatchedPct = (totalUnmatched / total) * 100;

    const dateStr = new Date(run.timestamp).toLocaleString();

    runItem.innerHTML = `
      <div class="run-item-header">
        <span class="run-id" title="${run.runId}">Run ID: ${run.runId.substring(0, 8)}... ${statusHTML}</span>
        <span class="run-date">${run.status !== 'COMPLETED' && run.status !== 'FAILED' ? 'Active' : dateStr}</span>
      </div>
      <div class="run-summary-bar">
        <div class="summary-segment matched" style="width: ${matchedPct}%" title="Matched: ${totalMatched}"></div>
        <div class="summary-segment conflicting" style="width: ${conflictingPct}%" title="Conflicting: ${totalConflicting}"></div>
        <div class="summary-segment unmatched" style="width: ${unmatchedPct}%" title="Unmatched: ${totalUnmatched}"></div>
      </div>
      <div class="run-stats-text">
        <span>Match: ${totalMatched}</span>
        <span>Conflict: ${totalConflicting}</span>
        <span>Unmatched: ${totalUnmatched}</span>
      </div>
    `;

    runItem.addEventListener('click', () => {
      document.querySelectorAll('.run-item').forEach(el => el.classList.remove('active'));
      runItem.classList.add('active');
      
      loadRunDetails(run.runId);
    });

    runsList.appendChild(runItem);
  });
}

// --- Trigger Reconciliation Form Submission ---
async function handleReconcileForm(e) {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Queueing Job in BullMQ...`;

  try {
    const formData = new FormData();
    
    if (userCsvInput.files.length > 0) {
      formData.append('userCsv', userCsvInput.files[0]);
    }
    if (exchangeCsvInput.files.length > 0) {
      formData.append('exchangeCsv', exchangeCsvInput.files[0]);
    }

    formData.append('timestampTolerance', timestampTolerance.value);
    formData.append('quantityTolerancePct', quantityTolerancePct.value);

    const response = await fetch('/api/reconcile', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Reconciliation execution failed.');
    }

    // Success! Clear file inputs
    userCsvInput.value = '';
    userCsvName.textContent = "Upload user CSV (Optional)";
    exchangeCsvInput.value = '';
    exchangeCsvName.textContent = "Upload exchange CSV (Optional)";

    // Start Polling Status
    currentRunId = data.runId;
    await fetchRuns();
    loadRunDetails(data.runId);

  } catch (err) {
    console.error('Reconciliation form error:', err);
    alert(`Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Run Reconciliation Process
    `;
  }
}

// --- Start/Manage status polling interval ---
function startPollingStatus(runId) {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }

  pollingIntervalId = setInterval(async () => {
    try {
      const response = await fetch(`/api/report/${runId}`);
      const data = await response.json();

      if (!data.success) {
        clearInterval(pollingIntervalId);
        return;
      }

      const run = data.run;
      updateProgressUI(run.status);

      if (run.status === 'COMPLETED' || run.status === 'FAILED') {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
        
        // Refresh sidebar and fully load report details
        await fetchRuns();
        loadRunDetails(runId);
      }
    } catch (err) {
      console.error('Polling error:', err);
      clearInterval(pollingIntervalId);
    }
  }, 1000);
}

// Update the Progress Banner elements
function updateProgressUI(status) {
  progressBanner.style.display = 'block';
  
  let percentage = '0%';
  let statusText = 'Queueing job in Redis...';

  if (status === 'PENDING') {
    percentage = '15%';
    statusText = 'Queued in BullMQ Redis queue...';
  } else if (status === 'INGESTING') {
    percentage = '45%';
    statusText = 'Large CSV datasets: Stream-batching rows into MongoDB...';
  } else if (status === 'MATCHING') {
    percentage = '80%';
    statusText = 'Running high-performance bucket index matcher...';
  } else if (status === 'COMPLETED') {
    percentage = '100%';
    statusText = 'Reconciliation completed successfully!';
  } else if (status === 'FAILED') {
    percentage = '100%';
    statusText = 'Reconciliation failed.';
  }

  progressStatusText.textContent = statusText;
  progressPercentageText.textContent = percentage;
  progressBarFill.style.width = percentage;
}

// --- Load Details for a Run ---
async function loadRunDetails(runId) {
  currentRunId = runId;
  
  // Clear any existing polling intervals first
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }

  noRunPlaceholder.style.display = 'none';

  try {
    const response = await fetch(`/api/report/${runId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const run = data.run;

    // Check Status and route logic
    if (run.status !== 'COMPLETED' && run.status !== 'FAILED') {
      // Still processing in background!
      dashboardReportContainer.style.display = 'none';
      updateProgressUI(run.status);
      startPollingStatus(runId);
      return;
    }

    // Job finished! Hide progress banner
    progressBanner.style.display = 'none';
    dashboardReportContainer.style.display = 'block';

    if (run.status === 'FAILED') {
      reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-danger);padding:40px"><strong>Run Failed:</strong> ${run.error}</td></tr>`;
      invalidTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">N/A</td></tr>`;
      telemetrySection.style.display = 'none';
      return;
    }

    // Populate Completed stats and elements
    const summary = data.summary || {};
    currentReportData = data.report || [];
    currentInvalidData = data.invalidTransactions || [];

    // 1. Populate stats cards
    const userIn = summary.totalUserIngested || 0;
    const exchangeIn = summary.totalExchangeIngested || 0;
    statTotalIngested.textContent = userIn + exchangeIn;
    statIngestedBreakdown.textContent = `User: ${userIn} | Exchange: ${exchangeIn}`;

    const totalValid = (summary.totalUserValid || 0) + (summary.totalExchangeValid || 0);
    const matchedCount = summary.matchedCount || 0;
    const matchRatePct = totalValid > 0 ? ((matchedCount * 2) / totalValid) * 100 : 0;
    
    statMatchRate.textContent = `${matchRatePct.toFixed(1)}%`;
    statMatchCount.textContent = `${matchedCount} pairs (${matchedCount * 2} transactions) matched`;

    statConflictCount.textContent = summary.conflictingCount || 0;

    const unmatchedUser = summary.unmatchedUserCount || 0;
    const unmatchedExchange = summary.unmatchedExchangeCount || 0;
    statUnmatchedCount.textContent = unmatchedUser + unmatchedExchange;
    statUnmatchedBreakdown.textContent = `User: ${unmatchedUser} | Exchange: ${unmatchedExchange}`;

    invalidBadge.textContent = currentInvalidData.length;

    // 2. Render Performance Telemetry section
    if (run.metrics) {
      telemetrySection.style.display = 'block';
      metricIngestionThroughput.textContent = `${run.metrics.ingestionThroughput.toLocaleString()} rows/sec`;
      metricIngestionDuration.textContent = `${run.metrics.ingestionDurationMs}ms database write duration`;
      
      metricMatchingThroughput.textContent = `${run.metrics.matchingThroughput.toLocaleString()} rows/sec`;
      metricMatchingDuration.textContent = `${run.metrics.matchingDurationMs}ms matching pass duration`;
      
      metricTotalDuration.textContent = `${run.metrics.totalDurationMs}ms`;
    } else {
      telemetrySection.style.display = 'none';
    }

    // 3. Set CSV Download Link
    downloadCsvBtn.href = `/api/report/${runId}/download`;

    // 4. Render Tables
    renderReportTable(currentReportData);
    renderInvalidTable(currentInvalidData);

    applyFilters();

  } catch (err) {
    console.error('Error loading run details:', err);
    reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-danger)">Failed to load report data: ${err.message}</td></tr>`;
  }
}

// --- Render Reconciliation Report Table ---
function renderReportTable(entries) {
  if (entries.length === 0) {
    reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No entries in this report.</td></tr>`;
    return;
  }

  reportTableBody.innerHTML = '';
  entries.forEach(entry => {
    const tr = document.createElement('tr');
    
    const u = entry.userTransaction;
    const e = entry.exchangeTransaction;

    let categoryClass = 'matched';
    if (entry.category === 'CONFLICTING') categoryClass = 'conflicting';
    if (entry.category === 'UNMATCHED_USER') categoryClass = 'unmatched-user';
    if (entry.category === 'UNMATCHED_EXCHANGE') categoryClass = 'unmatched-exchange';

    let categoryText = entry.category;
    if (entry.category === 'UNMATCHED_USER') categoryText = 'Unmatched (User)';
    if (entry.category === 'UNMATCHED_EXCHANGE') categoryText = 'Unmatched (Exchange)';

    const asset = u ? u.asset : (e ? e.asset : '');
    const type = u ? u.type : (e ? e.type : '');

    let userColHTML = `<span class="tx-cell-empty">Not present</span>`;
    if (u) {
      const dateStr = new Date(u.timestamp).toLocaleString();
      userColHTML = `
        <div class="tx-cell-box">
          <span class="tx-cell-id" title="${u.transaction_id}">${u.transaction_id}</span>
          <span class="tx-cell-details">Qty: ${u.quantity} | Fee: ${u.fee || 0}</span>
          <span class="tx-cell-details">${dateStr}</span>
        </div>
      `;
    }

    let exchangeColHTML = `<span class="tx-cell-empty">Not present</span>`;
    if (e) {
      const dateStr = new Date(e.timestamp).toLocaleString();
      exchangeColHTML = `
        <div class="tx-cell-box">
          <span class="tx-cell-id" title="${e.transaction_id}">${e.transaction_id}</span>
          <span class="tx-cell-details">Qty: ${e.quantity} | Fee: ${e.fee || 0}</span>
          <span class="tx-cell-details">${dateStr}</span>
        </div>
      `;
    }

    // Render detailed Enterprise Audit trail info below matching reason
    let auditHTML = '';
    if (entry.auditTrail) {
      const audit = entry.auditTrail;
      auditHTML = `
        <div class="audit-trail-container" style="margin-top: 6px; font-size: 0.68rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 4px; display: flex; flex-direction: column; gap: 1px;">
          <span style="font-weight: 600; color: var(--text-secondary);">🔍 Audit Trace:</span>
          <span>• Rule: ${audit.matchingRuleApplied}</span>
          ${entry.category === 'MATCHED' || entry.category === 'CONFLICTING' ? `
            <span>• Margin: Time diff: ${audit.timeDifferenceSec}s | Qty diff: ${audit.quantityDifferencePct.toFixed(4)}%</span>
          ` : ''}
        </div>
      `;
    }

    tr.innerHTML = `
      <td><span class="category-badge ${categoryClass}">${categoryText}</span></td>
      <td><strong>${asset.toUpperCase()}</strong></td>
      <td><span class="badge" style="font-size:0.75rem">${type}</span></td>
      <td>${userColHTML}</td>
      <td>${exchangeColHTML}</td>
      <td class="reason-col">
        <span style="font-weight: 500;">${entry.reason}</span>
        ${auditHTML}
      </td>
    `;

    reportTableBody.appendChild(tr);
  });
}

// --- Render Invalid Ingested Transactions ---
function renderInvalidTable(invalids) {
  if (invalids.length === 0) {
    invalidTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Excellent! Zero validation errors found in this run.</td></tr>`;
    return;
  }

  invalidTableBody.innerHTML = '';
  invalids.forEach(tx => {
    const tr = document.createElement('tr');
    const sourceClass = tx.source === 'user' ? 'unmatched-user' : 'unmatched-exchange';
    const dateStr = tx.timestamp || 'N/A';

    tr.innerHTML = `
      <td><span class="category-badge ${sourceClass}">${tx.source}</span></td>
      <td><code title="${tx.transaction_id || 'N/A'}">${tx.transaction_id || 'N/A'}</code></td>
      <td>${dateStr}</td>
      <td><strong>${tx.asset || 'N/A'}</strong></td>
      <td>${tx.rawRow.quantity || 'N/A'}</td>
      <td><span class="validation-error-text">${tx.validationError}</span></td>
    `;

    invalidTableBody.appendChild(tr);
  });
}

// --- Filtering and Searching (In-Memory) ---
function applyFilters() {
  const searchQuery = reportSearch.value.trim().toLowerCase();
  const filterCat = categoryFilter.value;

  const filteredEntries = currentReportData.filter(entry => {
    const u = entry.userTransaction;
    const e = entry.exchangeTransaction;

    if (filterCat !== 'ALL') {
      if (filterCat === 'UNMATCHED') {
        if (entry.category !== 'UNMATCHED_USER' && entry.category !== 'UNMATCHED_EXCHANGE') return false;
      } else {
        if (entry.category !== filterCat) return false;
      }
    }

    if (searchQuery) {
      const asset = (u ? u.asset : (e ? e.asset : '')).toLowerCase();
      const type = (u ? u.type : (e ? e.type : '')).toLowerCase();
      const uId = (u ? u.transaction_id : '').toLowerCase();
      const eId = (e ? e.transaction_id : '').toLowerCase();
      const reason = entry.reason.toLowerCase();

      const matchesSearch = 
        asset.includes(searchQuery) ||
        type.includes(searchQuery) ||
        uId.includes(searchQuery) ||
        eId.includes(searchQuery) ||
        reason.includes(searchQuery);

      if (!matchesSearch) return false;
    }

    return true;
  });

  renderReportTable(filteredEntries);
}
