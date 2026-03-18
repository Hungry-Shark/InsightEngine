'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquarePlus,
  Search,
  Settings,
  User,
  Star,
  MessageSquareDashed,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { api, HistoryEntry } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [recents, setRecents] = useState<HistoryEntry[]>([]);
  const [profileName, setProfileName] = useState('User');

  const checkUnsaved = (callback: () => void) => {
    if (sessionStorage.getItem('has_unsaved_temp') === 'true') {
      const id = Date.now().toString();
      const handler = (e: any) => {
        if (e.detail.id === id) {
          window.removeEventListener('navResolved', handler);
          if (e.detail.proceed) callback();
        }
      };
      window.addEventListener('navResolved', handler);
      window.dispatchEvent(new CustomEvent('promptSave', { detail: { id } }));
    } else {
      callback();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setCollapsed(true);
    }
    const handleToggle = () => setCollapsed((c) => !c);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  const fetchHistory = useCallback(() => {
    api
      .getHistory()
      .then((d) => setRecents(d.history.slice(-10).reverse()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHistory();
    api
      .getProfile()
      .then((p) => setProfileName(p.name || 'User'))
      .catch(() => {});
  }, [pathname, fetchHistory]);

  useEffect(() => {
    window.addEventListener('historyUpdated', fetchHistory);
    return () => window.removeEventListener('historyUpdated', fetchHistory);
  }, [fetchHistory]);

  const initials = profileName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Top toolbar: hamburger + search ── */}
      <div className="sidebar-toolbar">
        <button
          className="sidebar-icon-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </div>
        </button>
        {!collapsed && (
          <button
            className="sidebar-icon-btn"
            onClick={() => checkUnsaved(() => router.push('/history'))}
            aria-label="Search history"
          >
            <Search size={18} />
          </button>
        )}
      </div>

      {/* ── New Chat & Temp Chat Row ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 10px', marginTop: '12px' }}>
        <button
          className={`nav-btn ${pathname === '/' ? 'active' : ''}`}
          onClick={() => checkUnsaved(() => {
            window.dispatchEvent(new CustomEvent('newChat'));
            router.push('/');
          })}
          style={{ flex: 1, padding: '10px 12px', marginBottom: 0 }}
        >
          <MessageSquarePlus size={18} className="nav-icon" />
          <span className="nav-btn-label">New chat</span>
          <span className="nav-tooltip">New chat</span>
        </button>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className="sidebar-icon-btn"
              style={{ width: '36px', height: '36px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '50%', padding: 0 }}
              onClick={() => checkUnsaved(() => {
                 window.dispatchEvent(new CustomEvent('tempChat'));
                 router.push('/');
              })}
              title="Temporary chat"
            >
              <MessageSquareDashed size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── My stuff ── */}
      <div style={{ padding: '0 10px', marginTop: '8px' }}>
        <button
          className={`nav-btn ${pathname === '/mystuff' ? 'active' : ''}`}
          onClick={() => checkUnsaved(() => router.push('/mystuff'))}
        >
          <Star size={18} className="nav-icon" />
          <span className="nav-btn-label">My stuff</span>
          <span className="nav-tooltip">My stuff</span>
        </button>
      </div>

      {/* ── Recent / History Link ── */}
      <div style={{ padding: '0 10px', marginTop: '8px' }}>
        <button
          className={`nav-btn ${pathname === '/history' ? 'active' : ''}`}
          onClick={() => checkUnsaved(() => router.push('/history'))}
        >
          <Clock size={18} className="nav-icon" />
          <span className="nav-btn-label">Recent</span>
          <span className="nav-tooltip">Recent History</span>
        </button>
      </div>

      {/* ── Scrollable nav area ── */}
      <div className="sidebar-nav" style={{ padding: '0 10px' }}>
        {/* Recent history */}
        {recents.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            {recents.map((item, i) => (
              <button
                key={i}
                className="history-item-btn"
                title={item.topic}
                onClick={() => checkUnsaved(() => {
                  sessionStorage.setItem(
                    'preloaded_report',
                    JSON.stringify(item)
                  );
                  router.push('/');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('loadReport')), 50);
                })}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {item.topic.length > 30
                    ? item.topic.slice(0, 30) + '…'
                    : item.topic}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom tray ── */}
      <div className="sidebar-bottom">
        <button
          className="nav-btn"
          onClick={() => checkUnsaved(() => router.push('/settings'))}
        >
          <Settings size={18} className="nav-icon" />
          <span className="nav-btn-label">Settings</span>
          <span className="nav-tooltip">Settings</span>
        </button>
        <button
          className="nav-btn"
          onClick={() => checkUnsaved(() => router.push('/profile'))}
        >
          <User size={18} className="nav-icon" />
          <span className="nav-btn-label">Profile</span>
          <span className="nav-tooltip">Profile</span>
        </button>
      </div>
    </nav>
  );
}
