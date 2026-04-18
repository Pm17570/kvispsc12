'use client';
import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';
import ImageUpload from '@/components/ImageUpload';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? '');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    if (password && password !== confirmPw) {
      setMsg({ text: 'Passwords do not match', ok: false });
      setSaving(false); return;
    }
    const body: any = { id: user.id, bio };
    if (password) body.password = password;
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      await refreshUser();
      setPassword(''); setConfirmPw('');
      setMsg({ text: 'Saved successfully!', ok: true });
    } else {
      const d = await res.json();
      setMsg({ text: d.error ?? 'An error occurred', ok: false });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const readOnly = [
    { label: 'First Name', value: user.firstname },
    { label: 'Surname', value: user.surname },
    { label: 'Nickname', value: user.nickname },
    ...(user.studentId ? [{ label: 'Student ID', value: user.studentId }] : []),
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role === 'admin' ? '⚙ Administrator' : user.role === 'staff' ? '◷ Staff' : '✦ Student' },
  ];

  return (
    <AuthGuard>
      <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>Edit Profile</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Update your bio, password, and profile picture</p>
        </div>

        {/* Header card with upload */}
        <div className="card" style={{ padding: 28, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <ImageUpload
              currentUrl={user.profilePicture}
              type="user"
              id={user.id}
              size={96}
              shape="circle"
              onUploaded={() => refreshUser()}
            />
            <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--surface)', borderRadius: 20, padding: '2px 6px', fontSize: 11, color: 'var(--purple-mid)', fontWeight: 600, border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              📷 Click
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 4 }}>{user.firstname} {user.surname}</h2>
            <p style={{ color: 'var(--purple-mid)', fontSize: 15, fontWeight: 600, marginBottom: 10 }}>"{user.nickname}"</p>
            <span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-green'}`}>
              {user.role === 'admin' ? '⚙ Administrator' : '✦ Student'}
            </span>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Click or drag on photo to update. Max 5MB, JPEG/PNG/WebP.</p>
          </div>
        </div>

        {/* Read-only */}
        <div className="card" style={{ padding: 24, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>🔒</span>
            <h3 style={{ fontSize: 17, margin: 0 }}>Account Information</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>Read-only</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {readOnly.map(f => (
              <div key={f.label} style={{ padding: '12px 14px', background: 'var(--purple-soft)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editable */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 16, color: 'var(--purple-mid)' }}>✏</span>
            <h3 style={{ fontSize: 17, margin: 0 }}>Editable Fields</h3>
          </div>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Bio</label>
              <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself…" rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--purple-soft)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>🔑 Change Password</label>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--purple-mid)', fontWeight: 600 }}>
                  {showPw ? '🙈 Hide' : '👁 Show'}
                </button>
              </div>
              {showPw ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>New Password</label>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password…" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Confirm</label>
                    <input className="input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm…" />
                  </div>
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click "Show" to change your password</p>}
            </div>
            {msg && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: msg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: msg.ok ? 'var(--green-mid)' : '#F87171', fontWeight: 600, fontSize: 13, border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                {msg.ok ? '✓ ' : '✕ '}{msg.text}
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={saving} style={{ padding: '12px 28px' }}>
              {saving ? 'Saving…' : '◈ Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
