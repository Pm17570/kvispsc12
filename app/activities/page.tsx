'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';

interface Activity { id: string; title: string; date: string; time: string; location: string; description: string; type: string; }

const TYPE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  Ceremony:    { bg:'rgba(168,85,247,0.15)',  color:'var(--purple-mid)',  icon:'✦' },
  Workshop:    { bg:'rgba(96,165,250,0.15)',   color:'#60A5FA',           icon:'⚙' },
  Exhibition:  { bg:'rgba(244,114,182,0.15)', color:'var(--pink-vivid)', icon:'◈' },
  Competition: { bg:'rgba(251,191,36,0.15)',  color:'#FBBF24',           icon:'◎' },
  Event:       { bg:'rgba(74,222,128,0.15)',  color:'var(--green-mid)',  icon:'◇' },
  Performance: { bg:'rgba(251,146,60,0.15)',  color:'#FB923C',           icon:'♪' },
  Meeting:     { bg:'rgba(20,184,166,0.15)',  color:'#14B8A6',           icon:'◷' },
  Trip:        { bg:'rgba(34,197,94,0.15)',   color:'#22C55E',           icon:'↗' },
};

function fmtFullDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/activities').then(r => r.json()).then(d => setActivities(d.activities ?? []));
  }, []);

  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(filter.toLowerCase()) ||
    a.type.toLowerCase().includes(filter.toLowerCase()) ||
    a.location.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by date (YYYY-MM-DD)
  const grouped: Record<string, Activity[]> = {};
  filtered.forEach(a => {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });
  // Sort dates
  const sortedDates = Object.keys(grouped).sort();

  const isUpcoming = (d: string) => new Date(d) >= new Date(new Date().toDateString());
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>◈ Activities</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>PSC12 activity schedule — grouped by date</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 26 }}>
          {[
            { label: 'Total', value: activities.length, icon: '◫', color: 'var(--purple-mid)' },
            { label: 'Upcoming', value: activities.filter(a => isUpcoming(a.date)).length, icon: '◎', color: 'var(--green-mid)' },
            { label: 'Past', value: activities.filter(a => !isUpcoming(a.date)).length, icon: '✓', color: 'var(--text-muted)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 26, color: s.color }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'DM Serif Display,serif', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 22 }}>
          <input className="input" placeholder="Search activities…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 360 }} />
        </div>

        {sortedDates.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--text-muted)' }}>◫</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No activities found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {sortedDates.map(date => {
              const acts = grouped[date];
              const past = !isUpcoming(date);
              const isToday = date === todayStr;
              return (
                <div key={date}>
                  {/* Date header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                      background: isToday ? 'var(--purple-mid)' : past ? 'var(--surface2)' : 'var(--purple-soft)',
                      color: isToday ? 'white' : past ? 'var(--text-muted)' : 'var(--purple-mid)',
                      border: `1px solid ${isToday ? 'var(--purple-mid)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {isToday && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: 4 }}>TODAY</span>}
                      {fmtFullDate(date)}
                      <span style={{ fontSize: 12, opacity: 0.7 }}>· {acts.length} event{acts.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    {!past && !isToday && (
                      <span style={{ fontSize: 12, color: 'var(--green-mid)', fontWeight: 600 }}>◎ Upcoming</span>
                    )}
                    {past && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✓ Past</span>}
                  </div>

                  {/* Activities for this date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, borderLeft: `2px solid ${isToday ? 'var(--purple-mid)' : past ? 'var(--border)' : 'var(--purple-light)'}` }}>
                    {acts.sort((a, b) => a.time.localeCompare(b.time)).map(a => {
                      const type = TYPE_STYLES[a.type] ?? { bg: 'var(--surface2)', color: 'var(--text-secondary)', icon: '◇' };
                      return (
                        <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden', opacity: past ? 0.65 : 1 }}>
                          {/* Time column */}
                          <div style={{
                            width: 68, flexShrink: 0, padding: '14px 8px',
                            background: past ? 'var(--surface2)' : 'var(--purple-soft)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRight: '1px solid var(--border)',
                          }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: past ? 'var(--text-muted)' : 'var(--purple-mid)', fontFamily: 'DM Serif Display,serif', lineHeight: 1 }}>
                              {a.time.slice(0, 5)}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>hrs</div>
                          </div>

                          {/* Content */}
                          <div style={{ padding: '14px 18px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                              <h3 style={{ fontSize: 15, margin: 0 }}>{a.title}</h3>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: type.bg, color: type.color }}>
                                {type.icon} {a.type}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 7, lineHeight: 1.6 }}>{a.description}</p>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                              <span>⌖ {a.location}</span>
                            </div>
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
