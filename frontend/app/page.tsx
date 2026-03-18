'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Download } from 'lucide-react';
import { api, ResearchResult } from '@/lib/api';
import BorderGlow from '@/components/BorderGlow';

const SUGGESTIONS = [
  'AI trends in 2026',
  'Future of quantum computing',
  'Latest in renewable energy',
  'Breakthroughs in biotech',
];

export default function ChatPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thread, setThread] = useState<ResearchResult[]>([]);
  const [phase, setPhase] = useState(0); // 0=idle, 1=researching, 2=validating, 3=writing

  // Load a preloaded report from sessionStorage
  const loadFromSession = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('preloaded_report');
      if (stored) {
        const item = JSON.parse(stored);
        setThread([{
          report: item.report,
          raw_data: item.raw_data || '',
          topic: item.topic,
          ts: item.ts || '',
        }]);
        setTopic('');
        setError('');
        sessionStorage.removeItem('preloaded_report');
      }
    } catch {
      // ignore
    }
  }, []);

  // Pick up preloaded report on initial mount
  useEffect(() => {
    loadFromSession();
  }, [loadFromSession]);

  // Listen for custom events from Sidebar / History
  useEffect(() => {
    const handleLoadReport = () => {
      loadFromSession();
    };

    const handleNewChat = () => {
      setThread([]);
      setTopic('');
      setError('');
      setLoading(false);
    };

    window.addEventListener('loadReport', handleLoadReport);
    window.addEventListener('newChat', handleNewChat);
    return () => {
      window.removeEventListener('loadReport', handleLoadReport);
      window.removeEventListener('newChat', handleNewChat);
    };
  }, [loadFromSession]);

  // Simulate phase progression during loading
  useEffect(() => {
    if (!loading) {
      setPhase(0);
      return;
    }
    setPhase(1);
    window.dispatchEvent(new CustomEvent('statusChange', { detail: 'yellow' }));
    const t1 = setTimeout(() => { setPhase(2); window.dispatchEvent(new CustomEvent('statusChange', { detail: 'yellow' })); }, 8000);
    const t2 = setTimeout(() => { setPhase(3); window.dispatchEvent(new CustomEvent('statusChange', { detail: 'green' })); }, 18000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.research(topic.trim());
      // Append to thread instead of replacing
      setThread((prev) => [...prev, data]);
      setTopic('');
      window.dispatchEvent(new CustomEvent('statusChange', { detail: 'green' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      window.dispatchEvent(new CustomEvent('statusChange', { detail: 'red' }));
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf(result: ResearchResult) {
    import('html2pdf.js').then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default;

      const md = result.report;
      let html = md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>');
      html = `<p>${html}</p>`;
      html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');

      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a2e; padding: 48px 56px; max-width: 800px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%); border-radius: 16px; padding: 40px 48px; margin-bottom: 40px; text-align: center;">
            <h1 style="font-size: 28px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0;">InsightEngine</h1>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">Research Report</p>
            <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #7c3aed, #a78bfa); margin: 0 auto 20px;"></div>
            <h2 style="font-size: 20px; font-weight: 600; color: #e2e8f0; margin: 0;">${result.topic}</h2>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 12px 0 0 0;">${result.ts || new Date().toLocaleDateString()}</p>
          </div>
          <div style="font-size: 14px; line-height: 1.8; color: #334155;">
            <style>
              h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 32px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
              h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 28px 0 10px; }
              h3 { font-size: 15px; font-weight: 600; color: #334155; margin: 24px 0 8px; }
              p { margin: 0 0 12px; }
              strong { color: #0f172a; }
              ul { padding-left: 20px; margin: 8px 0 16px; }
              li { margin: 4px 0; }
            </style>
            ${html}
          </div>
          <div style="margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Generated by InsightEngine — AI-Powered Deep Research</p>
          </div>
        </div>
      `;

      html2pdf().set({
        margin: 0,
        filename: `${result.topic.slice(0, 30).replace(/\s+/g, '_')}_report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save();
    });
  }

  function useSuggestion(s: string) {
    setTopic(s);
  }

  const phases = ['Researching', 'Validating', 'Writing'];
  const showHero = thread.length === 0 && !loading;

  return (
    <div className="page-inner">
      {/* Hero — only when no conversation exists */}
      {showHero && (
        <div className="hero">
          <h1 className="hero-title">What would you like to research?</h1>
          <p className="hero-sub">
            AI-powered deep research &amp; report generation
          </p>

          {/* Suggestion chips */}
          <div className="suggestion-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => useSuggestion(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Thread — display all past results */}
      {thread.map((result, idx) => (
        <div key={idx} style={{ marginBottom: '32px' }}>
          {/* Topic header for each result */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px',
            paddingLeft: '4px'
          }}>
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--accent-text)', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Research #{idx + 1}
            </span>
            <span style={{ 
              fontSize: '13px', 
              color: 'var(--text-secondary)' 
            }}>
              — {result.topic}
            </span>
          </div>

          {/* Raw data */}
          <div className="glass-card">
            <p className="card-title" style={{ marginBottom: 14 }}>
              Raw Research Data
            </p>
            <table className="raw-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Output Preview</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    Lead Researcher
                  </td>
                  <td>
                    {result.raw_data.slice(0, 300)}
                    {result.raw_data.length > 300 ? '…' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Report */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <p className="card-title" style={{ margin: 0 }}>Research Report</p>
              <span className="badge badge-green">✓ Research Complete</span>
              <span className="badge badge-accent">✓ AI Verified</span>
            </div>
            <div className="report-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.report}
              </ReactMarkdown>
            </div>

            <div className="action-row">
              <button className="btn-secondary" onClick={() => downloadPdf(result)}>
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Research Form — always visible at the bottom */}
      <BorderGlow className="mb-6">
        <div className="glass-card" style={{ padding: '32px', marginBottom: 0 }}>
          <form className="research-form" onSubmit={handleSubmit}>
            <textarea
              className="research-input"
              placeholder={thread.length > 0 
                ? "Ask a follow-up question or research a new topic..." 
                : "Describe your research topic, question, or key themes in detail..."}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={4}
              disabled={loading}
              style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderColor: 'rgba(255,255,255,0.05)',
                borderRadius: '12px'
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !topic.trim()}
            >
              <Sparkles size={16} />
              {loading ? 'Researching…' : thread.length > 0 ? 'Continue Research' : 'Generate Report'}
            </button>
          </form>
        </div>
      </BorderGlow>

      {/* Error */}
      {error && <div className="alert alert-error">⚠ {error}</div>}

      {/* Loader */}
      {loading && (
        <div className="glass-card">
          <div className="spinner-wrap">
            <div className="spinner-orbital" />
            <p className="spinner-text">
              InsightEngine is working on your research…
            </p>
            <div className="progress-steps">
              {phases.map((p, i) => (
                <span key={p} style={{ display: 'contents' }}>
                  {i > 0 && <span className="progress-connector" />}
                  <span
                    className={`progress-step ${
                      phase > i + 1 ? 'done' : phase === i + 1 ? 'active' : ''
                    }`}
                  >
                    <span className="progress-dot" />
                    {p}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
