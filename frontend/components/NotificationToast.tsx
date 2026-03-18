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
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="misty-border-group relative p-[1.5px] rounded-xl overflow-hidden cursor-pointer">
        {/* Animated Mist Border (Conic gradient) */}
        <div className="misty-border-glow absolute inset-0 rounded-xl" />
        
        {/* Inner Card representing ShadCN alert/toast */}
        <div className="relative bg-[hsl(240,10%,3.9%)] border border-white/5 text-white px-5 py-4 rounded-xl flex items-center gap-3 backdrop-blur-xl shadow-lg z-10 transition-colors hover:bg-[hsl(240,5%,10%)]">
          <div className="flex-1">
            <p className="text-sm font-medium tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
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
        .animate-in {
          animation: slide-up 0.3s ease-out forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
