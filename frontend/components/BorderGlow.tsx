'use client';

import React, { useRef, useState, useEffect } from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export default function BorderGlow({ 
  children, 
  className = '',
  glowColor = 'rgba(124, 58, 237, 0.5)' // accent glow color
}: BorderGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full overflow-hidden rounded-[20px] ${className}`}
    >
      <div 
        className="pointer-events-none absolute -inset-px rounded-[20px] z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`
        }}
      />
      <div className="relative z-10 w-full rounded-[20px] bg-[var(--bg-glass)] h-full">
        {children}
      </div>
    </div>
  );
}
