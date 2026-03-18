'use client';

import React, { useState, useEffect } from 'react';

export type StatusColor = 'green' | 'yellow' | 'red';

interface FooterProps {
  status?: StatusColor;
  className?: string;
}

export default function Footer({ status = 'green', className = '' }: FooterProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusColor>(status);

  useEffect(() => {
    const handleStatus = (e: any) => setCurrentStatus(e.detail);
    window.addEventListener('statusChange', handleStatus);
    return () => window.removeEventListener('statusChange', handleStatus);
  }, []);

  return (
    <footer className={`site-footer ${className}`}>
      <div className="footer-content">
        <span className="footer-text">
          System Status: {currentStatus === 'green' ? 'Operational' : currentStatus === 'yellow' ? 'Processing...' : 'Error Detected'}
        </span>
      </div>
    </footer>
  );
}
