'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface Round { round: number; sessionDate: string; openAt: string; closeAt: string; clubs: any[]; }
interface Activity { id: string; title: string; date: string; time: string; location: string; type: string; myRole: any; audience: string; }

function fmtDT(iso: string) { return new Date(iso).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); }
function fmtSessionDate(d: string) { return new Date(d+'T00:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }); }

export default function DashboardPage() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const promises: Promise<any>[] = [
      fetch(`/api/timetable?userId=${user.id}&role=${user.role}`).then(r=>r.json()),
    ];
    if (user.role === 'student') {
      promises.push(fetch('/api/rounds').then(r=>r.json()));
      promises.push(fetch('/api/clubs?all=1').then(r=>r.json()));
    }
    Promise.all(promises).then(([td, rd, cd]) => {
      const now = new Date().toDateString();
      setUpcomingActivities((td.activities ?? []).filter((a: Activity) => new Date(a.date) >= new Date(now)).slice(0, 5));
      if (rd) { setRounds(rd.rounds ?? []); setCurrentRound(rd.currentRound ?? null); }
      if (cd) setAllClubs(cd.clubs ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const isStaff = user.role === 'staff';
  const isAdmin = user.role === 'admin';
  const isStudent = user.role === 'student';

  const getClubForRound = (round: number) => {
    const clubId = user.selectedClubs?.[round];
    return clubId ? allClubs.find(c => c.id === clubId) ?? null : null;
  };

  const roundStatus = (r: Round) => {
    const now = new Date();
    if (now < new Date(r.openAt)) return 'upcoming';
    if (now > new Date(r.closeAt)) return 'closed';
    return 'open';
  };

  const roleConfig = {
    student: { badge: 'badge-green', label: '✦ Student', color: '#16A34A' },
    staff:   { badge: 'badge-blue',  label: '◷ Staff',   color: '#0EA5E9' },
    admin:   { badge: 'badge-purple',label: '⚙ Admin',   color: '#9333EA' },
  }[user.role];

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>Hello, <span className="gradient-text">{user.nickname}</span> 👋</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:15 }}>Welcome to PSC12 Club Platform</p>
        </div>

        <div className="dash-grid">
          {/* Profile */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ padding:28, textAlign:'center' }}>
              <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
                <img src={user.profilePicture} alt="avatar" style={{ width:88, height:88, borderRadius:'50%', border:'3px solid var(--purple-light)', background:'var(--purple-soft)' }}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:'50%', background:`${roleConfig.color}22`, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--surface)', fontSize:13, color:roleConfig.color, fontWeight:700 }}>
                  {user.role === 'admin' ? '⚙' : user.role === 'staff' ? '◷' : '✦'}
                </div>
              </div>
              <h2 style={{ fontSize:20, marginBottom:2 }}>{user.firstname} {user.surname}</h2>
              <p style={{ color:'var(--purple-mid)', fontSize:14, fontWeight:600, marginBottom:8 }}>"{user.nickname}"</p>
              <span className={`badge ${roleConfig.badge}`} style={{ marginBottom:14 }}>{roleConfig.label}</span>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:14 }}>{user.bio || 'No bio yet.'}</p>
              <div style={{ background:'var(--purple-soft)', borderRadius:10, padding:12, textAlign:'left', marginBottom:14, border:'1px solid var(--border)' }}>
                {[
                  ...(user.studentId ? [{ label:'Student ID', value:user.studentId }] : []),
                  { label:'Email', value:user.email },
                ].map(f=>(
                  <div key={f.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                    <span style={{ color:'var(--text-muted)', fontWeight:500 }}>{f.label}</span>
                    <span style={{ fontWeight:600, maxWidth:160, textAlign:'right', wordBreak:'break-all' }}>{f.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/profile" className="btn-secondary" style={{ width:'100%', justifyContent:'center' }}>✏ Edit Profile</Link>
            </div>

            {/* Student: open round */}
            {isStudent && currentRound && (
              <div className="card" style={{ padding:18, background:'linear-gradient(135deg,rgba(22,163,74,0.08),rgba(22,163,74,0.03))', border:'1px solid rgba(74,222,128,0.3)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green-mid)', boxShadow:'0 0 0 3px rgba(74,222,128,0.2)' }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--green-mid)' }}>Round {currentRound.round} is Open</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>Session: {fmtSessionDate(currentRound.sessionDate)}<br/>Closes: {fmtDT(currentRound.closeAt)}</p>
                <Link href="/club" className="btn-green" style={{ width:'100%', justifyContent:'center', fontSize:13 }}>Register Now →</Link>
              </div>
            )}

            {/* Staff: role reminder */}
            {isStaff && (
              <div className="card" style={{ padding:18, background:'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(14,165,233,0.03))', border:'1px solid rgba(14,165,233,0.25)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0EA5E9', marginBottom:6 }}>◷ Staff Account</div>
                <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>Club registration and treasure hunt are not available for staff.</p>
                <Link href="/timetable" className="btn-secondary" style={{ width:'100%', justifyContent:'center', fontSize:13 }}>View My Timetable</Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            {/* Student: club rounds */}
            {isStudent && !loading && (
              <>
                <h2 style={{ fontSize:22, marginBottom:16 }}>My Club Selections</h2>
                <div className="round-grid" style={{ marginBottom:24 }}>
                  {rounds.map(r => {
                    const club = getClubForRound(r.round);
                    const status = roundStatus(r);
                    const ss = { open:{bg:'linear-gradient(135deg,#16A34A,#22C55E)',color:'white',label:'● OPEN'}, upcoming:{bg:'linear-gradient(135deg,#7C3AED,#9333EA)',color:'white',label:'◎ SOON'}, closed:{bg:'var(--surface2)',color:'var(--text-muted)',label:'✕ CLOSED'} }[status];
                    return (
                      <div key={r.round} className="card" style={{ padding:20, position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, right:0, background:ss.bg, color:ss.color, fontSize:11, fontWeight:700, padding:'5px 14px', borderRadius:'0 16px 0 12px', letterSpacing:0.5 }}>{ss.label}</div>
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Round</div>
                          <div style={{ fontSize:30, fontFamily:'DM Serif Display,serif', color:'var(--purple-mid)', lineHeight:1 }}>{r.round}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{fmtSessionDate(r.sessionDate)}</div>
                        </div>
                        {club ? (
                          <div style={{ padding:'10px 12px', background:'var(--purple-soft)', borderRadius:10, border:'1px solid var(--border)' }}>
                            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{club.name}</div>
                            <span className="badge badge-purple" style={{ fontSize:11 }}>{club.type}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                            {status==='open' && <Link href="/club" style={{ color:'var(--purple-mid)', fontWeight:700, textDecoration:'none' }}>+ Select a Club</Link>}
                            {status==='upcoming' && `Opens ${fmtDT(r.openAt)}`}
                            {status==='closed' && 'No selection made'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* History */}
                {(user.clubHistory?.length ?? 0) > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <h3 style={{ fontSize:18, marginBottom:12 }}>Registration History</h3>
                    <div className="card" style={{ padding:0, overflow:'hidden' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead><tr style={{ background:'var(--purple-soft)' }}>{['Round','Club','Registered At'].map(h=><th key={h} style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'var(--purple-mid)', textAlign:'left' }}>{h}</th>)}</tr></thead>
                        <tbody>{user.clubHistory?.map((h:any,i:number)=>(
                          <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                            <td style={{ padding:'10px 16px', fontSize:13 }}>Round {h.round}</td>
                            <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600 }}>{h.club_name}</td>
                            <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text-muted)' }}>{fmtDT(h.registered_at)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Upcoming activities */}
            <h2 style={{ fontSize:22, marginBottom:14 }}>
              {isStaff ? 'Upcoming Activities' : 'Upcoming Events'}
            </h2>
            {loading ? (
              <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading…</div>
            ) : upcomingActivities.length === 0 ? (
              <div className="card" style={{ padding:24, color:'var(--text-muted)', fontSize:14 }}>No upcoming activities.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {upcomingActivities.map(a => {
                  const hasRole = !!a.myRole;
                  return (
                    <div key={a.id} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:14, border:hasRole?'1.5px solid rgba(14,165,233,0.4)':'1px solid var(--border)', background:hasRole?'rgba(14,165,233,0.04)':'var(--surface)' }}>
                      <div style={{ minWidth:44, textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, fontFamily:'DM Serif Display,serif', color:hasRole?'#0EA5E9':'var(--purple-mid)', lineHeight:1 }}>{new Date(a.date+'T00:00:00').getDate()}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>{new Date(a.date+'T00:00:00').toLocaleDateString('en-GB',{month:'short'})}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{a.title}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{a.time} · {a.location}</div>
                        {hasRole && <div style={{ fontSize:12, color:'#0EA5E9', fontWeight:600, marginTop:4 }}>Your role: {a.myRole.role_label}</div>}
                      </div>
                    </div>
                  );
                })}
                <Link href="/timetable" style={{ fontSize:13, color:'var(--purple-mid)', fontWeight:600, textDecoration:'none', textAlign:'center', padding:'10px 0' }}>View full timetable →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
