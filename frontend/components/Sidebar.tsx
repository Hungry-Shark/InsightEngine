'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquarePlus,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, HistoryEntry } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [recents, setRecents] = useState<HistoryEntry[]>([]);
  const [profileName, setProfileName] = useState('User');

  useEffect(() => {
    api
      .getHistory()
      .then((d) => setRecents(d.history.slice(-10).reverse()))
      .catch(() => {});
    api
      .getProfile()
      .then((p) => setProfileName(p.name || 'User'))
      .catch(() => {});
  }, [pathname]);

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line className="hamburger-line hamburger-top" x1="3" y1="6" x2="21" y2="6" />
            <line className="hamburger-line hamburger-mid" x1="3" y1="12" x2="21" y2="12" />
            <line className="hamburger-line hamburger-bot" x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {!collapsed && (
          <button
            className="sidebar-icon-btn"
            onClick={() => router.push('/history')}
            aria-label="Search history"
          >
            <Search size={18} />
          </button>
        )}
      </div>

      {/* ── New Chat button ── */}
      <button
        className={`nav-btn ${pathname === '/' ? 'active' : ''}`}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('newChat'));
          router.push('/');
        }}
        style={{ marginTop: '4px' }}
      >
        <MessageSquarePlus size={18} className="nav-icon" />
        <span className="nav-btn-label">New chat</span>
        <span className="nav-tooltip">New chat</span>
      </button>

      {/* ── Scrollable nav area ── */}
      <div className="sidebar-nav">
        {/* Recent history */}
        {recents.length > 0 && (
          <>
            <div className="sidebar-section-label">Recent</div>
            {recents.map((item, i) => (
              <button
                key={i}
                className="history-item-btn"
                title={item.topic}
                onClick={() => {
                  sessionStorage.setItem(
                    'preloaded_report',
                    JSON.stringify(item)
                  );
                  router.push('/');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('loadReport')), 50);
                }}
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
          </>
        )}
      </div>

      {/* ── Bottom tray ── */}
      <div className="sidebar-bottom">
        <button
          className="nav-btn"
          onClick={() => router.push('/settings')}
        >
          <Settings size={18} className="nav-icon" />
          <span className="nav-btn-label">Settings</span>
          <span className="nav-tooltip">Settings</span>
        </button>
        <button
          className="nav-btn"
          onClick={() => router.push('/profile')}
        >
          <User size={18} className="nav-icon" />
          <span className="nav-btn-label">Profile</span>
          <span className="nav-tooltip">Profile</span>
        </button>
      </div>
    </nav>
  );
}
