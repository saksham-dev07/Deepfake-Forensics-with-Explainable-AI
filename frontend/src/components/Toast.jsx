import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const colors = {
    error: {
      bg: 'rgba(251, 113, 133, 0.1)',
      border: 'rgba(251, 113, 133, 0.3)',
      text: 'var(--danger)',
      icon: <AlertCircle size={20} />
    },
    success: {
      bg: 'rgba(52, 211, 153, 0.1)',
      border: 'rgba(52, 211, 153, 0.3)',
      text: 'var(--success)',
      icon: <CheckCircle2 size={20} />
    },
    info: {
      bg: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.3)',
      text: 'var(--info)',
      icon: <Info size={20} />
    }
  };

  const style = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${style.border}`,
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <div style={{ color: style.text, marginTop: '2px' }}>
        {style.icon}
      </div>
      <div style={{ flex: 1, color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.5' }}>
        {message}
      </div>
      <button 
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#cbd5e1'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
