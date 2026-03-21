'use client';

import { useState, useEffect, useId } from 'react';
import {
  Save,
  RotateCcw,
  Trash2,
  Cpu,
  Palette,
  ShieldAlert,
} from 'lucide-react';
import { api, Settings, Profile } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import ConfirmModal from '@/components/ConfirmModal';

const MODELS = [
  'gemini-1.5-flash',
  'groq',
  'kaggle-qwen',
];

export default function SettingsPage() {
  const toggleId = useId();
  const [form, setForm] = useState<Settings>({
    model: 'gemini-1.5-flash',
    verbose: false,
    theme: 'Royal Purple',
  });
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'clearHistory' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        api.getSettings(u.uid).then((d) => setForm(d)).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  function flash(type: 'success' | 'error', msg: string) {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateSettings(form, user?.uid);
      flash('success', 'Settings saved successfully.');
    } catch (err: unknown) {
      flash('error', err instanceof Error ? err.message : 'Save failed.');
    }
  }

  async function doReset() {
    setConfirmAction(null);
    try {
      await api.resetSettings(user?.uid);
      const defaults = await api.getSettings(user?.uid);
      setForm(defaults);
      flash('success', 'Settings reset to defaults.');
    } catch {
      flash('error', 'Reset failed.');
    }
  }

  async function doClearHistory() {
    setConfirmAction(null);
    try {
      await api.clearHistory(user?.uid);
      flash('success', 'Chat history cleared.');
    } catch {
      flash('error', 'Clear failed.');
    }
  }

  return (
    <div className="page-inner">
      <h1 className="section-header">Settings</h1>
      <p className="section-sub">
        Configure model and data management
      </p>

      {status && (
        <div className={`alert alert-${status.type}`}>{status.msg}</div>
      )}

      <form onSubmit={save}>


        {/* Model Configuration */}
        <div className="glass-card">
          <div className="settings-section-icon">
            <div className="settings-icon-wrap purple">
              <Cpu size={16} />
            </div>
            <p className="card-title">Model Configuration</p>
          </div>
          <div className="form-group">
            <label className="form-label">LLM Model</label>
            <select
              className="form-select"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="toggle-row">
            <span className="toggle-label">
              Enable verbose agent logging
            </span>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <input
                id={toggleId}
                type="checkbox"
                className="toggle-input"
                checked={form.verbose}
                onChange={(e) =>
                  setForm({ ...form, verbose: e.target.checked })
                }
              />
              <span className="toggle-switch" />
            </label>
          </div>
        </div>

        {/* Kaggle AI Support */}
        <div className="glass-card">
          <div className="settings-section-icon">
            <div className="settings-icon-wrap blue">
              <Cpu size={16} />
            </div>
            <p className="card-title">Kaggle AI Support (Qwen2-VL)</p>
          </div>
          <p className="section-sub" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Run the Qwen2-VL model on Kaggle for free. Double check your KAGGLE_USERNAME and KAGGLE_KEY in the backend .env.
          </p>
          
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  const res = await api.wakeupKaggle();
                  flash('success', res.message);
                } catch (err: any) {
                  flash('error', err.message);
                }
              }}
            >
              <RotateCcw size={14} />
              Wake Up Kaggle Model
            </button>
            
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  const res = await api.kaggleStatus();
                  if (res.configured) {
                    flash('success', `Kaggle Status: ${res.status || 'Active'}`);
                  } else {
                    flash('error', 'Kaggle is not configured in .env');
                  }
                } catch (err: any) {
                  flash('error', 'Failed to check status');
                }
              }}
            >
              Check Status
            </button>
          </div>
        </div>

        {/* Save / Reset */}
        <div
          className="action-row"
          style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}
        >
          <button type="submit" className="btn-primary">
            <Save size={14} />
            Save Settings
          </button>
          <button type="button" className="btn-secondary" onClick={() => setConfirmAction('reset')}>
            <RotateCcw size={14} />
            Reset Defaults
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="glass-card danger-zone" style={{ marginTop: 24 }}>
        <div className="settings-section-icon">
          <div className="settings-icon-wrap red">
            <ShieldAlert size={16} />
          </div>
          <p className="card-title">Danger Zone</p>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Permanently remove all chat history from the current session. This
          action cannot be undone.
        </p>
        <button className="btn-danger" onClick={() => setConfirmAction('clearHistory')}>
          <Trash2 size={13} />
          Clear All Chat History
        </button>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        open={confirmAction === 'reset'}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to their default values?"
        confirmLabel="Reset"
        onConfirm={doReset}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction === 'clearHistory'}
        title="Clear All History"
        message="This will permanently remove all chat history from the current session. This action cannot be undone."
        confirmLabel="Clear All"
        danger
        onConfirm={doClearHistory}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
