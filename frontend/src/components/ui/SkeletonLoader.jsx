import React from 'react';

const SkeletonLoader = ({ className = '', style = {}, type = 'rect', children }) => {
  if (type === 'circle') {
    return (
      <div 
        className={`skeleton-box skeleton-circle ${className}`} 
        style={{ width: '40px', height: '40px', ...style }} 
      />
    );
  }

  if (type === 'text') {
    return (
      <div className={`skeleton-text-group ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
        <div className="skeleton-box" style={{ height: '14px', width: '75%' }} />
        <div className="skeleton-box" style={{ height: '14px', width: '50%' }} />
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div 
        className={`glass-panel ${className}`} 
        style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton-box skeleton-circle" style={{ width: '32px', height: '32px' }} />
          <div className="skeleton-box" style={{ height: '16px', width: '35%' }} />
        </div>
        <div className="skeleton-box" style={{ minHeight: '140px', width: '100%' }} />
        {children}
      </div>
    );
  }

  // Default Rect
  return (
    <div className={`skeleton-box ${className}`} style={{ minHeight: '20px', ...style }}>
      {children}
    </div>
  );
};

export default React.memo(SkeletonLoader);
