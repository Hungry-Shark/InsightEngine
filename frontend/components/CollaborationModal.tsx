"use client";

import { useState } from "react";
import { Copy, Users, LogIn, X } from "lucide-react";
import { Profile } from "@/lib/api";

interface CollaborationModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onJoin: (token: string) => void;
  onCopyToken: () => void;
}

export default function CollaborationModal({ open, onClose, profile, onJoin, onCopyToken }: CollaborationModalProps) {
  const [joinToken, setJoinToken] = useState("");

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-icon-wrap" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Users size={18} className="text-secondary" />
            </div>
            <h2 className="modal-title">Collaboration</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ opacity: 0.7, fontSize: '0.85rem' }}>Your Research Room ID</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
              <code style={{ 
                background: 'rgba(0,0,0,0.4)', 
                padding: '14px', 
                borderRadius: '12px', 
                letterSpacing: '2px',
                fontSize: '1.2rem',
                color: 'white',
                flex: 1,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {profile.token || '...'}
              </code>
              <button 
                className="btn-secondary" 
                onClick={onCopyToken}
                style={{ padding: '14px', borderRadius: '12px' }}
                title="Copy Room ID"
              >
                <Copy size={18} />
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '10px', textAlign: 'center' }}>
              Others can join your active session using this 12-digit ID.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <label className="form-label" style={{ opacity: 0.7, fontSize: '0.85rem' }}>Join a Shared Session</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter 12-digit Room ID"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value.replace(/\D/g, '').slice(0, 12))}
                style={{ 
                  letterSpacing: joinToken ? '2px' : 'normal', 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px'
                }}
              />
              <button 
                className="btn-frosted-join" 
                onClick={() => onJoin(joinToken)}
                disabled={joinToken.length < 12}
              >
                <LogIn size={16} />
                Join
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease-out;
        }
        .modal-content {
          width: 95%;
          padding: 0;
          overflow: visible; /* High for glint */
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
        }
        .modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          transition: all 0.2s;
        }
        .modal-close:hover {
          color: white;
        }
        .modal-body {
          padding: 24px 32px 32px;
        }
        .form-input:focus {
          border-color: rgba(255,255,255,0.2) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
          outline: none;
        }
        .btn-frosted-join {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 12px;
          padding: 0 24px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
        }
        .btn-frosted-join:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .btn-frosted-join:active:not(:disabled) {
          transform: scale(0.98);
        }
        .btn-frosted-join:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        /* Radial Glint Effect */
        .btn-frosted-join::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .btn-frosted-join:hover::after {
          opacity: 1;
          animation: glintMove 2s infinite linear;
        }
        @keyframes glintMove {
          from { transform: translate(-20%, -20%); }
          to { transform: translate(20%, 20%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
