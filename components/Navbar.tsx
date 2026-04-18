'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { logout(); router.push('/'); };
  if (!user) return null;

  // Role-based nav links
  const navLinks = [
    { href: '/dashboard', label: 'Home',         icon: '⌂', show: true },
    { href: '/club',      label: 'Clubs',         icon: '◎', show: user.role === 'student' },
    { href: '/treasure',  label: 'Treasure Hunt', icon: '◇', show: user.role === 'student' },
    { href: '/timetable', label: 'Timetable',     icon: '◈', show: true },
  ].filter(l => l.show);

  const roleBadge = user.role === 'admin' ? { label: 'Admin', color: '#9333EA' } : user.role === 'staff' ? { label: 'Staff', color: '#0EA5E9' } : { label: 'Student', color: '#16A34A' };

  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, background:'var(--nav-bg)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)', boxShadow:'0 1px 16px var(--shadow)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', height:62, gap:8 }}>
        <Link href="/dashboard" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, marginRight:16 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#9333EA,#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(147,51,234,0.35)', fontSize:16 }}>✦</div>
          <span style={{ fontFamily:'DM Serif Display,serif', fontSize:20, color:'var(--text-primary)', letterSpacing:-0.5 }}>PSC<span style={{ color:'var(--purple-mid)' }}>12</span></span>
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap:2, flex:1 }}>
          {navLinks.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link key={link.href} href={link.href} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:8, textDecoration:'none', fontSize:14, fontWeight:600, color:active?'var(--purple-mid)':'var(--text-secondary)', background:active?'var(--purple-soft)':'transparent', transition:'all 0.15s' }}>
                <span style={{ fontSize:13 }}>{link.icon}</span>{link.label}
              </Link>
            );
          })}
        </div>

        <button onClick={toggle} title="Toggle theme" style={{ width:36, height:36, borderRadius:9, border:'1px solid var(--border)', background:'var(--surface2)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)', marginRight:4 }}>
          {theme === 'dark' ? '☀' : '☽'}
        </button>

        <div style={{ position:'relative' }} ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px 5px 5px', borderRadius:40, background:menuOpen?'var(--purple-soft)':'var(--surface2)', border:'1px solid var(--border)', cursor:'pointer', transition:'background 0.2s' }}>
            <img src={user.profilePicture} alt="avatar" style={{ width:30, height:30, borderRadius:'50%', background:'var(--purple-light)' }}/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 }}>{user.nickname}</div>
              <div style={{ fontSize:11, lineHeight:1.2, color:roleBadge.color, fontWeight:600 }}>{roleBadge.label}</div>
            </div>
            <span style={{ fontSize:9, color:'var(--text-muted)' }}>▼</span>
          </button>

          {menuOpen && (
            <div className="animate-slide-down" style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 8px 32px var(--shadow-md)', minWidth:200, overflow:'hidden', zIndex:200 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--purple-soft)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{user.firstname} {user.surname}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{user.email}</div>
                {user.studentId && <div style={{ fontSize:11, color:'var(--purple-mid)', fontWeight:600, marginTop:2 }}>ID: {user.studentId}</div>}
              </div>
              <div style={{ padding:6 }}>
                {[
                  { href:'/profile', label:'✏ Edit Profile', show:true },
                  { href:'/admin', label:'⚙ Administration', show:user.role==='admin' },
                ].filter(i=>i.show).map(item=>(
                  <Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, textDecoration:'none', fontSize:14, fontWeight:500, color:'var(--text-primary)', transition:'background 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--purple-soft)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                  >{item.label}</Link>
                ))}
                <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, fontSize:14, fontWeight:500, color:'#F87171', background:'none', border:'none', cursor:'pointer', width:'100%', transition:'background 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(248,113,113,0.1)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                >⏻ Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
