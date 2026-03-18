'use client';

import { useState, useEffect } from 'react';
import { Save, Camera } from 'lucide-react';
import { api, Profile } from '@/lib/api';
import ReflectiveCard from '@/components/ReflectiveCard';

export default function ProfilePage() {
  const [form, setForm] = useState<Profile>({ name: 'Alexander Doe', email: '', bio: 'Senior Developer' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [apiStatus, setApiStatus] = useState({ google_api: false, tavily_api: false });
  const [reportCount, setReportCount] = useState(0);
  const [imageSrc, setImageSrc] = useState("https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=800&auto=format&fit=crop");

  useEffect(() => {
    api.getProfile().then((d) => {
      setForm({
        name: d.name || 'Alexander Doe',
        email: d.email || '',
        bio: d.bio || 'Senior Developer'
      });
    }).catch(() => {});
    api.status().then((d) => setApiStatus(d)).catch(() => {});
    api.getHistory().then((d) => setReportCount(d.history.length)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateProfile(form);
      setStatus({ type: 'success', msg: 'Profile saved successfully.' });
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Save failed.' });
    }
    setTimeout(() => setStatus(null), 3000);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page-inner">
      <h1 className="section-header">Profile</h1>
      <p className="section-sub">
        User Access Dashboard
      </p>

      {status && (
        <div className={`alert alert-${status.type}`}>{status.msg}</div>
      )}

      {/* 2-Column Layout: Reflective Card and User Info */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap', paddingLeft: '40px' }}>
        
        {/* Column 1: Reflective Card (Left) */}
        <div style={{ flexShrink: 0, width: '100%', maxWidth: '380px' }}>
          <ReflectiveCard
            imageSrc={imageSrc}
            userName={form.name.toUpperCase()}
            userRole={form.bio ? form.bio.toUpperCase() : 'USER'}
            overlayColor="rgba(0, 0, 0, 0)"
            blurStrength={1.5}
            glassDistortion={30}
            metalness={0.9}
            roughness={0.75}
            displacementStrength={20}
            noiseScale={1}
            specularConstant={5}
            grayscale={0.4}
            color="#ffffff"
          />
        </div>

        {/* Column 2: User Info (Right) */}
        <div style={{ flex: 1, minWidth: '320px', maxWidth: '500px' }}>
          <div className="glass-card">
            <p className="card-title">User Info</p>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Context</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Title / Role</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Profile Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', gap: '8px' }}>
                    <Camera size={14} />
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                    Update Photo
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
              >
                <Save size={14} />
                Save User Info
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
