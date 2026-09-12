import React from 'react';

const MetricCard = ({ label, value, subValue, type = 'neutral' }) => {
  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-label" title={label}>{label}</div>
      <div className="metric-value mono-font tabular-num" title={String(value)}>{value}</div>
      {subValue && <div className="metric-subvalue" title={subValue}>{subValue}</div>}
    </div>
  );
};

export default React.memo(MetricCard);
