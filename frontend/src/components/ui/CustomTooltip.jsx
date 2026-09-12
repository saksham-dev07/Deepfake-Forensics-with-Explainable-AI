import React from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0d121c',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        color: 'var(--text-main)',
        minWidth: '140px',
        fontSize: '0.78rem'
      }}>
        <div style={{ margin: '0 0 0.35rem 0', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label !== undefined ? `Frame ${label}` : 'Metric Sample'}
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '0.2rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: entry.color || 'var(--primary)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{entry.name}:</span>
            </div>
            <span className="mono-font tabular-num" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {typeof entry.value === 'number' ? (entry.value <= 1 && entry.value >= 0 ? `${(entry.value * 100).toFixed(1)}%` : entry.value.toFixed(2)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default React.memo(CustomTooltip);
