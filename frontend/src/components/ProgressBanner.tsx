import React from 'react';

interface ProgressBannerProps {
  status: string;
}

export const ProgressBanner: React.FC<ProgressBannerProps> = ({ status }) => {
  if (status === 'COMPLETED' || status === 'FAILED' || !status) {
    return null;
  }

  let percentage = '0%';
  let statusText = 'Queueing reconciliation job...';

  if (status === 'PENDING') {
    percentage = '15%';
    statusText = 'Queued in BullMQ Redis queue...';
  } else if (status === 'INGESTING') {
    percentage = '45%';
    statusText = 'Large CSV datasets: Stream-batching rows into MongoDB...';
  } else if (status === 'MATCHING') {
    percentage = '80%';
    statusText = 'Running high-performance bucket index matcher...';
  }

  return (
    <div
      className="panel-section progress-banner-section"
      style={{
        borderColor: 'var(--color-purple)',
        background: 'rgba(139, 92, 246, 0.02)',
        marginBottom: '24px',
      }}
    >
      <div
        className="progress-banner-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
          <h3 id="progressStatusText" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white', margin: 0 }}>
            {statusText}
          </h3>
        </div>
        <span
          className="badge"
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'var(--color-purple-glow)',
            color: 'var(--color-purple)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {percentage}
        </span>
      </div>
      <div
        className="progress-bar-track"
        style={{
          height: '6px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: percentage,
            height: '100%',
            background: 'linear-gradient(135deg, var(--color-purple), var(--color-blue))',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 8px var(--color-purple)',
          }}
        ></div>
      </div>
    </div>
  );
};
