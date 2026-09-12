import React from 'react';

const ScoreRing = ({ score = 0, label, invert = false, size = 120 }) => {
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.min(1, Math.max(0, score)) : 0;
  const s = invert ? 1 - safeScore : safeScore;
  const color = s > 0.6 ? 'var(--danger)' : s > 0.35 ? 'var(--warning)' : 'var(--success)';
  
  const strokeWidth = Math.max(4, Math.round(size * 0.08));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore * circumference);
  const center = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track circle */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)" 
          strokeWidth={strokeWidth} 
        />
        {/* Animated progress circle, rotated -90 deg so it starts at 12 o'clock */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        {/* Upright, perfectly centered percentage text */}
        <text 
          x={center} 
          y={center} 
          textAnchor="middle" 
          dominantBaseline="central"
          className="mono-font tabular-num"
          fill="var(--text-main)"
          fontSize={Math.round(size * 0.22)}
          fontWeight="800"
        >
          {Math.round(safeScore * 100)}%
        </text>
      </svg>
      {label && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
          {label}
        </div>
      )}
    </div>
  );
};

export default React.memo(ScoreRing);
