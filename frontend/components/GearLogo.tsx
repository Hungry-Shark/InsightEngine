'use client';

import React from 'react';
import Link from 'next/link';

export default function GearLogo() {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <div className="gear-logo-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', cursor: 'pointer' }}>
        <div style={{ position: 'relative', display: 'fit', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', width: '105px', height: '105px' }}>
          {/* User's video logo */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            src="/logo.mp4"
          />
        </div>
        <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'var(--font-saro), sans-serif', letterSpacing: '0.05em', lineHeight: '1' }}>
          INSIGHT ENGINE
        </span>
        <style>{`
          .gear-logo-container {
             margin-bottom: 0px; 
          }
        `}</style>
      </div>
    </Link>
  );
}
