import React from 'react';

const ScoreRing = ({ score, label, invert = false, size = 120 }) => {
  const s = invert ? 1 - score : score;
  const color = s > 0.6 ? 'var(--danger)' : s > 0.35 ? 'var(--warning)' : 'var(--success)';
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring-svg">
        <circle className="score-ring-bg" cx={size/2} cy={size/2} r={radius} strokeWidth={size*0.08} />
        <circle 
          className="score-ring-progress" 
          cx={size/2} cy={size/2} r={radius} 
          strokeWidth={size*0.08} stroke={color}
          strokeDasharray={circumference} strokeDashoffset={offset} 
        />
        <text 
          x={size/2} y={size/2} 
          className="score-ring-text" 
          fontSize={size*0.22} 
          transform={`rotate(90 ${size/2} ${size/2})`}
        >
          {Math.round(score * 100)}%
        </text>
      </svg>
      {label && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>}
    </div>
  );
};

export default ScoreRing;
