import React, { useRef, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';

/** Shared pointer and keyboard control for every A/B image comparison. */
const WipeDivider = ({
  wipePercent = 50,
  setWipePercent,
  containerRef,
  color = 'var(--primary)',
  shadowColor = 'rgba(59, 130, 246, 0.8)',
}) => {
  const drag = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const percent = Number.isFinite(wipePercent) ? Math.max(0, Math.min(100, wipePercent)) : 50;
  const update = (value) => setWipePercent?.(Math.max(0, Math.min(100, Math.round(value))));

  const handlePointerDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || !containerRef?.current) return;
    const width = containerRef.current.clientWidth;
    if (width <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    drag.current = { id: event.pointerId, x: event.clientX, percent, width };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    event.preventDefault();
    update(drag.current.percent + (event.clientX - drag.current.x) / drag.current.width * 100);
  };

  const stopDrag = (event) => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    drag.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 1;
    const values = { ArrowLeft: percent - step, ArrowDown: percent - step,
      ArrowRight: percent + step, ArrowUp: percent + step,
      PageDown: percent - 10, PageUp: percent + 10, Home: 0, End: 100 };
    if (!(event.key in values)) return;
    event.preventDefault();
    event.stopPropagation();
    update(values[event.key]);
  };

  return (
    <>
      <div className="comparison-seam" aria-hidden="true" style={{
        left: `${percent}%`, background: color,
        boxShadow: `0 0 ${isDragging ? 14 : 8}px ${shadowColor}`,
      }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% original visible`}
        aria-orientation="horizontal"
        title="Drag to swipe between Original and Forensic layers"
        className="comparison-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onKeyDown={handleKeyDown}
        style={{ left: `clamp(22px, ${percent}%, calc(100% - 22px))`, '--wipe-color': color }}
      >
        <span className="comparison-grip"><ArrowRightLeft size={14} aria-hidden="true" /></span>
      </div>
    </>
  );
};

export default WipeDivider;
