import React from 'react';
import { Lightbulb, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import TestDefinition from './TestDefinition';

const TestExplanation = ({ explanation, testId }) => {
  if (!explanation) return null;

  const resultStr = String(explanation.result || '');
  const lowerResult = resultStr.toLowerCase();
  const isDanger = lowerResult.includes('deepfake') || lowerResult.includes('detected') || lowerResult.includes('mismatch') || lowerResult.includes('disrupted') || lowerResult.includes('synthetic');
  const isWarning = lowerResult.includes('suppressed') || lowerResult.includes('inconclusive') || lowerResult.includes('elevated') || lowerResult.includes('warn');

  const statusColor = isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const statusBg = isDanger ? 'rgba(244, 63, 94, 0.08)' : isWarning ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)';
  const statusBorder = isDanger ? 'rgba(244, 63, 94, 0.25)' : isWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)';

  const variables = explanation.variables || {};
  const varEntries = Object.entries(variables);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <TestDefinition testId={testId} />

      <div 
        style={{ 
          background: statusBg, 
          border: `1px solid ${statusBorder}`, 
          borderLeft: `4px solid ${statusColor}`,
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ marginTop: '2px', color: statusColor }}>
            {isDanger ? <AlertTriangle size={18} /> : isWarning ? <Info size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)', fontSize: '0.925rem', fontWeight: 700 }}>
              {resultStr || 'Forensic Finding'}
            </h4>
            {explanation.what_happened && (
              <p style={{ margin: '0 0 0.35rem 0', color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-main)' }}>Observation:</strong> {explanation.what_happened}
              </p>
            )}
            {explanation.why_it_happened && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-main)' }}>Diagnostic Cause:</strong> {explanation.why_it_happened}
              </p>
            )}
          </div>
        </div>

        {varEntries.length > 0 && (
          <div style={{ marginLeft: '2rem', padding: '0.65rem 0.85rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              Empirical Sensor Variables
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {varEntries.map(([key, val]) => (
                <div key={key}>
                  <div className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{key}</div>
                  <div className="mono-font tabular-num" style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '1px' }}>
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TestExplanation);
