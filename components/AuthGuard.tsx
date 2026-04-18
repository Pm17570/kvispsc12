'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Navbar from './Navbar';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div style={{ color: 'var(--purple-mid)', fontSize: 18 }}>Loading…</div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="mesh-bg" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </div>
  );
}
