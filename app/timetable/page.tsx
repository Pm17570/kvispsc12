'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

interface Activity {
  id: string; title: string; date: string; time: string; location: string;
  description: string; type: string; audience: string;
  staffRoles: any[]; myRole: any | null;
}

const TYPE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  Ceremony:    { bg:'rgba(168,85,247,0.15)', color:'var(--purple-mid)', icon:'✦' },
  Workshop:    { bg:'rgba(96,165,250,0.15)', color:'#60A5FA',           icon:'⚙' },
  Exhibition:  { bg:'rgba(244,114,182,0.15)',color:'var(--pink-vivid)', icon:'◈' },
  Competition: { bg:'rgba(251,191,36,0.15)', color:'#FBBF24',          icon:'◎' },
  Event:       { bg:'rgba(74,222,128,0.15)', color:'var(--green-mid)', icon:'◇' },
  Performance: { bg:'rgba(251,146,60,0.15)', color:'#FB923C',          icon:'♪' },
  Meeting:     { bg:'rgba(20,184,166,0.15)', color:'#14B8A6',          icon:'◷' },
  Trip:        { bg:'rgba(34,197,94,0.15)',  color:'#22C55E',          icon:'↗' },
};

function fmtFullDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TimetablePage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/timetable?userId=${user.id}&role=${user.role}`)
      .then(r => r.json())
      .then(d => setActivities(d.activities ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const isStaff = user.role === 'staff';
  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(filter.toLowerCase()) ||
    a.location.toLowerCase().includes(filter.toLowerCase()) ||
    a.type.toLowerCase().includes(filter.toLowerCase())
  );

  const grouped: Record<string, Activity[]> = {};
  filtered.forEach(a => { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); });
  const sortedDates = Object.keys(grouped).sort();
  const todayStr = new Date().toISOString().slice(0, 10);
  const isUpcoming = (d: string) => new Date(d) >= new Date(new Date().toDateString());

  // Count activities where staff has a role
  const myRoleCount = activities.filter(a => a.myRole).length;

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>
            {isStaff ? '◈ My Timetable' : '◈ Timetable'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            {isStaff
              ? 'Your personalised schedule — includes your assigned roles for each activity'
              : 'Schedule of activities and events'}
          </p>
        </div>

        {/* Staff role summary card */}
        {isStaff && myRoleCount > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 24, background: 'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(14,165,233,0.03))', border: '1px solid rgba(14,165,233,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>◷</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0EA5E9' }}>You have {myRoleCount} assigned role{myRoleCount > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Activities with your role are highlighted below</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <input className="input" placeholder="Search timetable…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 360 }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading…</div>
        ) : sortedDates.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--text-muted)' }}>◫</div>
            <p style={{ color: 'var(--text-muted)' }}>No activities in your timetable</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {sortedDates.map(date => {
              const acts = grouped[date];
              const past = !isUpcoming(date);
              const isToday = date === todayStr;
              return (
                <div key={date}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14, background: isToday ? 'var(--purple-mid)' : past ? 'var(--surface2)' : 'var(--purple-soft)', color: isToday ? 'white' : past ? 'var(--text-muted)' : 'var(--purple-mid)', border: `1px solid ${isToday ? 'var(--purple-mid)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isToday && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: 4 }}>TODAY</span>}
                      {fmtFullDate(date)}
                      <span style={{ fontSize: 12, opacity: 0.7 }}>· {acts.length} event{acts.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    {past && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✓ Past</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, borderLeft: `2px solid ${isToday ? 'var(--purple-mid)' : past ? 'var(--border)' : 'var(--purple-light)'}` }}>
                    {acts.sort((a, b) => a.time.localeCompare(b.time)).map(a => {
                      const type = TYPE_STYLES[a.type] ?? { bg: 'var(--surface2)', color: 'var(--text-secondary)', icon: '◇' };
                      const hasMyRole = !!a.myRole;

                      return (
                        <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden', opacity: past ? 0.65 : 1, border: hasMyRole ? '1.5px solid rgba(14,165,233,0.5)' : '1px solid var(--border)', boxShadow: hasMyRole ? '0 2px 12px rgba(14,165,233,0.1)' : undefined }}>
                          {/* Time */}
                          <div style={{ width: 68, flexShrink: 0, padding: '14px 8px', background: past ? 'var(--surface2)' : hasMyRole ? 'rgba(14,165,233,0.1)' : 'var(--purple-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: hasMyRole ? '#0EA5E9' : past ? 'var(--text-muted)' : 'var(--purple-mid)', fontFamily: 'DM Serif Display,serif', lineHeight: 1 }}>{a.time.slice(0, 5)}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>hrs</div>
                          </div>

                          {/* Content */}
                          <div style={{ padding: '14px 18px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                              <div>
                                <h3 style={{ fontSize: 15, margin: 0 }}>{a.title}</h3>
                                {a.audience !== 'all' && (
                                  <span style={{ fontSize: 10, marginTop: 3, display: 'inline-block', padding: '1px 7px', borderRadius: 5, background: a.audience === 'staff' ? 'rgba(14,165,233,0.15)' : 'rgba(74,222,128,0.15)', color: a.audience === 'staff' ? '#0EA5E9' : 'var(--green-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {a.audience} only
                                  </span>
                                )}
                              </div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: type.bg, color: type.color }}>
                                {type.icon} {a.type}
                              </span>
                            </div>

                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: hasMyRole ? 10 : 6, lineHeight: 1.6 }}>{a.description}</p>

                            {/* Staff: show MY role prominently */}
                            {hasMyRole && (
                              <div style={{ padding: '10px 14px', background: 'rgba(14,165,233,0.1)', borderRadius: 8, border: '1px solid rgba(14,165,233,0.3)', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>◷</span>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9' }}>Your role: {a.myRole.role_label}</div>
                                    {a.myRole.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.myRole.notes}</div>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Show other staff roles (non-personalized for all roles visible) */}
                            {isStaff && !hasMyRole && a.staffRoles.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                {a.staffRoles.map((sr: any) => (
                                  <span key={sr.user_id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                    {sr.firstname} · {sr.role_label}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⌖ {a.location}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
