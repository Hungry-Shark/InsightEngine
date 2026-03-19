'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Download, Plus, Mic, X, Send, Image as ImageIcon } from 'lucide-react';
import { api, ResearchResult } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  const [isTemporary, setIsTemporary] = useState(false);
  const [savePromptId, setSavePromptId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<{ model: string; verbose: boolean; theme: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await api.getSettings(user?.uid);
        setSettings(s);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    if (!authLoading) {
      fetchSettings();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
             setTopic(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalTranscript);
          }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAttachedFile(e.target.files[0]);
  };

  useEffect(() => {
    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [topic]);

  useEffect(() => {
    if (isTemporary && thread.length > 0) {
      sessionStorage.setItem('has_unsaved_temp', 'true');
    } else {
      sessionStorage.setItem('has_unsaved_temp', 'false');
    }
  }, [isTemporary, thread]);

  useEffect(() => {
    const handlePrompt = (e: any) => {
      setSavePromptId(e.detail.id);
    };
    window.addEventListener('promptSave', handlePrompt);
    return () => window.removeEventListener('promptSave', handlePrompt);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTemporary && thread.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Native browser tab-close prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTemporary, thread]);

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
          provider: item.provider || 'unknown',
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
      setIsTemporary(false);
    };

    const handleTempChat = () => {
      setThread([]);
      setTopic('');
      setError('');
      setLoading(false);
      setIsTemporary(true);
    };

    window.addEventListener('loadReport', handleLoadReport);
    window.addEventListener('newChat', handleNewChat);
    window.addEventListener('tempChat', handleTempChat);
    return () => {
      window.removeEventListener('loadReport', handleLoadReport);
      window.removeEventListener('newChat', handleNewChat);
      window.removeEventListener('tempChat', handleTempChat);
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
    if (e.preventDefault) e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    
    abortControllerRef.current = new AbortController();

    try {
      const data = await api.research(
        topic.trim(), 
        user?.uid, 
        isTemporary, 
        settings?.model || 'gemini-1.5-flash',
        abortControllerRef.current.signal
      );
      // Append to thread instead of replacing
      setThread((prev) => [...prev, data]);
      setTopic('');
      window.dispatchEvent(new CustomEvent('historyUpdated'));
      window.dispatchEvent(new CustomEvent('statusChange', { detail: 'green' }));
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        window.dispatchEvent(new CustomEvent('statusChange', { detail: 'yellow' }));
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
      window.dispatchEvent(new CustomEvent('statusChange', { detail: 'red' }));
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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
      }).from(container).save().then(() => {
        api.addToMyStuff({
          id: Date.now().toString(),
          type: 'pdf',
          title: `${result.topic.slice(0, 30)} Report`,
          source_topic: result.topic,
          content: result.report,
          ts: new Date().toISOString()
        }, user?.uid).catch(console.error);
      });
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
            <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
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
          </div>

          {/* Report */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <p className="card-title" style={{ margin: 0 }}>Research Report</p>
              <span className="badge badge-green">✓ Research Complete</span>
              <span className="badge badge-accent">✓ AI Verified ({result.provider})</span>
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

      {/* Research Form — Gemini Style Input */}
      <div style={{ position: 'sticky', bottom: '32px', zIndex: 10, marginTop: 'auto', paddingTop: '24px' }}>
        <style>{`
          .gemini-input-wrapper {
            background: rgba(30, 31, 32, 0.85);
            backdrop-filter: blur(24px);
            border-radius: 32px;
            border: 1px solid rgba(255,255,255,0.08);
            padding: 12px 16px 12px 24px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            transition: border-color 0.2s ease;
          }
          .gemini-input-wrapper:focus-within {
            border-color: rgba(255,255,255,0.2);
          }
          .icon-btn-hover:hover {
            background: rgba(255,255,255,0.08) !important;
          }
          .send-btn-active:hover {
            opacity: 0.9;
            transform: scale(1.02);
          }
        `}</style>
        <form className="gemini-input-wrapper" onSubmit={handleSubmit}>
          {attachedFile && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '16px', width: 'fit-content', marginBottom: '8px', gap: '8px' }}>
              <ImageIcon size={14} color="#a78bfa" />
              <span style={{ fontSize: '13px', color: '#e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
              <button type="button" onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          )}

          <textarea
            id="chat-input"
            className="research-input custom-scrollbar"
            placeholder={thread.length > 0 ? "Ask a follow-up question..." : "Ask InsightEngine..."}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (topic.trim() && !loading) handleSubmit(e as any);
              }
            }}
            rows={1}
            disabled={loading}
            style={{ 
              background: 'transparent', 
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '16px',
              resize: 'none',
              width: '100%',
              padding: '0',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              minHeight: '24px',
              maxHeight: '150px'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ 
                cursor: 'pointer', 
                padding: '8px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'background 0.2s',
              }} className="icon-btn-hover">
                <Plus size={20} color="#e2e8f0" />
                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={toggleListen}
                style={{ 
                  cursor: 'pointer', 
                  padding: '8px', 
                  borderRadius: '50%', 
                  background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: 'none',
                  transition: 'background 0.2s'
                }}
                className={isListening ? "" : "icon-btn-hover"}
              >
                <Mic size={20} color={isListening ? "#ef4444" : "#e2e8f0"} />
              </button>

              {loading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '10px', 
                    borderRadius: '50%', 
                    background: 'transparent', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.2s',
                    width: '36px',
                    height: '36px'
                  }}
                  className="icon-btn-hover"
                  title="Stop generating"
                >
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!topic.trim()}
                  style={{ 
                    cursor: (!topic.trim()) ? 'not-allowed' : 'pointer', 
                    padding: (!topic.trim()) ? '8px' : '10px', 
                    borderRadius: '50%', 
                    background: (!topic.trim()) ? 'transparent' : 'white', 
                    color: (!topic.trim()) ? 'rgba(255,255,255,0.3)' : 'black',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: 'none',
                    transition: 'all 0.2s'
                  }}
                  className={(!topic.trim()) ? "" : "send-btn-active"}
                >
                  <Send size={18} style={{ transform: 'translateX(-1px)' }} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginTop: '24px', marginBottom: '24px' }}>⚠ {error}</div>}

      {/* Loader */}
      {loading && (
        <div className="glass-card" style={{ marginTop: '24px', marginBottom: '32px', animation: 'cardFadeIn 0.4s ease' }}>
          <div className="spinner-wrap" style={{ padding: '32px 0' }}>
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

      {/* Custom Save Prompt Modal for Temporary Chats */}
      {savePromptId && (
        <div className="confirm-overlay" onClick={() => {
            window.dispatchEvent(new CustomEvent('navResolved', { detail: { id: savePromptId, proceed: false } }));
            setSavePromptId(null);
        }}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-title">Unsaved Temporary Chat</p>
            <p className="confirm-message">You have a temporary chat that will be lost. Would you like to save it?</p>
            <div className="confirm-actions" style={{ flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn-primary" 
                onClick={async () => {
                  try {
                    for (const t of thread) { 
                      await api.saveHistory({ ...t, ts: new Date().toISOString() }, user?.uid); 
                    }
                    setIsTemporary(false);
                    sessionStorage.setItem('has_unsaved_temp', 'false');
                    window.dispatchEvent(new CustomEvent('navResolved', { detail: { id: savePromptId, proceed: true } }));
                    setSavePromptId(null);
                  } catch (e) {
                    console.error('Failed to save', e);
                  }
                }}
              >
                Save & Continue
              </button>
              <button 
                className="btn-danger" 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navResolved', { detail: { id: savePromptId, proceed: true } }));
                  setSavePromptId(null);
                }}
              >
                Discard
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navResolved', { detail: { id: savePromptId, proceed: false } }));
                  setSavePromptId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
