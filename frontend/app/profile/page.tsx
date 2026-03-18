'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { api, Profile } from '@/lib/api';
import ReflectiveCard from '@/components/ReflectiveCard';

export default function ProfilePage() {
  const [form, setForm] = useState<Profile>({ name: 'Alexander Doe', email: '', bio: 'Senior Developer' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [apiStatus, setApiStatus] = useState({ google_api: false, tavily_api: false });
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    api.getProfile().then((d) => {
      // Pre-fill defaults if completely empty
      setForm({
        name: d.name || 'Alexander Doe',
        email: d.email || '',
        bio: d.bio || 'Senior Developer'
      });
    }).catch(() => {});
    api.status().then((d) => setApiStatus(d)).catch(() => {});
    api.getHistory().then((d) => setReportCount(d.history.length)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateProfile(form);
      setStatus({ type: 'success', msg: 'Profile saved successfully.' });
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Save failed.' });
    }
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <div className="page-inner">
      <h1 className="section-header">Profile</h1>
      <p className="section-sub">
        Secure Access Portal
      </p>

      {status && (
        <div className={`alert alert-${status.type}`}>{status.msg}</div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Side: Reflective Card */}
        <div style={{ flexShrink: 0, width: '100%', maxWidth: '400px' }}>
          <ReflectiveCard
            imageSrc="https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=800&auto=format&fit=crop"
            userName={form.name.toUpperCase()}
            userRole={form.bio ? form.bio.toUpperCase() : 'USER'}
            overlayColor="rgba(0, 0, 0, 0)"
            blurStrength={1.5}
            glassDistortion={30}
            metalness={0.9}
            roughness={0.75}
            displacementStrength={20}
            noiseScale={1}
            specularConstant={5}
            grayscale={0.4}
            color="#ffffff"
          />
        </div>

        {/* Right Side: Profile Info & Status */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Personal Info */}
          <div className="glass-card">
            <p className="card-title">Clearance Details</p>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Context</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Title / Role</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                <Save size={14} />
                Update Clearance
              </button>
            </form>
          </div>

          {/* API Key Status */}
          <div className="glass-card">
            <p className="card-title">Backend Link Status</p>
            <div className="api-status-row">
              <span
                className={`api-dot ${apiStatus.google_api ? 'connected' : 'disconnected'}`}
              />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Google Gemini
              </span>
              <span
                className={`badge ${apiStatus.google_api ? 'badge-green' : 'badge-red'}`}
                style={{ marginLeft: 'auto' }}
              >
                {apiStatus.google_api ? 'Connected' : 'Missing'}
              </span>
            </div>
            <div className="api-status-row">
              <span
                className={`api-dot ${apiStatus.tavily_api ? 'connected' : 'disconnected'}`}
              />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Tavily Search
              </span>
              <span
                className={`badge ${apiStatus.tavily_api ? 'badge-green' : 'badge-red'}`}
                style={{ marginLeft: 'auto' }}
              >
                {apiStatus.tavily_api ? 'Connected' : 'Missing'}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 12,
              }}
            >
              Linkage managed externally via process environment.
            </p>
          </div>

          {/* Session Stats */}
          <div className="glass-card">
            <p className="card-title">Session Telemetry</p>
            <div className="stats-row">
              <div className="stat-tile">
                <div className="stat-value">{reportCount}</div>
                <div className="stat-label">Reports Generated</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  Active
                </div>
                <div className="stat-label">Session Status</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
