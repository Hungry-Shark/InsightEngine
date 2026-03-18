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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </div>
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

      {/* ── New Chat & Temp Chat Row ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 10px', marginTop: '12px' }}>
        <button
          className={`nav-btn ${pathname === '/' ? 'active' : ''}`}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('newChat'));
            router.push('/');
          }}
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
              onClick={() => {
                 window.dispatchEvent(new CustomEvent('newChat'));
                 router.push('/');
                 // Temp chat logic placeholder
              }}
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
          className="nav-btn"
          onClick={() => {}}
        >
          <Star size={18} className="nav-icon" />
          <span className="nav-btn-label">My stuff</span>
          <span className="nav-tooltip">My stuff</span>
        </button>
      </div>

      {/* ── Collapsed History Icon ── */}
      <div className="history-collapsed-btn" style={{ padding: '0 10px', marginTop: '4px' }}>
        <button
          className={`nav-btn ${pathname === '/history' ? 'active' : ''}`}
          onClick={() => router.push('/history')}
        >
          <Clock size={18} className="nav-icon" />
          <span className="nav-tooltip">History</span>
        </button>
      </div>

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
