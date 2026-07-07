import React from 'react';

const SkeletonLoader = ({ className = '', style = {}, type = 'rect', children }) => {
  const baseClass = "animate-pulse bg-[#1e293b] rounded-xl";
  
  if (type === 'circle') {
    return <div className={`animate-pulse bg-[#1e293b] rounded-full ${className}`} style={style} />;
  }

  if (type === 'text') {
    return (
      <div className={`flex flex-col gap-2 ${className}`} style={style}>
        <div className="h-4 bg-[#1e293b] rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-[#1e293b] rounded w-1/2 animate-pulse"></div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`${baseClass} p-5 border border-[#334155] flex flex-col gap-4 ${className}`} style={style}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#334155] animate-pulse"></div>
          <div className="h-5 bg-[#334155] rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="flex-1 min-h-[150px] bg-[#334155] rounded-lg animate-pulse opacity-50"></div>
        {children}
      </div>
    );
  }

  // Default Rect
  return <div className={`${baseClass} ${className}`} style={style}>{children}</div>;
};

export default SkeletonLoader;
