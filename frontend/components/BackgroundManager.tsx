'use client';

import React, { useEffect, useState } from 'react';
import SoftAurora from './SoftAurora';

export default function BackgroundManager() {
  const [colors, setColors] = useState({ c1: '#34d399', c2: '#3b82f6' }); // Green/Blue for nominal

  useEffect(() => {
    const handleStatus = (e: any) => {
      const status = e.detail;
      if (status === 'green') {
        setColors({ c1: '#34d399', c2: '#3b82f6' }); // Green/Blue
      } else if (status === 'yellow') {
        setColors({ c1: '#fbbf24', c2: '#f59e0b' }); // Yellow/Amber
      } else if (status === 'red') {
        setColors({ c1: '#f87171', c2: '#ef4444' }); // Red
      }
    };

    window.addEventListener('statusChange', handleStatus);
    return () => window.removeEventListener('statusChange', handleStatus);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
      <SoftAurora 
        color1={colors.c1} 
        color2={colors.c2} 
        speed={0.4} 
        brightness={0.8}
        bandHeight={0.2}
      />
    </div>
  );
}
