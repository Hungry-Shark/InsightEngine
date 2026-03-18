'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { api, Profile } from '@/lib/api';

export default function ProfilePage() {
  const [form, setForm] = useState<Profile>({ name: 'User', email: '', bio: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [apiStatus, setApiStatus] = useState({ google_api: false, tavily_api: false });
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    api.getProfile().then((d) => setForm(d)).catch(() => {});
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

  const initials = form.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page-inner">
      <h1 className="section-header">Profile</h1>
      <p className="section-sub">
        Manage your personal info and view API key status
      </p>

      {status && (
        <div className={`alert alert-${status.type}`}>{status.msg}</div>
      )}

      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="avatar-large">
          <div className="avatar-large-circle">{initials}</div>
        </div>
        <p style={{ fontSize: 18, fontWeight: 600 }}>{form.name}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {form.email || 'No email set'}
        </p>
      </div>

      {/* Personal Info */}
      <div className="glass-card">
        <p className="card-title">Personal Info</p>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Short Bio</label>
            <textarea
              className="form-textarea"
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
            Save Profile
          </button>
        </form>
      </div>

      {/* API Key Status */}
      <div className="glass-card">
        <p className="card-title">API Key Status</p>
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
          Keys are loaded from your{' '}
          <code
            style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            .env
          </code>{' '}
          file.
        </p>
      </div>

      {/* Session Stats */}
      <div className="glass-card">
        <p className="card-title">Session Stats</p>
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
  );
}
