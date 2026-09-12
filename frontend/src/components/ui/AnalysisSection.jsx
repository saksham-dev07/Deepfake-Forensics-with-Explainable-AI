import React from 'react';
import TestExplanation from './TestExplanation';

const AnalysisSection = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor = 'var(--primary)', 
  iconBg = 'rgba(255,255,255,0.03)', 
  testId, 
  explanation, 
  children 
}) => {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {Icon && (
            <div style={{ padding: '6px', borderRadius: 'var(--radius-xs)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={iconColor} />
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
          </div>
        </div>
      </div>
      
      {explanation && <TestExplanation testId={testId} explanation={explanation} />}

      <div className="tab-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default React.memo(AnalysisSection);
