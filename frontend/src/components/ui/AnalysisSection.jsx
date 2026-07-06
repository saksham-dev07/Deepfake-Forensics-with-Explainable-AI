import React from 'react';
import TestExplanation from './TestExplanation';

const AnalysisSection = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor = 'var(--primary)', 
  iconBg = 'rgba(255,255,255,0.05)', 
  testId, 
  explanation, 
  children 
}) => {
  return (
    <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
      <div className="panel-header">
        <div className="panel-icon" style={{ background: iconBg }}>
          <Icon size={20} color={iconColor} />
        </div>
        <div>
          <div className="panel-title">{title}</div>
          <div className="panel-subtitle">{subtitle}</div>
        </div>
      </div>
      
      {explanation && <TestExplanation testId={testId} explanation={explanation} />}

      <div className="tab-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default AnalysisSection;
