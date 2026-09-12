import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 250);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  };

  const config = {
    error: {
      border: 'rgba(244, 63, 94, 0.4)',
      accent: 'var(--danger)',
      bg: 'rgba(244, 63, 94, 0.1)',
      icon: <AlertCircle size={18} />
    },
    success: {
      border: 'rgba(16, 185, 129, 0.4)',
      accent: 'var(--success)',
      bg: 'rgba(16, 185, 129, 0.1)',
      icon: <CheckCircle2 size={18} />
    },
    info: {
      border: 'rgba(59, 130, 246, 0.4)',
      accent: 'var(--primary)',
      bg: 'rgba(59, 130, 246, 0.1)',
      icon: <Info size={18} />
    }
  };

  const current = config[type] || config.info;

  return (
    <div style={{
      position: 'fixed',
      top: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      background: 'var(--panel-bg)',
      border: `1px solid ${current.border}`,
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.85rem 1.1rem',
      maxWidth: '420px',
      transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-15px) scale(0.96)',
      opacity: isVisible ? 1 : 0,
      transition: 'all var(--transition-fast)'
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: 'var(--radius-xs)',
        background: current.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: current.accent,
        flexShrink: 0,
        marginTop: '0.1rem'
      }}>
        {current.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: current.accent, fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
          {type === 'error' ? 'Forensic System Alert' : type === 'success' ? 'Verification Passed' : 'System Notice'}
        </div>
        <div style={{ color: 'var(--text-main)', fontSize: '0.825rem', lineHeight: 1.5 }}>
          {message}
        </div>
      </div>

      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color var(--transition-fast)'
        }}
        title="Dismiss Alert"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default Toast;
