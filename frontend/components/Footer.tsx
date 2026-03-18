'use client';

import React, { useState, useEffect } from 'react';

export type StatusColor = 'green' | 'yellow' | 'red';

interface FooterProps {
  status?: StatusColor;
  className?: string;
}

const processingSteps = [
  "Insight Engine is starting...",
  "Searching for the true facts...",
  "Collecting info for the user...",
  "Validating the research...",
  "Testing the accuracy...",
  "Documenting the research..."
];

export default function Footer({ status = 'green', className = '' }: FooterProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusColor>(status);
  const [stepIndex, setStepIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const handleStatus = (e: any) => setCurrentStatus(e.detail);
    window.addEventListener('statusChange', handleStatus);
    return () => window.removeEventListener('statusChange', handleStatus);
  }, []);

  useEffect(() => {
    if (currentStatus !== 'yellow') {
      setStepIndex(0);
      setFade(true);
      return;
    }
    
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStepIndex(i => (i + 1) % processingSteps.length);
        setFade(true);
      }, 500); 
    }, 4000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  let text = "Insight Engine is Operational";
  if (currentStatus === 'red') text = "Error Detected";
  else if (currentStatus === 'yellow') text = processingSteps[stepIndex];

  return (
    <footer className={`site-footer ${className}`}>
      <div className="footer-content">
        <span 
          className="footer-text"
          style={{ transition: 'opacity 0.5s ease', opacity: fade ? 1 : 0 }}
        >
          {text}
        </span>
      </div>
    </footer>
  );
}
