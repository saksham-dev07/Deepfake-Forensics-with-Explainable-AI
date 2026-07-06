import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  
  const status = typeof verdict === 'string' ? verdict : verdict.status;
  const reason = typeof verdict === 'string' ? null : verdict.reason;
  
  if (!status) return null;

  const isPass = status.toLowerCase().includes('pass');
  const isWarn = status.toLowerCase().includes('warn');
  const bgColor = isPass ? 'rgba(16, 185, 129, 0.15)' : isWarn ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const textColor = isPass ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';
  const icon = isPass ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem',
        fontWeight: 600, backgroundColor: bgColor, color: textColor,
      }}>
        {icon} {status.toUpperCase()}
      </div>
      {reason && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '180px', textAlign: 'right', lineHeight: '1.2' }}>
          {reason}
        </div>
      )}
    </div>
  );
};

export default VerdictBadge;
