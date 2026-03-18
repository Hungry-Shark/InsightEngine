'use client';

import React, { useRef, useEffect, useCallback, ReactNode } from 'react';

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: 'linear' | 'ease-out';
  extraScale?: number;
  children: ReactNode;
}

export default function ClickSpark({
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<{ x: number; y: number; angle: number }[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });

    resizeObserver.observe(parent);

    // Initial sizing
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const draw = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let progress = (timestamp - startTimeRef.current) / duration;
    
    if (progress > 1) {
      progress = 1;
    }

    // Easing function
    const ease = easing === 'ease-out' ? 1 - Math.pow(1 - progress, 3) : progress;
    let allFinished = true;

    sparksRef.current.forEach((spark) => {
      if (progress >= 1) return;
      allFinished = false;
      const distance = sparkRadius * extraScale * ease;
      const x = spark.x + Math.cos(spark.angle) * distance;
      const y = spark.y + Math.sin(spark.angle) * distance;

      ctx.beginPath();
      ctx.arc(x, y, sparkSize * (1 - ease), 0, Math.PI * 2);
      ctx.fillStyle = sparkColor;
      ctx.fill();
    });

    if (allFinished || progress >= 1) {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      startTimeRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = [];
    } else {
      animationIdRef.current = requestAnimationFrame(draw);
    }
  }, [duration, sparkColor, sparkSize, sparkRadius, extraScale, easing]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    sparksRef.current = Array.from({ length: sparkCount }).map((_, i) => ({
      x,
      y,
      angle: (Math.PI * 2 * i) / sparkCount,
    }));

    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    startTimeRef.current = performance.now();
    animationIdRef.current = requestAnimationFrame(draw);
  }, [sparkCount, draw]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: 'inherit' }} onClick={handleClick}>
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    </div>
  );
}
