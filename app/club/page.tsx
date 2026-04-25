'use client';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

interface Club { id: string; name: string; description: string; type: string; capacity: number; imageUrl: string; members: any[]; organizers: any[]; }
interface Round { round: number; sessionDate: string; openAt: string; closeAt: string; clubs: Club[]; }

const TYPE_BADGE: Record<string, string> = { STEM:'badge-blue', Arts:'badge-pink', Academic:'badge-green', Community:'badge-orange', Sports:'badge-orange', Other:'badge-gray' };

export default function ClubPage() {
  const { user, refreshUser } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState('');
  const [detailClub, setDetailClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRounds = useCallback(async () => {
    const rd = await fetch('/api/rounds').then(r => r.json());
    setRounds(rd.rounds ?? []);
    const cr = rd.currentRound;
    setCurrentRound(cr);
    if (cr) setSelectedRound(cr.round);
    else if ((rd.rounds ?? []).length) setSelectedRound(rd.rounds[0].round);
  }, []);

  const loadClubs = useCallback(async (round: number) => {
    setLoading(true);
    const cd = await fetch(`/api/clubs?round=${round}`).then(r => r.json());
    setClubs(cd.clubs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRounds(); }, [loadRounds]);
  useEffect(() => { if (selectedRound) loadClubs(selectedRound); }, [selectedRound, loadClubs]);

  if (!user) return null;

  const selRound = rounds.find(r => r.round === selectedRound);
  const roundStatus = (r: Round) => {
    const now = new Date();
    if (now < new Date(r.openAt)) return 'upcoming';
    if (now > new Date(r.closeAt)) return 'closed';
    return 'open';
  };
  const isOpen = selRound ? roundStatus(selRound) === 'open' : false;

  const handleRegister = async (clubId: string) => {
    if (!isOpen) return;
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, clubId, round: selectedRound }) });
    const data = await res.json();
    setMsg({ text: data.message ?? data.error, ok: res.ok });
    setTimeout(() => setMsg(null), 3000);
    loadClubs(selectedRound);
    await refreshUser();
  };

  const userSelectedClubId = user.selectedClubs?.[selectedRound] ?? null;
  const filtered = clubs.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.type.toLowerCase().includes(filter.toLowerCase()));

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDT = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>Clubs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Each round has a fixed session date with a unique set of clubs</p>
        </div>

        {/* Round tabs */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {rounds.map(r => {
              const status = roundStatus(r);
              const active = r.round === selectedRound;
              const dotColor = status === 'open' ? '#4ADE80' : status === 'upcoming' ? '#A855F7' : 'var(--text-muted)';
              return (
                <button key={r.round} onClick={() => setSelectedRound(r.round)} style={{
                  padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  border: `2px solid ${active ? 'var(--purple-mid)' : 'var(--border)'}`,
                  background: active ? 'var(--purple-soft)' : 'var(--surface2)',
                  color: active ? 'var(--purple-mid)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, minWidth: 140,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                    Round {r.round}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'var(--purple-mid)' : 'var(--text-muted)', opacity: 0.85 }}>
                    {new Date(r.sessionDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>

          {selRound && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, background: isOpen ? 'rgba(74,222,128,0.15)' : roundStatus(selRound) === 'upcoming' ? 'var(--purple-soft)' : 'var(--surface2)', color: isOpen ? 'var(--green-mid)' : roundStatus(selRound) === 'upcoming' ? 'var(--purple-mid)' : 'var(--text-muted)' }}>
                {isOpen ? '● Open for registration' : roundStatus(selRound) === 'upcoming' ? '◎ Not yet open' : '✕ Closed'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Session: <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(selRound.sessionDate)}</strong>
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Registration: {fmtDT(selRound.openAt)} — {fmtDT(selRound.closeAt)}</span>
            </div>
          )}
        </div>

        {/* Unique clubs banner */}
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'var(--purple-soft)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>◈</span>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--purple-mid)' }}>Each round offers a completely different set of clubs.</strong>{' '}
            Round {selectedRound} has {clubs.length} clubs available.
          </div>
        </div>

        {/* Current selection */}
        {userSelectedClubId && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-mid)' }}>
                Round {selectedRound} selection: {clubs.find(c => c.id === userSelectedClubId)?.name ?? userSelectedClubId}
              </div>
              {isOpen && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>You can switch clubs while registration is open and the club isn't full.</div>}
            </div>
          </div>
        )}

        {msg && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', color: msg.ok ? 'var(--green-mid)' : '#F87171', fontWeight: 600, fontSize: 14, border: `1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            {msg.ok ? '✓ ' : '✕ '}{msg.text}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <input className="input" placeholder="Search clubs…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 360 }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 15 }}>Loading clubs…</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◫</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No clubs found for this round</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
            {filtered.map(club => {
              const memberCount = club.members.filter((m: any) => m.round === selectedRound).length;
              const isFull = memberCount >= club.capacity;
              const isSelected = userSelectedClubId === club.id;
              const pct = Math.min(100, Math.round(memberCount / club.capacity * 100));

              return (
                <div key={club.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isSelected ? '2px solid var(--green-mid)' : '1px solid var(--border)', boxShadow: isSelected ? '0 4px 24px rgba(74,222,128,0.15)' : undefined }}>
                  <div style={{ position: 'relative' }}>
                    <img src={club.imageUrl} alt={club.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.55),transparent)' }} />
                    {isSelected && <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--green-mid)', color: '#052E16', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>✓ Selected</div>}
                    {isFull && !isSelected && <div style={{ position: 'absolute', top: 10, right: 10, background: '#EF4444', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>Full</div>}
                    <span className={`badge ${TYPE_BADGE[club.type] ?? 'badge-gray'}`} style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11 }}>{club.type}</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <h3 style={{ fontSize: 17, marginBottom: 6 }}>{club.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                      {club.description.length > 100 ? club.description.slice(0, 100) + '…' : club.description}
                    </p>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Capacity</span>
                        <span style={{ fontWeight: 700, color: isFull ? '#EF4444' : 'var(--green-mid)' }}>{memberCount} / {club.capacity}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.5s', background: isFull ? '#EF4444' : pct > 75 ? '#FB923C' : '#4ADE80' }} />
                      </div>
                    </div>
                    {/* Organizers */}
                    {club.organizers?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Organizer{club.organizers.length > 1 ? 's' : ''}:</span>
                        {club.organizers.map((o: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <img src={o.profile_picture} style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--purple-light)' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{o.firstname} {o.surname}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {o.role_label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDetailClub(club)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: 13 }}>Details</button>
                      {isOpen && (
                        <button onClick={() => handleRegister(club.id)} disabled={isFull && !isSelected} className={isSelected ? 'btn-secondary' : 'btn-green'} style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: 13 }}>
                          {isSelected ? '⇄ Switch' : isFull ? '✕ Full' : '✓ Select'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail modal */}
        {detailClub && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setDetailClub(null)}>
            <div className="card animate-fade-in" style={{ maxWidth: 560, width: '100%', padding: 0, overflow: 'hidden', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <img src={detailClub.imageUrl} alt={detailClub.name} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 24, marginBottom: 6 }}>{detailClub.name}</h2>
                    <span className={`badge ${TYPE_BADGE[detailClub.type] ?? 'badge-gray'}`}>{detailClub.type}</span>
                  </div>
                  <button onClick={() => setDetailClub(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: detailClub.organizers?.length > 0 ? 14 : 20 }}>{detailClub.description}</p>

                {/* Organizers in modal */}
                {detailClub.organizers?.length > 0 && (
                  <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--purple-soft)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-mid)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                      ◷ Club Organizer{detailClub.organizers.length > 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detailClub.organizers.map((o: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={o.profile_picture} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--purple-light)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{o.firstname} {o.surname} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({o.nickname})</span></div>
                            <div style={{ fontSize: 11, color: 'var(--purple-mid)', fontWeight: 600 }}>{o.role_label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Registrations — Round {selectedRound}</h3>
                {detailClub.members.filter((m: any) => m.round === selectedRound).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>No registrations yet.</p>
                ) : (
                  <div style={{ background: 'var(--purple-soft)', borderRadius: 10, overflow: 'hidden', marginBottom: 20, border: '1px solid var(--border)' }}>
                    {detailClub.members.filter((m: any) => m.round === selectedRound).map((m: any, i: number) => (
                      <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--purple-mid)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        <img src={m.profile_picture ?? ''} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--purple-light)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m.firstname} {m.surname}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.nickname}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.registered_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <button onClick={() => { handleRegister(detailClub.id); setDetailClub(null); }} disabled={detailClub.members.filter((m: any) => m.round === selectedRound).length >= detailClub.capacity && userSelectedClubId !== detailClub.id} className="btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                    {userSelectedClubId === detailClub.id ? '⇄ Switch to This Club' : '✓ Select This Club'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
