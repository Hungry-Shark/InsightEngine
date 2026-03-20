'use client';

import { useState, useEffect } from 'react';
import { Trash2, FileText, Search, Download } from 'lucide-react';
import { api, MyStuffItem } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function MyStuffPage() {
  const [items, setItems] = useState<MyStuffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);

  async function load(uid?: string | null) {
    try {
      const data = await api.getMyStuff(uid);
      setItems(data.items || []);
    } catch {
      setError('Failed to load items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      load(u?.uid);
    });
    return () => unsubscribe();
  }, []);

  async function remove(id: string) {
    try {
      await api.deleteMyStuff(id, user?.uid);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError('Failed to delete item.');
    }
  }

  function downloadPdf(item: MyStuffItem) {
    import('html2pdf.js').then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default;
      const md = item.content;
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
      html = `<p>${html}</p>`.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');

      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a2e; padding: 48px 56px; max-width: 800px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%); border-radius: 16px; padding: 40px 48px; margin-bottom: 40px; text-align: center;">
            <h1 style="font-size: 28px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0;">InsightEngine</h1>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">Research Report</p>
            <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #7c3aed, #a78bfa); margin: 0 auto 20px;"></div>
            <h2 style="font-size: 20px; font-weight: 600; color: #e2e8f0; margin: 0;">${item.source_topic}</h2>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 12px 0 0 0;">${item.ts.slice(0, 10)}</p>
          </div>
          <div style="font-size: 14px; line-height: 1.8; color: #334155;">
            <style>
              h1 { font-size: 22px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }
              h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 28px; }
              h3 { font-size: 15px; font-weight: 600; color: #334155; margin-top: 24px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 4px; }
            </style>
            ${html}
          </div>
        </div>
      `;

      html2pdf().set({
        margin: 0,
        filename: `${item.title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save();
    });
  }

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.source_topic.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-inner">
      <h1 className="section-header">My Stuff</h1>
      <p className="section-sub">Your exported reports, PDFs, and generated assets</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="spinner-wrap">
          <div className="spinner-orbital" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
            <p className="empty-text">
              No files yet &mdash; click &quot;Download PDF&quot; on a research report to save it here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="search-bar-container" style={{ position: 'relative', margin: '8px 0 24px 0' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search your files by title or topic..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="history-search-input"
              style={{ paddingLeft: '48px', height: '52px', fontSize: '15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(124,58,237,0.2)', padding: '10px', borderRadius: '10px', color: '#a78bfa' }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.title}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(item.ts).toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                  <strong style={{ color: '#a78bfa', display: 'block', marginBottom: '4px' }}>Source Citation:</strong>
                  <span style={{ fontStyle: 'italic', lineHeight: 1.5, display: 'block' }}>
                    Generated from AI Research thread:<br />
                    "{item.source_topic}"
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={() => downloadPdf(item)}>
                    <Download size={14} /> Download
                  </button>
                  <button className="btn-danger" style={{ padding: '10px 14px' }} onClick={() => remove(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
