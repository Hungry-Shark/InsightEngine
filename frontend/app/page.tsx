'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Download, Plus, Mic, X, Send, Image as ImageIcon, Users } from 'lucide-react';
import { api, ResearchResult, Profile } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import BorderGlow from '@/components/BorderGlow';
import CollaborationModal from '@/components/CollaborationModal';
import CollaborationChat, { ChatMessage } from '@/components/CollaborationChat';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Collaboration state
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
    const fetchProfileData = async () => {
      try {
        const s = await api.getSettings(user?.uid);
        setSettings(s);
        const p = await api.getProfile(user?.uid);
        setProfile(p);
      } catch (err) {
        console.error('Failed to fetch user data', err);
      }
    };
    if (!authLoading && user) {
      fetchProfileData();
    } else if (!authLoading && !user) {
      // Clear settings/profile if user signed out
      setSettings(null);
      setProfile(null);
      setError('');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
    const handlePrompt = (e: Event) => {
      setSavePromptId((e as CustomEvent).detail.id);
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
      console.warn("Session storage sync failed");
    }
  }, []);

  const connectToRoom = useCallback((token: string) => {
    if (wsRef.current) wsRef.current.close();
    
    const url = api.getWsChatUrl(token);
    const socket = new WebSocket(url);
    
    socket.onopen = () => {
      console.log("Connected to room:", token);
      setRoomToken(token);
      setShowChat(true);
      socket.send(JSON.stringify({
        type: "info",
        text: `${profile?.name || 'Someone'} joined the room.`
      }));
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat" || data.type === "info") {
        setChatMessages(prev => [...prev, data]);
      }
    };
    
    socket.onclose = () => {
      console.log("Disconnected from room");
      setRoomToken(null);
    };
    
    wsRef.current = socket;
  }, [profile]);

  const handleJoinByToken = async (token: string) => {
    try {
      setLoading(true);
      const host = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await (fetch(`${host}/api/collaboration/join/${token}`).then(r => r.json()));
      
      if (res.ok) {
        if (res.research) {
          setThread([res.research]);
        }
        connectToRoom(token);
        setShowCollabModal(false);
        setError('');
      } else {
        setError("Invalid Room ID or research not found.");
      }
    } catch (err) {
      setError("Failed to join room.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        user: profile?.name || "User",
        text: text,
        picture: profile?.picture,
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }
  };

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

    const handleToggleCollab = () => {
      setShowCollabModal(true);
    };

    window.addEventListener('loadReport', handleLoadReport);
    window.addEventListener('newChat', handleNewChat);
    window.addEventListener('tempChat', handleTempChat);
    window.addEventListener('toggleCollaboration', handleToggleCollab);
    return () => {
      window.removeEventListener('loadReport', handleLoadReport);
      window.removeEventListener('newChat', handleNewChat);
      window.removeEventListener('tempChat', handleTempChat);
      window.removeEventListener('toggleCollaboration', handleToggleCollab);
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
        settings?.model || 'gemini-2.5-flash',
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
      // Simple MD to HTML conversion
      let html = md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #7c3aed; text-decoration: none;">$1</a>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>');

      html = `<p>${html}</p>`;
      // Wrap list items in <ul>
      html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');

      const container = document.createElement('div');
      container.innerHTML = `
          <div style="margin-bottom: 40px; border-bottom: 2px solid #7c3aed; padding-bottom: 24px;">
            <p style="font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px 0;">Intelligence Briefing</p>
            <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.25; border: none; padding-left: 0; letter-spacing: -0.02em;">
              Research Analysis: ${result.topic}
            </h1>
            <p style="font-size: 14px; color: #475569; margin-top: 16px; line-height: 1.6;">
              This report provides a multi-dimensional synthesis of data and professional insights regarding the inquiry: 
              <span style="color: #0f172a; font-weight: 600;">"${result.topic}"</span>.
            </p>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 12px; font-family: monospace;">
              ISSUED BY INSIGHTENGINE • ${result.ts || new Date().toLocaleDateString()} • REf: #IE-${Date.now().toString().slice(-6)}
            </div>
          </div>

          <div style="font-size: 15px; color: #334155;">
            <style>
              h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 40px 0 20px; border-left: 4px solid #7c3aed; padding-left: 15px; letter-spacing: -0.01em; page-break-after: avoid; }
              h2 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 30px 0 15px; page-break-after: avoid; }
              h3 { font-size: 17px; font-weight: 600; color: #334155; margin: 25px 0 10px; page-break-after: avoid; }
              p { margin: 0 0 18px; line-height: 1.7; text-align: left; word-break: break-word; }
              strong { color: #0f172a; font-weight: 700; }
              ul { padding-left: 20px; margin: 20px 0 25px; list-style-type: disc; }
              li { margin: 10px 0; padding-left: 5px; }
              ul li::marker { color: #7c3aed; font-size: 1.2em; }
              blockquote { border-left: 3px solid #e2e8f0; padding-left: 20px; font-style: italic; color: #64748b; margin: 25px 0; }
              .page-break { page-break-before: always; }
            </style>
            ${html}
          </div>

          <div style="margin-top: 80px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 1px; text-transform: uppercase;">
              Generated by InsightEngine AI • Deep Research Systems
            </p>
          </div>
        </div>
      `;

      const options = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${result.topic.slice(0, 30).replace(/\s+/g, '_')}_report.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
      };

      html2pdf().from(container).set(options).save().then(() => {
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

  const showHero = thread.length === 0 && !loading;

  return (
    <div className="page-inner">
      {!authLoading && !user && (
        <div className="landing-modal-overlay">
          <div className="landing-modal-window">
            {/* Background Video */}
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="landing-video-bg"
            >
              <source src="/signup.mp4" type="video/mp4" />
            </video>

            {/* Content Overlay */}
            <div className="landing-content-overlay">
              <div className="landing-left-info">
                {/* Branding/Stats baked into video */}
              </div>

              <div className="landing-right-info">
                {/* Branding/Stats baked into video */}
              </div>
            </div>

            {/* Auth Card */}
            <div className="auth-card-landing-fixed">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '6px', color: '#fff' }}>Get Started</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Join the future of deep research.</p>
              </div>

              <button 
                className="btn-frosted-join" 
                style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}
                onClick={() => {
                  const authBtn = document.querySelector('.auth-btn-signin') as HTMLElement;
                  if (authBtn) authBtn.click();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".2"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".2"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity=".2"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".2"/>
                </svg>
                Continue with Google
              </button>
              
              <div className="auth-divider">OR</div>
              
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="research-input" 
                  style={{ width: '100%', minHeight: '48px', padding: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: '0.95rem', background: '#fff', color: '#000', border: 'none', fontWeight: '600' }}
                onClick={() => {
                   const authBtn = document.querySelector('.auth-btn-signin') as HTMLElement;
                   if (authBtn) authBtn.click();
                }}
              >
                Continue with email
              </button>
            </div>
          </div>
        </div>
      )}
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
              {['Researching', 'Validating', 'Writing'].map((p, i) => (
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

      <CollaborationModal 
        open={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        profile={profile || { name: 'User', email: '', bio: '', token: '' }}
        onJoin={handleJoinByToken}
        onCopyToken={() => {
          if (profile?.token) {
            navigator.clipboard.writeText(profile.token);
          }
        }}
      />

      {showChat && (
        <CollaborationChat 
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onClose={() => setShowChat(false)}
          currentUser={{ name: profile?.name || 'User', picture: profile?.picture }}
          roomName={roomToken || 'Research'}
        />
      )}
    </div>
  );
}
