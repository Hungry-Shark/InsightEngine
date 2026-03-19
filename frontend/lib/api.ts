const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HistoryEntry {
  topic: string;
  report: string;
  raw_data: string;
  ts: string;
}

export interface MyStuffItem {
  id: string;
  type: 'pdf' | 'image' | 'file';
  title: string;
  source_topic: string;
  content: string;
  ts: string;
}

export interface Profile {
  name: string;
  email: string;
  bio: string;
}

export interface Settings {
  model: string;
  verbose: boolean;
  theme: string;
}

export interface ResearchResult {
  report: string;
  raw_data: string;
  topic: string;
  ts: string;
}

export interface ApiStatus {
  google_api: boolean;
  tavily_api: boolean;
}

async function req<T>(path: string, uid?: string | null, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (uid) {
    headers['X-User-Id'] = uid;
  }
  
  const res = await fetch(`${API}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  status: () => req<ApiStatus>('/api/status'),

  research: (topic: string, uid?: string | null, temporary: boolean = false, signal?: AbortSignal) =>
    req<ResearchResult>('/api/research', uid, {
      method: 'POST',
      body: JSON.stringify({ topic, temporary }),
      signal
    }),

  getHistory: (uid?: string | null) => req<{ history: HistoryEntry[] }>('/api/history', uid),
  deleteHistory: (index: number, uid?: string | null) => req<{ ok: boolean }>(`/api/history/${index}`, uid, { method: 'DELETE' }),
  clearHistory: (uid?: string | null) => req<{ ok: boolean }>('/api/history', uid, { method: 'DELETE' }),

  getMyStuff: (uid?: string | null) => req<{ items: MyStuffItem[] }>('/api/mystuff', uid),
  addToMyStuff: (data: MyStuffItem, uid?: string | null) =>
    req<{ ok: boolean }>('/api/mystuff', uid, { method: 'POST', body: JSON.stringify(data) }),
  deleteMyStuff: (id: string, uid?: string | null) => req<{ ok: boolean }>(`/api/mystuff/${id}`, uid, { method: 'DELETE' }),
  saveHistory: (data: HistoryEntry, uid?: string | null) => req<{ ok: boolean }>('/api/history/save', uid, { method: 'POST', body: JSON.stringify(data) }),

  getProfile: (uid?: string | null) => req<Profile>('/api/profile', uid),
  updateProfile: (data: Profile, uid?: string | null) =>
    req<{ ok: boolean }>('/api/profile', uid, { method: 'PUT', body: JSON.stringify(data) }),

  getSettings: (uid?: string | null) => req<Settings>('/api/settings', uid),
  updateSettings: (data: Settings, uid?: string | null) =>
    req<{ ok: boolean }>('/api/settings', uid, { method: 'PUT', body: JSON.stringify(data) }),
  resetSettings: (uid?: string | null) => req<{ ok: boolean }>('/api/settings/reset', uid, { method: 'POST' }),

  pdfUrl: (index: number) => `${API}/api/export/pdf/${index}`,
};
