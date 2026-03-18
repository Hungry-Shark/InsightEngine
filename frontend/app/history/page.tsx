'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { api, HistoryEntry } from '@/lib/api';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const router = useRouter();

  async function load() {
    try {
      const data = await api.getHistory();
      setHistory([...data.history].reverse());
    } catch {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(reversedIndex: number) {
    const realIndex = history.length - 1 - reversedIndex;
    try {
      await api.deleteHistory(realIndex);
      setHistory((h) => h.filter((_, i) => i !== reversedIndex));
    } catch {
      setError('Failed to delete entry.');
    }
  }

  async function doClearAll() {
    setShowClearConfirm(false);
    try {
      await api.clearHistory();
      setHistory([]);
    } catch {
      setError('Failed to clear history.');
    }
  }

  function downloadMd(item: HistoryEntry) {
    const blob = new Blob([item.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.topic.slice(0, 30).replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openReport(item: HistoryEntry) {
    sessionStorage.setItem('preloaded_report', JSON.stringify(item));
    router.push('/');
    window.dispatchEvent(new CustomEvent('loadReport'));
  }

  return (
    <div className="page-inner">
      <h1 className="section-header">History</h1>
      <p className="section-sub">All your past research sessions</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="spinner-wrap">
          <div className="spinner-orbital" />
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-text">
              No history yet — start a new research session.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {history.length} session{history.length !== 1 ? 's' : ''}
            </p>
            <button className="btn-danger" onClick={() => setShowClearConfirm(true)}>
              <Trash2 size={13} />
              Clear All
            </button>
          </div>

          {history.map((item, i) => (
            <div key={i} className="history-card">
              <div
                className="history-card-header"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className="history-topic">{item.topic}</span>
                <span className="history-ts">{item.ts}</span>
                {expanded === i ? (
                  <ChevronUp
                    size={14}
                    style={{ marginLeft: 10, opacity: 0.4, flexShrink: 0 }}
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    style={{ marginLeft: 10, opacity: 0.4, flexShrink: 0 }}
                  />
                )}
              </div>

              {expanded === i && (
                <div className="history-card-body">
                  <p className="history-snippet">
                    {item.report.slice(0, 500)}
                    {item.report.length > 500 ? '…' : ''}
                  </p>
                  <div className="history-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openReport(item)}
                    >
                      <ExternalLink size={13} />
                      Open
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => downloadMd(item)}
                    >
                      <FileText size={13} />
                      Download
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => remove(i)}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <ConfirmModal
        open={showClearConfirm}
        title="Clear All History"
        message="This will permanently remove all research history. This action cannot be undone."
        confirmLabel="Clear All"
        danger
        onConfirm={doClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
