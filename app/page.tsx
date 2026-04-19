'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/dashboard'); }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    const result = await login(email, password);
    if (result.success) router.push('/dashboard');
    else setError(result.message);
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen mesh-bg flex items-center justify-center"><div style={{ color:'var(--purple-mid)', fontSize:18 }}>Loading…</div></div>;

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div style={{ position:'fixed', top:-100, right:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(147,51,234,0.18),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-120, left:-70, width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(74,222,128,0.12),transparent)', pointerEvents:'none' }}/>
      <button onClick={toggle} style={{ position:'fixed', top:20, right:20, width:38, height:38, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
        {theme==='dark'?'☀':'☽'}
      </button>

      <div className="animate-fade-in" style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#9333EA,#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 28px rgba(147,51,234,0.4)', fontSize:28 }}>✦</div>
          <h1 style={{ fontSize:38, marginBottom:4 }}>PSC<span className="gradient-text">12</span></h1>
          <p style={{ color:'var(--text-secondary)', fontSize:15 }}>Club Registration Platform</p>
        </div>

        <div className="card" style={{ padding:32 }}>
          <h2 style={{ fontSize:22, marginBottom:6 }}>Welcome back</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:24 }}>Sign in to access your dashboard</p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Email</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="xxxxx@kvis.ac.th" required/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input className="input" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" style={{ paddingRight:44 }}/>
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:4 }}>{showPw?'🙈':'👁'}</button>
              </div>
            </div>
            {error && <div style={{ background:'rgba(248,113,113,0.12)', color:'#F87171', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, fontWeight:500, border:'1px solid rgba(248,113,113,0.3)' }}>{error}</div>}
            <button className="btn-primary" type="submit" disabled={submitting} style={{ width:'100%', justifyContent:'center', padding:'12px 20px', fontSize:15 }}>
              {submitting?'Signing in…':'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
