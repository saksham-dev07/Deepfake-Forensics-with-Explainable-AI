import React, { useState, useCallback } from 'react';
import { ArrowRightLeft } from 'lucide-react';

/**
 * Interactive A/B Wipe Divider Line with Draggable Center Handle
 * Supports desktop mouse drag & touch swipe via standard Pointer Events and Pointer Capture.
 */
const WipeDivider = ({
  wipePercent = 50,
  setWipePercent,
  containerRef,
  color = 'var(--primary)',
  shadowColor = 'rgba(59, 130, 246, 0.8)'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const calculatePercent = useCallback((clientX) => {
    if (!containerRef?.current || !setWipePercent) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, rawX));
    const percent = Math.round((clampedX / rect.width) * 100);
    setWipePercent(percent);
  }, [containerRef, setWipePercent]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Fallback if browser doesn't support capture on specific target
    }
    calculatePercent(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    calculatePercent(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Drag to swipe between Original and Forensic layers"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${wipePercent}%`,
        width: '36px',
        transform: 'translateX(-50%)',
        cursor: 'ew-resize',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none'
      }}
    >
      {/* Central Visual Neon Divider Line */}
      <div
        style={{
          width: '2px',
          height: '100%',
          background: color,
          boxShadow: isDragging || isHovered
            ? `0 0 14px ${shadowColor}, 0 0 4px #fff`
            : `0 0 8px ${shadowColor}`,
          transition: 'box-shadow 0.15s ease'
        }}
      />

      {/* Central Circular Swiper Handle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${isDragging || isHovered ? 1.15 : 1.0})`,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: color,
          border: '2px solid #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDragging || isHovered
            ? `0 0 16px ${shadowColor}, 0 4px 12px rgba(0,0,0,0.9)`
            : '0 2px 8px rgba(0,0,0,0.85)',
          cursor: 'ew-resize',
          transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease'
        }}
      >
        <ArrowRightLeft size={11} color="#ffffff" strokeWidth={2.5} />
      </div>
    </div>
  );
};

export default WipeDivider;
