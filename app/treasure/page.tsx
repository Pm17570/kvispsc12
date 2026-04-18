'use client';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

export default function TreasurePage() {
  const { user } = useAuth();
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Record<number, string>>({});
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [lastResult, setLastResult] = useState<{ correct: number[]; wrong: number[] } | null>(null);
  const [checking, setChecking] = useState(false);

  const loadState = useCallback(async () => {
    if (!user) return;
    const data = await fetch(`/api/treasure?userId=${user.id}`).then(r => r.json());
    setLocked(data.locked ?? {});
    setCooldownEnd(data.cooldownEnd ? new Date(data.cooldownEnd) : null);
  }, [user]);

  useEffect(() => { loadState(); }, [loadState]);

  useEffect(() => {
    if (!cooldownEnd) { setTimeLeft(''); return; }
    const tick = () => {
      const diff = cooldownEnd.getTime() - Date.now();
      if (diff <= 0) { setCooldownEnd(null); setTimeLeft(''); return; }
      setTimeLeft(`${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  if (!user) return null;

  const handleCheck = async () => {
    if (cooldownEnd || checking) return;
    setChecking(true);
    const res = await fetch('/api/treasure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, inputs }) });
    const data = await res.json();
    if (res.status === 429) { setCooldownEnd(new Date(data.cooldownEnd)); setChecking(false); return; }
    setLastResult({ correct: data.correct ?? [], wrong: data.wrong ?? [] });
    setCooldownEnd(new Date(data.cooldownEnd));
    const newInputs = { ...inputs };
    (data.wrong ?? []).forEach((s: number) => { newInputs[s] = ''; });
    (data.correct ?? []).forEach((s: number) => { delete newInputs[s]; });
    setInputs(newInputs);
    await loadState();
    setChecking(false);
  };

  const lockedCount = Object.keys(locked).length;
  const hasInput = Object.values(inputs).some(v => v.trim());

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>◇ Treasure Hunt</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Fill in any clues you've discovered, then hit Check. No need to fill all 12.</p>
        </div>

        {/* Progress ring */}
        <div className="card" style={{ padding: 22, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `conic-gradient(var(--purple-mid) ${lockedCount / 12 * 360}deg, var(--border) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontFamily: 'DM Serif Display,serif', color: 'var(--purple-mid)', fontWeight: 700, lineHeight: 1 }}>{lockedCount}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 12</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {lockedCount === 12 ? '🏆 All clues found!' : `${lockedCount} clue${lockedCount !== 1 ? 's' : ''} solved`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              {lockedCount < 12 ? `${12 - lockedCount} remaining` : 'Congratulations — treasure complete!'}
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${lockedCount / 12 * 100}%`, background: 'linear-gradient(90deg,var(--purple-mid),var(--pink-vivid))', borderRadius: 3, transition: 'width 0.6s' }} />
            </div>
          </div>
        </div>

        {cooldownEnd && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.35)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FB923C' }}>Cooldown — {timeLeft} remaining</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>You must wait 20 minutes between checks.</div>
            </div>
          </div>
        )}

        {lastResult && (lastResult.correct.length > 0 || lastResult.wrong.length > 0) && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: lastResult.correct.length > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${lastResult.correct.length > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            {lastResult.correct.length > 0 && <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-mid)', marginBottom: 3 }}>✓ Correct: {lastResult.correct.map(s => `#${s + 1}`).join(', ')}</div>}
            {lastResult.wrong.length > 0 && <div style={{ fontWeight: 700, fontSize: 14, color: '#F87171' }}>✕ Wrong: {lastResult.wrong.map(s => `#${s + 1}`).join(', ')}</div>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
          {Array.from({ length: 12 }, (_, i) => {
            const isLocked = locked[i] !== undefined;
            const wasWrong = lastResult?.wrong.includes(i);
            const wasCorrect = lastResult?.correct.includes(i);
            return (
              <div key={i} style={{ borderRadius: 14, padding: 16, transition: 'all 0.25s', background: isLocked ? 'rgba(74,222,128,0.07)' : wasWrong ? 'rgba(248,113,113,0.07)' : 'var(--surface)', border: `1.5px solid ${isLocked ? 'rgba(74,222,128,0.4)' : wasWrong ? 'rgba(248,113,113,0.4)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isLocked ? 'var(--green-mid)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Clue #{i + 1}</span>
                  <span style={{ fontSize: 14 }}>{isLocked ? '🔒' : wasWrong ? '✕' : wasCorrect ? '✓' : '◇'}</span>
                </div>
                {isLocked ? (
                  <div style={{ padding: '8px 12px', background: 'rgba(74,222,128,0.15)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: 'var(--green-mid)', letterSpacing: 1, fontFamily: 'monospace' }}>{locked[i]}</div>
                ) : (
                  <input className="input" value={inputs[i] ?? ''} onChange={e => setInputs(p => ({ ...p, [i]: e.target.value }))} placeholder="Your answer…" disabled={!!cooldownEnd} style={{ fontSize: 14, background: wasWrong ? 'rgba(248,113,113,0.06)' : 'var(--input-bg)', borderColor: wasWrong ? 'rgba(248,113,113,0.4)' : undefined }} onKeyDown={e => { if (e.key === 'Enter' && !cooldownEnd && hasInput) handleCheck(); }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={handleCheck} disabled={!!cooldownEnd || checking || !hasInput} className="btn-primary" style={{ padding: '14px 44px', fontSize: 16 }}>
            {checking ? 'Checking…' : cooldownEnd ? `⏳ ${timeLeft}` : '◇ Check Answers'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>You don't need to fill all 12 • 20-minute cooldown after each check</p>
        </div>
      </div>
    </AuthGuard>
  );
}
