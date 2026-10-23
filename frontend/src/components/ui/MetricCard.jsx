import React from 'react';

const MetricCard = ({ label, value, subValue, type = 'neutral' }) => {
  const available = value !== null && value !== undefined && value !== '' && !(typeof value === 'number' && !Number.isFinite(value));
  const displayValue = available ? value : 'N/A';
  return (
    <div className={`metric-card ${available ? type : 'neutral'}`}>
      <dt className="metric-label">{label}</dt>
      <dd className="metric-value mono-font tabular-num" title={String(displayValue)}>{displayValue}</dd>
      {subValue && <div className="metric-subvalue" title={subValue}>{subValue}</div>}
    </div>
  );
};

export default React.memo(MetricCard);
