import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  
  const status = typeof verdict === 'string' ? verdict : verdict.status;
  const reason = typeof verdict === 'string' ? null : verdict.reason;
  
  if (!status) return null;

  const lower = status.toLowerCase();
  const isPass = lower.includes('pass') || lower.includes('authentic') || lower.includes('normal');
  const isWarn = lower.includes('warn') || lower.includes('inconclusive') || lower.includes('suspect');
  
  const bgColor = isPass ? 'rgba(16, 185, 129, 0.08)' : isWarn ? 'rgba(245, 158, 11, 0.08)' : 'rgba(244, 63, 94, 0.08)';
  const borderColor = isPass ? 'rgba(16, 185, 129, 0.25)' : isWarn ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)';
  const textColor = isPass ? 'var(--success)' : isWarn ? 'var(--warning)' : 'var(--danger)';
  const icon = isPass ? <CheckCircle2 size={11} /> : isWarn ? <AlertTriangle size={11} /> : <ShieldAlert size={11} />;
  
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div 
        className="mono-font"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 7px', borderRadius: 'var(--radius-xs)', fontSize: '0.68rem',
          fontWeight: 700, letterSpacing: '0.04em', backgroundColor: bgColor, 
          border: `1px solid ${borderColor}`, color: textColor,
        }}
      >
        {icon} {status.toUpperCase()}
      </div>
      {reason && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '180px', textAlign: 'right', lineHeight: 1.2 }}>
          {reason}
        </div>
      )}
    </div>
  );
};

export default React.memo(VerdictBadge);
