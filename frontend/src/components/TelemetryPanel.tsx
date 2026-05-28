import React from 'react';
import { Cpu, Zap, Clock } from 'lucide-react';

interface TelemetryMetrics {
  ingestionThroughput: number;
  ingestionDurationMs: number;
  matchingThroughput: number;
  matchingDurationMs: number;
  totalDurationMs: number;
}

interface TelemetryPanelProps {
  metrics?: TelemetryMetrics;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <section
      className="panel-section telemetry-section"
      style={{
        borderColor: 'var(--border-glow)',
        background: 'rgba(139, 92, 246, 0.01)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        marginBottom: '24px',
      }}
    >
      <h2
        style={{
          fontSize: '0.95rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: 'none',
          paddingBottom: '0',
          margin: '0',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Cpu size={16} style={{ color: 'var(--color-purple)' }} />
        Performance Telemetry Metrics
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Ingestion Speed */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            padding: '14px',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={12} /> Ingestion Speed
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
            {metrics.ingestionThroughput.toLocaleString()} rows/sec
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {metrics.ingestionDurationMs}ms database write duration
          </span>
        </div>

        {/* Matching Speed */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            padding: '14px',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Cpu size={12} /> Matching Speed
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
            {metrics.matchingThroughput.toLocaleString()} rows/sec
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {metrics.matchingDurationMs}ms matching pass duration
          </span>
        </div>

        {/* End-to-End Latency */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            padding: '14px',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> End-to-End Latency
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              fontWeight: 700,
              color: 'var(--color-purple)',
            }}
          >
            {metrics.totalDurationMs}ms
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            Asynchronous queue total
          </span>
        </div>
      </div>
    </section>
  );
};
