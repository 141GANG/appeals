'use client';

import { useEffect, useRef } from 'react';

type CursorState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  strength: number;
  targetStrength: number;
};

type InteractiveGridProps = {
  placement?: 'hero' | 'footer';
};

export default function InteractiveGrid({
  placement = 'hero',
}: InteractiveGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const context = canvas.getContext('2d');
    if (!container || !context) return;
    const gridCanvas = canvas;
    const gridContainer = container;
    const gridContext = context;

    let width = 0;
    let height = 0;
    let rootFontSize = 16;
    let animationFrame = 0;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const cursor: CursorState = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      strength: 0,
      targetStrength: 0,
    };

    function warpedPoint(rawX: number, rawY: number, time: number) {
      const lensCenterX = width * 0.5;
      const lensCenterY = height * 0.48;
      const normalizedX = (rawX - lensCenterX) / (width * 0.55);
      const normalizedY = (rawY - lensCenterY) / (height * 0.62);
      const distanceSquared = Math.min(
        2.2,
        normalizedX * normalizedX + normalizedY * normalizedY,
      );
      const fisheyeScale = 1 + distanceSquared * 0.055;
      let x = lensCenterX + (rawX - lensCenterX) * fisheyeScale;
      let y = lensCenterY + (rawY - lensCenterY) * fisheyeScale;

      y += Math.sin(rawX * 0.0065 + rawY * 0.003 + time * 0.00032) * 1.25;

      const dx = x - cursor.x;
      const dy = y - cursor.y;
      const radius = Math.max(rootFontSize * 10, Math.min(width, height) * 0.2);
      const influence =
        Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius)) *
        cursor.strength;

      const localScale = 1 + influence * 0.036;
      x = cursor.x + dx * localScale;
      y = cursor.y + dy * localScale - influence * 1.5;

      return { x, y };
    }

    function draw(timestamp: number) {
      gridContext.clearRect(0, 0, width, height);
      cursor.x += (cursor.targetX - cursor.x) * 0.075;
      cursor.y += (cursor.targetY - cursor.y) * 0.075;
      cursor.strength += (cursor.targetStrength - cursor.strength) * 0.055;

      gridContext.lineCap = 'round';
      gridContext.lineJoin = 'round';
      gridContext.shadowBlur = 3;
      gridContext.shadowColor = 'rgba(230, 232, 235, 0.2)';

      const cellWidth = Math.max(
        rootFontSize * 10.5,
        Math.min(rootFontSize * 15, width / 6.5),
      );
      const cellHeight = Math.max(rootFontSize * 7.5, cellWidth * 0.68);
      const margin = cellWidth * 1.5;
      const horizontalTravel = (timestamp * 0.018) % cellWidth;
      const samples = 84;

      let line = 0;
      for (
        let lineX = -margin - horizontalTravel;
        lineX <= width + margin;
        lineX += cellWidth
      ) {
        const shimmer = 0.5 + 0.5 * Math.sin(timestamp * 0.00048 + line * 0.73);
        gridContext.beginPath();
        for (let sample = 0; sample <= samples; sample += 1) {
          const rawY =
            -cellHeight + (sample / samples) * (height + cellHeight * 2);
          const rawX =
            lineX + Math.sin(rawY * 0.004 + timestamp * 0.00022 + line) * 0.85;
          const point = warpedPoint(rawX, rawY, timestamp);
          if (sample === 0) gridContext.moveTo(point.x, point.y);
          else gridContext.lineTo(point.x, point.y);
        }
        gridContext.lineWidth = 0.85 + shimmer * 0.45;
        gridContext.strokeStyle = `rgba(205, 209, 214, ${0.16 + shimmer * 0.1})`;
        gridContext.stroke();
        line += 1;
      }

      let row = 0;
      for (
        let lineY = -cellHeight;
        lineY <= height + cellHeight;
        lineY += cellHeight
      ) {
        const shimmer =
          0.5 + 0.5 * Math.sin(timestamp * 0.00042 + row * 0.64 + 1.8);
        gridContext.beginPath();
        for (let sample = 0; sample <= samples; sample += 1) {
          const rawX = -margin + (sample / samples) * (width + margin * 2);
          const travelingX = rawX + timestamp * 0.018;
          const rawY =
            lineY + Math.sin(travelingX * 0.006 + lineY * 0.004) * 1.1;
          const point = warpedPoint(rawX, rawY, timestamp);
          if (sample === 0) gridContext.moveTo(point.x, point.y);
          else gridContext.lineTo(point.x, point.y);
        }
        gridContext.lineWidth = 0.9 + shimmer * 0.35;
        gridContext.strokeStyle = `rgba(210, 213, 218, ${0.15 + shimmer * 0.1})`;
        gridContext.stroke();
        row += 1;
      }

      if (cursor.strength > 0.01) {
        gridContext.shadowBlur = 0;
        const radius = Math.max(
          rootFontSize * 10,
          Math.min(width, height) * 0.21,
        );
        const glow = gridContext.createRadialGradient(
          cursor.x,
          cursor.y,
          0,
          cursor.x,
          cursor.y,
          radius,
        );
        glow.addColorStop(0, `rgba(237, 52, 52, ${cursor.strength * 0.025})`);
        glow.addColorStop(1, 'rgba(237, 52, 52, 0)');
        gridContext.fillStyle = glow;
        gridContext.fillRect(0, 0, width, height);
      }

      if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    }

    function resize() {
      const rect = gridContainer.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      rootFontSize =
        Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      gridCanvas.width = Math.round(width * ratio);
      gridCanvas.height = Math.round(height * ratio);
      gridCanvas.style.width = `${width}px`;
      gridCanvas.style.height = `${height}px`;
      gridContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!cursor.x && !cursor.y) {
        cursor.x = cursor.targetX = width * 0.5;
        cursor.y = cursor.targetY = height * 0.55;
      }
      if (reducedMotion) draw(performance.now());
    }

    function updatePointer(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const rect = gridContainer.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      cursor.targetStrength = inside ? 1 : 0;
      if (inside) {
        cursor.targetX = event.clientX - rect.left;
        cursor.targetY = event.clientY - rect.top;
      }
      if (reducedMotion) draw(performance.now());
    }

    function hideMagnification() {
      cursor.targetStrength = 0;
    }

    function handlePointerOut(event: PointerEvent) {
      if (!event.relatedTarget) hideMagnification();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(gridContainer);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerout', handlePointerOut, { passive: true });
    window.addEventListener('blur', hideMagnification);
    resize();
    if (!reducedMotion) animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', hideMagnification);
    };
  }, []);

  return (
    <div
      className={`grid-background grid-background-${placement}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="grid-canvas" />
      <span className="grid-shade" />
    </div>
  );
}
