'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquarePlus,
  Search,
  Settings,
  User as UserIcon,
  Star,
  MessageSquareDashed,
  Clock,
  Menu,
  X,
  Users
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { api, HistoryEntry } from '@/lib/api';
import { User } from 'firebase/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [recents, setRecents] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkUnsaved = (callback: () => void) => {
    if (sessionStorage.getItem('has_unsaved_temp') === 'true') {
      const id = Date.now().toString();
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail.id === id) {
          window.removeEventListener('navResolved', handler);
          if (customEvent.detail.proceed) callback();
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
    
    // Auth Listener
    import('@/lib/firebase').then(({ auth }) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        setUser(u);
        setAuthLoading(false);
      });
      return () => unsubscribe();
    });

    const handleToggle = () => setCollapsed((c) => !c);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  const fetchHistory = useCallback(() => {
    if (!user) {
      setRecents([]);
      return;
    }
    api
      .getHistory(user.uid)
      .then((d) => setRecents(d.history.slice(-10).reverse()))
      .catch((err) => {
        console.error("Failed to fetch history:", err);
        setRecents([]);
      });
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setRecents([]);
    }
  }, [user, pathname, fetchHistory]);

  useEffect(() => {
    if (user) {
      window.addEventListener('historyUpdated', fetchHistory);
      return () => window.removeEventListener('historyUpdated', fetchHistory);
    }
  }, [user, fetchHistory]);


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
          className={`nav-btn ${pathname === '/mystuff' ? 'active' : ''} ${!user ? 'nav-btn-locked' : ''}`}
          onClick={() => {
            if (!user) return;
            checkUnsaved(() => router.push('/mystuff'));
          }}
          disabled={!user && !authLoading}
        >
          <Star size={18} className="nav-icon" />
          <span className="nav-btn-label">My stuff</span>
          {!user && !authLoading && <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.5 }}>LOCKED</span>}
          <span className="nav-tooltip">{!user ? 'Sign in to save' : 'My stuff'}</span>
        </button>
      </div>

      {/* ── Recent / History Link ── */}
      <div style={{ padding: '0 10px', marginTop: '8px' }}>
        <button
          className={`nav-btn ${pathname === '/history' ? 'active' : ''} ${!user ? 'nav-btn-locked' : ''}`}
          onClick={() => {
            if (!user) return;
            checkUnsaved(() => router.push('/history'));
          }}
          disabled={!user && !authLoading}
        >
          <Clock size={18} className="nav-icon" />
          <span className="nav-btn-label">Recent</span>
          {!user && !authLoading && <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.5 }}>LOCKED</span>}
          <span className="nav-tooltip">{!user ? 'Sign in for history' : 'Recent History'}</span>
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

      <div className="sidebar-bottom">
        <button
          className={`nav-btn ${pathname === '/collaborate' ? 'active' : ''} ${!user ? 'nav-btn-locked' : ''}`}
          onClick={() => {
            if (!user) return;
            if (pathname !== '/') router.push('/');
            setTimeout(() => window.dispatchEvent(new CustomEvent('toggleCollaboration')), 100);
          }}
          disabled={!user && !authLoading}
        >
          <Users size={18} className="nav-icon" />
          <span className="nav-btn-label">Collaborate</span>
          {!user && !authLoading && <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.5 }}>LOCKED</span>}
          <span className="nav-tooltip">{!user ? 'Sign in to collaborate' : 'Research Room'}</span>
        </button>
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
          <UserIcon size={18} className="nav-icon" />
          <span className="nav-btn-label">Profile</span>
          <span className="nav-tooltip">Profile</span>
        </button>
      </div>
    </nav>
  );
}
