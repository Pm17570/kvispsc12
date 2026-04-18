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
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => { logout(); router.push('/'); };
  if (!user) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Home',         icon: '⌂', show: true },
    { href: '/club',      label: 'Clubs',         icon: '◎', show: user.role === 'student' },
    { href: '/treasure',  label: 'Treasure Hunt', icon: '◇', show: user.role === 'student' },
    { href: '/timetable', label: 'Timetable',     icon: '◈', show: true },
  ].filter(l => l.show);

  const roleBadge = user.role === 'admin'
    ? { label: 'Admin', color: '#9333EA' }
    : user.role === 'staff'
    ? { label: 'Staff', color: '#0EA5E9' }
    : { label: 'Student', color: '#16A34A' };

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--nav-bg)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 16px var(--shadow)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 58, gap: 8 }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#9333EA,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✦</div>
            <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 19, color: 'var(--text-primary)' }}>PSC<span style={{ color: 'var(--purple-mid)' }}>12</span></span>
          </Link>

          {/* Desktop nav links */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {navLinks.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: active ? 'var(--purple-mid)' : 'var(--text-secondary)', background: active ? 'var(--purple-soft)' : 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {link.icon} {link.label}
                </Link>
              );
            })}
          </div>

          {/* Spacer on mobile */}
          <div style={{ flex: 1 }} className="mobile-spacer" />

          {/* Theme toggle */}
          <button onClick={toggle} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
            {theme === 'dark' ? '☀' : '☽'}
          </button>

          {/* Profile dropdown — desktop */}
          <div style={{ position: 'relative', flexShrink: 0 }} ref={profileRef} className="desktop-profile">
            <button onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 40, background: profileOpen ? 'var(--purple-soft)' : 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}>
              <img src={user.profilePicture} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--purple-light)', flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nickname}</div>
                <div style={{ fontSize: 10, lineHeight: 1.2, color: roleBadge.color, fontWeight: 600 }}>{roleBadge.label}</div>
              </div>
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>▼</span>
            </button>
            {profileOpen && <ProfileMenu user={user} onClose={() => setProfileOpen(false)} onLogout={handleLogout} roleBadge={roleBadge} />}
          </div>

          {/* Hamburger — mobile only */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="hamburger" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column', gap: 4, padding: '8px 7px' }}>
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2, transition: 'all 0.2s', transform: mobileOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2, transition: 'all 0.2s', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2, transition: 'all 0.2s', transform: mobileOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-slide-down" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '8px 12px 16px' }}>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <img src={user.profilePicture} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--purple-light)' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{user.firstname} {user.surname}</div>
                <div style={{ fontSize: 12, color: roleBadge.color, fontWeight: 600 }}>{roleBadge.label}</div>
                {user.studentId && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {user.studentId}</div>}
              </div>
            </div>

            {/* Nav links */}
            {navLinks.map(link => {
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontWeight: 600, color: active ? 'var(--purple-mid)' : 'var(--text-primary)', background: active ? 'var(--purple-soft)' : 'transparent', marginBottom: 4 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{link.icon}</span>{link.label}
                </Link>
              );
            })}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
              <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>✏</span>Edit Profile
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontWeight: 500, color: 'var(--purple-mid)', marginBottom: 4 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>⚙</span>Administration
                </Link>
              )}
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, fontSize: 15, fontWeight: 500, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>⏻</span>Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .desktop-profile { display: none !important; }
          .hamburger { display: flex !important; }
          .mobile-spacer { display: flex; }
        }
        @media (min-width: 641px) {
          .mobile-spacer { display: none; }
        }
      `}</style>
    </>
  );
}

function ProfileMenu({ user, onClose, onLogout, roleBadge }: any) {
  return (
    <div className="animate-slide-down" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 32px var(--shadow-md)', minWidth: 200, overflow: 'hidden', zIndex: 200 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--purple-soft)' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{user.firstname} {user.surname}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
        {user.studentId && <div style={{ fontSize: 11, color: 'var(--purple-mid)', fontWeight: 600, marginTop: 2 }}>ID: {user.studentId}</div>}
      </div>
      <div style={{ padding: 6 }}>
        {[
          { href: '/profile', label: '✏ Edit Profile', show: true },
          { href: '/admin', label: '⚙ Administration', show: user.role === 'admin' },
        ].filter(i => i.show).map(item => (
          <Link key={item.href} href={item.href} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--purple-soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{item.label}</Link>
        ))}
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >⏻ Sign Out</button>
      </div>
    </div>
  );
}
