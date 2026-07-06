import React from 'react';

const MetricCard = ({ label, value, subValue, type = 'neutral' }) => {
  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={value}>{value}</div>
      {subValue && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={subValue}>{subValue}</div>}
    </div>
  );
};

export default MetricCard;
