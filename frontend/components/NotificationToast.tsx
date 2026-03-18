'use client';

import React, { useState, useEffect } from 'react';
import { StatusColor } from './Footer';

export default function NotificationToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<StatusColor>('green');

  useEffect(() => {
    // Show a welcome notification on mount
    setTimeout(() => {
      setMessage('Welcome to InsightEngine! System operational.');
      setStatus('green');
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    }, 1500);

    const handleStatus = (e: any) => {
      const s = e.detail;
      setStatus(s);
      if (s === 'yellow') setMessage('Researching topic...');
      if (s === 'green') setMessage('Research complete!');
      if (s === 'red') setMessage('An error occurred during research.');
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    };

    window.addEventListener('statusChange', handleStatus);
    return () => window.removeEventListener('statusChange', handleStatus);
  }, []);

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }} className="toast-animate">
      <div className="misty-border-group" style={{ position: 'relative', padding: '1.5px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
        {/* Animated Mist Border (Conic gradient) */}
        <div className="misty-border-glow" style={{ position: 'absolute', inset: 0, borderRadius: '12px' }} />
        
        {/* Inner Card representing ShadCN alert/toast */}
        <div style={{ position: 'relative', background: 'hsl(240,10%,3.9%)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(24px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              {message}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .misty-border-group:hover .misty-border-glow {
          animation-play-state: paused;
          opacity: 0.1;
        }
        .misty-border-glow {
          background: conic-gradient(from 0deg, transparent 0%, rgba(124,58,237,0.1) 20%, rgba(167,139,250,0.5) 50%, rgba(124,58,237,0.1) 80%, transparent 100%);
          animation: spin-mist 3s linear infinite;
        }
        @keyframes spin-mist {
          from { transform: rotate(0deg) scale(1.5); }
          to { transform: rotate(360deg) scale(1.5); }
        }
        .toast-animate {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
