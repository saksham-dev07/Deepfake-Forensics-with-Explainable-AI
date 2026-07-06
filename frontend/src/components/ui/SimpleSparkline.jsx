import React from 'react';

const SimpleSparkline = ({ data, color, label, ideal }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data, ideal || Infinity);
  const max = Math.max(...data, ideal || -Infinity);
  const range = max - min || 1;
  const padding = 10;
  const width = 200;
  const height = 40;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const idealY = ideal !== undefined ? padding + (1 - (ideal - min) / range) * (height - 2 * padding) : null;

  return (
    <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {idealY !== null && (
          <line x1={0} y1={idealY} x2={width} y2={idealY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {data.map((val, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
          const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
      </svg>
    </div>
  );
};

export default SimpleSparkline;
