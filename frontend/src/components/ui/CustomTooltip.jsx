import React from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-main)',
        minWidth: '150px'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {label !== undefined ? `Frame ${label}` : 'Data Point'}
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{entry.name}:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {typeof entry.value === 'number' ? (entry.value <= 1 ? (entry.value * 100).toFixed(1) + '%' : entry.value.toFixed(2)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
