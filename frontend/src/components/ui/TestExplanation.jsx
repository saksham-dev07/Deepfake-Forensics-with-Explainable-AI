import React from 'react';
import { Lightbulb } from 'lucide-react';
import TestDefinition from './TestDefinition';

const TestExplanation = ({ explanation, testId }) => {
  if (!explanation) return null;
  const isDanger = explanation.result.toLowerCase().includes('deepfake') || explanation.result.toLowerCase().includes('detected') || explanation.result.toLowerCase().includes('mismatch') || explanation.result.toLowerCase().includes('disrupted');
  const isWarning = explanation.result.toLowerCase().includes('suppressed') || explanation.result.toLowerCase().includes('inconclusive');
  const iconColor = isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const bgColor = isDanger ? 'rgba(239, 68, 68, 0.05)' : isWarning ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      
      <TestDefinition testId={testId} />

      <div className="info-callout" style={{ marginBottom: 0, backgroundColor: bgColor, borderLeftColor: iconColor, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div className="info-callout-icon" style={{ marginTop: '2px' }}><Lightbulb size={20} color={iconColor} /></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>{explanation.result}</h4>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--text-primary)' }}>What Happened:</strong> {explanation.what_happened}
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why:</strong> {explanation.why_it_happened}
            </p>
          </div>
        </div>
      
      {explanation.variables && Object.keys(explanation.variables).length > 0 && (
        <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px' }}>Calculated Variables</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(explanation.variables).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TestExplanation;
