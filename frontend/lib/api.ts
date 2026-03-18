const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HistoryEntry {
  topic: string;
  report: string;
  raw_data: string;
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

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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

  research: (topic: string) =>
    req<ResearchResult>('/api/research', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),

  getHistory: () => req<{ history: HistoryEntry[] }>('/api/history'),
  deleteHistory: (index: number) => req<{ ok: boolean }>(`/api/history/${index}`, { method: 'DELETE' }),
  clearHistory: () => req<{ ok: boolean }>('/api/history', { method: 'DELETE' }),

  getProfile: () => req<Profile>('/api/profile'),
  updateProfile: (data: Profile) =>
    req<{ ok: boolean }>('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),

  getSettings: () => req<Settings>('/api/settings'),
  updateSettings: (data: Settings) =>
    req<{ ok: boolean }>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  resetSettings: () => req<{ ok: boolean }>('/api/settings/reset', { method: 'POST' }),

  pdfUrl: (index: number) => `${API}/api/export/pdf/${index}`,
};
