'use client';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/ImageUpload';

type Tab = 'users'|'clubs'|'rounds'|'treasure'|'activities'|'config'|'club-logs'|'treasure-logs'|'timetable';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  useEffect(() => { if (user && user.role !== 'admin') router.replace('/dashboard'); }, [user, router]);
  if (!user || user.role !== 'admin') return null;

  const tabs: {key:Tab;label:string;icon:string}[] = [
    {key:'users',label:'Users',icon:'◉'},
    {key:'clubs',label:'Clubs',icon:'◎'},
    {key:'rounds',label:'Rounds',icon:'◷'},
    {key:'treasure',label:'Treasure',icon:'◇'},
    {key:'activities',label:'Activities',icon:'◈'},
    {key:'timetable',label:'Timetable',icon:'▦'},
    {key:'config',label:'Config',icon:'⚙'},
    {key:'club-logs',label:'Club Logs',icon:'◆'},
    {key:'treasure-logs',label:'Hunt Logs',icon:'◈'},
  ];

  return (
    <AuthGuard>
      <div className="animate-fade-in">
        <div style={{marginBottom:24}}><h1 style={{fontSize:34,marginBottom:4}}>⚙ Administration</h1><p style={{color:'var(--text-secondary)',fontSize:15}}>Manage all PSC12 platform data</p></div>
        <div className="admin-tabs">
          {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'9px 14px',border:'none',cursor:'pointer',borderBottom:tab===t.key?'2px solid var(--purple-mid)':'2px solid transparent',background:'none',fontSize:13,fontWeight:600,color:tab===t.key?'var(--purple-mid)':'var(--text-muted)',display:'flex',alignItems:'center',gap:5,marginBottom:-1,transition:'color 0.15s',whiteSpace:'nowrap'}}>{t.icon} {t.label}</button>)}
        </div>
        <div className="animate-fade-in" key={tab}>
          {tab==='users'         && <UsersPanel adminId={user.id}/>}
          {tab==='clubs'         && <ClubsPanel adminId={user.id}/>}
          {tab==='rounds'        && <RoundsPanel/>}
          {tab==='treasure'      && <TreasurePanel/>}
          {tab==='activities'    && <ActivitiesPanel/>}
          {tab==='timetable'     && <TimetablePanel adminId={user.id}/>}
          {tab==='config'        && <ConfigPanel/>}
          {tab==='club-logs'     && <ClubLogsPanel adminId={user.id}/>}
          {tab==='treasure-logs' && <TreasureLogsPanel adminId={user.id}/>}
        </div>
      </div>
    </AuthGuard>
  );
}

function Modal({title,onClose,children,wide}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={onClose}>
      <div className="card animate-fade-in" style={{maxWidth:wide?820:600,width:'100%',padding:28,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:20,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── USERS ──
function UsersPanel({adminId}:{adminId:string}) {
  const [users,setUsers]=useState<any[]>([]);
  const [editing,setEditing]=useState<any>(null);
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState<any>({});
  const [search,setSearch]=useState('');
  const load=useCallback(()=>fetch('/api/users').then(r=>r.json()).then(d=>setUsers(d.users??[])),[]);
  useEffect(()=>{load();},[load]);
  const [showPasswords,setShowPasswords]=useState(false);
  const filtered=users.filter(u=>`${u.firstname} ${u.surname} ${u.email} ${u.nickname} ${u.studentId??''}`.toLowerCase().includes(search.toLowerCase()));
  const blank=()=>({id:`u${Date.now()}`,studentId:'',firstname:'',surname:'',nickname:'',email:'',role:'student',bio:'',password:'pass123',profilePicture:`https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`});
  const save=async()=>{
    if(creating) await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    else await fetch('/api/users',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    setEditing(null);setCreating(false);load();
  };
  const del=async(id:string)=>{if(!confirm('Delete?'))return;await fetch(`/api/users?id=${id}`,{method:'DELETE'});load();};
  const roleColor=(r:string)=>r==='admin'?'badge-purple':r==='staff'?'badge-blue':'badge-green';
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:10}}>
        <input className="input" placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:280}}/>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowPasswords(p=>!p)} className="btn-secondary" style={{fontSize:13,padding:'8px 14px'}}>{showPasswords?'🙈 Hide Passwords':'👁 Show Passwords'}</button>
          <button onClick={()=>{setCreating(true);setEditing(null);setForm(blank());}} className="btn-primary">+ Add User</button>
        </div>
      </div>
      <div className="card table-wrap" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--purple-soft)'}}>{['Avatar','Name','Email','Role',...(showPasswords?['Password']:[]),'Actions'].map(h=><th key={h} style={{padding:'11px 14px',fontSize:12,fontWeight:700,color:'var(--purple-mid)',textAlign:'left'}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((u,i)=>(
            <tr key={u.id} style={{borderTop:'1px solid var(--border)',background:i%2===0?'var(--surface)':'var(--surface2)'}}>
              <td style={{padding:'10px 14px'}}><img src={u.profilePicture} style={{width:34,height:34,borderRadius:'50%',background:'var(--purple-light)'}}/></td>
              <td style={{padding:'10px 14px'}}><div style={{fontWeight:700,fontSize:14}}>{u.firstname} {u.surname}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{u.nickname}{u.studentId?` · #${u.studentId}`:''} · {u.id}</div></td>
              <td style={{padding:'10px 14px',fontSize:13}}>{u.email}</td>
              <td style={{padding:'10px 14px'}}><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
              {showPasswords&&<td style={{padding:'10px 14px'}}><code style={{fontSize:12,padding:'3px 8px',background:'var(--purple-soft)',borderRadius:6,color:'var(--purple-mid)',border:'1px solid var(--border)',fontFamily:'monospace'}}>{u.password??'—'}</code></td>}
              <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:6}}><button onClick={()=>{setEditing(u);setForm({...u});setCreating(false);}} className="btn-secondary" style={{padding:'5px 10px',fontSize:12}}>✏</button><button onClick={()=>del(u.id)} className="btn-danger" style={{padding:'5px 10px',fontSize:12}}>✕</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {(editing||creating)&&(
        <Modal title={creating?'Add User':'Edit User'} onClose={()=>{setEditing(null);setCreating(false);}}>
          {!creating&&editing&&(
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:16,background:'var(--purple-soft)',borderRadius:12,border:'1px solid var(--border)'}}>
              <ImageUpload currentUrl={form.profilePicture??''} type="user" id={form.id} size={64} shape="circle" onUploaded={url=>{setForm({...form,profilePicture:url});load();}}/>
              <div><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Profile Picture</div><div style={{fontSize:12,color:'var(--text-muted)'}}>Click to upload. Max 5MB.</div></div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            {[{key:'id',label:'System ID'},{key:'studentId',label:'Student ID (optional)'},{key:'firstname',label:'First Name'},{key:'surname',label:'Surname'},{key:'nickname',label:'Nickname'},{key:'email',label:'Email',type:'email'},{key:'password',label:'Password'}].map(f=>(
              <div key={f.key}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>{f.label}</label><input className="input" type={f.type??'text'} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{fontSize:13}}/></div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Role</label>
            <select className="input" value={form.role??'student'} onChange={e=>setForm({...form,role:e.target.value})} style={{fontSize:13}}>
              <option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option>
            </select>
          </div>
          <div style={{marginBottom:16}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Bio</label><textarea className="input" value={form.bio??''} onChange={e=>setForm({...form,bio:e.target.value})} rows={2} style={{fontSize:13,resize:'vertical'}}/></div>
          <button onClick={save} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>◈ Save</button>
        </Modal>
      )}
    </div>
  );
}

// ── CLUBS ──
function ClubsPanel({adminId}:{adminId:string}) {
  const [clubs,setClubs]=useState<any[]>([]);
  const [editing,setEditing]=useState<any>(null);
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState<any>({});
  const [selectedRounds,setSelectedRounds]=useState<number[]>([]);
  const [clubTypes,setClubTypes]=useState<string[]>([]);
  const [orgModal,setOrgModal]=useState<any>(null);
  const [allStaff,setAllStaff]=useState<any[]>([]);
  const [organizers,setOrganizers]=useState<any[]>([]);
  const [orgForm,setOrgForm]=useState({userId:'',roleLabel:'Organizer'});

  const load=useCallback(()=>fetch('/api/clubs?all=1').then(r=>r.json()).then(d=>setClubs(d.clubs??[])),[]);
  useEffect(()=>{load();fetch('/api/config').then(r=>r.json()).then(d=>setClubTypes(d.clubTypes??[]));fetch('/api/users').then(r=>r.json()).then(d=>setAllStaff((d.users??[]).filter((u:any)=>u.role==='staff'||u.role==='admin')));},[load]);

  const getRoundsForClub=async(clubId:string)=>{const data=await fetch('/api/rounds').then(r=>r.json());return(data.rounds??[]).filter((r:any)=>r.clubs?.some((c:any)=>c.id===clubId)).map((r:any)=>r.round);};
  const openEdit=async(c:any)=>{setEditing(c);setCreating(false);setForm({...c});const rounds=await getRoundsForClub(c.id);setSelectedRounds(rounds);};
  const openOrgModal=async(c:any)=>{setOrgModal(c);const data=await fetch(`/api/admin?type=organizers&clubId=${c.id}`).then(r=>r.json());setOrganizers(data.organizers??[]);};
  const save=async()=>{const payload={...form,rounds:selectedRounds};if(creating)await fetch('/api/clubs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});else await fetch('/api/clubs',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});setEditing(null);setCreating(false);load();};
  const del=async(id:string)=>{if(!confirm('Delete this club?'))return;await fetch(`/api/clubs?id=${id}`,{method:'DELETE'});load();};
  const toggleRound=(r:number)=>setSelectedRounds(prev=>prev.includes(r)?prev.filter(x=>x!==r):[...prev,r].sort());
  const addOrg=async()=>{if(!orgForm.userId)return;await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'set-organizer',clubId:orgModal.id,...orgForm})});const data=await fetch(`/api/admin?type=organizers&clubId=${orgModal.id}`).then(r=>r.json());setOrganizers(data.organizers??[]);};
  const removeOrg=async(userId:string)=>{await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove-organizer',clubId:orgModal.id,userId})});const data=await fetch(`/api/admin?type=organizers&clubId=${orgModal.id}`).then(r=>r.json());setOrganizers(data.organizers??[]);};

  return(
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button onClick={()=>{setCreating(true);setEditing(null);setForm({name:'',description:'',type:clubTypes[0]??'STEM',capacity:20,imageUrl:'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80'});setSelectedRounds([]);}} className="btn-primary">+ Add Club</button>
      </div>
      <div className="club-grid">
        {clubs.map(c=>(
          <div key={c.id} className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{position:'relative'}}><img src={c.imageUrl} alt={c.name} style={{width:'100%',height:110,objectFit:'cover',display:'block'}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.5),transparent)'}}/><span className="badge badge-purple" style={{position:'absolute',bottom:8,left:10,fontSize:11}}>{c.type}</span></div>
            <div style={{padding:14}}>
              <h3 style={{fontSize:15,margin:'0 0 4px'}}>{c.name}</h3>
              <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8,lineHeight:1.5}}>{c.description?.slice(0,70)}…</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                <button onClick={()=>openEdit(c)} className="btn-secondary" style={{flex:1,justifyContent:'center',fontSize:12,padding:'6px'}}>✏ Edit</button>
                <button onClick={()=>openOrgModal(c)} className="btn-secondary" style={{flex:1,justifyContent:'center',fontSize:12,padding:'6px'}}>◷ Organizers</button>
                <button onClick={()=>del(c.id)} className="btn-danger" style={{flex:1,justifyContent:'center',fontSize:12,padding:'6px'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(editing||creating)&&(
        <Modal title={creating?'Add Club':'Edit Club'} onClose={()=>{setEditing(null);setCreating(false);}}>
          {!creating&&editing&&(<div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16,padding:14,background:'var(--purple-soft)',borderRadius:12,border:'1px solid var(--border)'}}><ImageUpload currentUrl={form.imageUrl??''} type="club" id={form.id} size={72} shape="rect" onUploaded={url=>{setForm({...form,imageUrl:url});load();}}/><div><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Club Image</div><div style={{fontSize:12,color:'var(--text-muted)'}}>Click to upload. Max 5MB.</div></div></div>)}
          <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Club Name</label><input className="input" value={form.name??''} onChange={e=>setForm({...form,name:e.target.value})} style={{fontSize:13}}/></div>
          <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Description</label><textarea className="input" value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{fontSize:13,resize:'vertical'}}/></div>
          {creating&&(<div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Image URL</label><input className="input" value={form.imageUrl??''} onChange={e=>setForm({...form,imageUrl:e.target.value})} style={{fontSize:13}}/></div>)}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Type</label><select className="input" value={form.type??'STEM'} onChange={e=>setForm({...form,type:e.target.value})} style={{fontSize:13}}>{clubTypes.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Capacity</label><input className="input" type="number" value={form.capacity??20} onChange={e=>setForm({...form,capacity:Number(e.target.value)})} style={{fontSize:13}}/></div>
          </div>
          <div style={{marginBottom:18}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>Assign to Rounds</label><div style={{display:'flex',gap:8}}>{[1,2,3,4].map(r=>{const active=selectedRounds.includes(r);return<button key={r} type="button" onClick={()=>toggleRound(r)} style={{padding:'8px 20px',borderRadius:9,fontWeight:700,fontSize:14,border:`2px solid ${active?'var(--purple-mid)':'var(--border)'}`,background:active?'var(--purple-mid)':'var(--surface2)',color:active?'white':'var(--text-secondary)',cursor:'pointer',transition:'all 0.15s'}}>R{r}</button>;})} </div></div>
          <button onClick={save} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>◈ Save</button>
        </Modal>
      )}

      {orgModal&&(
        <Modal title={`Organizers — ${orgModal.name}`} onClose={()=>setOrgModal(null)}>
          <div style={{marginBottom:16}}>
            {organizers.length===0?<p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>No organizers assigned yet.</p>:(
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {organizers.map((o:any)=>(
                  <div key={o.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--purple-soft)',borderRadius:10,border:'1px solid var(--border)'}}>
                    <img src={o.profile_picture} style={{width:32,height:32,borderRadius:'50%',background:'var(--purple-light)'}}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{o.firstname} {o.surname}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{o.role_label}</div></div>
                    <button onClick={()=>removeOrg(o.user_id)} className="btn-danger" style={{padding:'4px 10px',fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
            <p style={{fontSize:13,fontWeight:600,color:'var(--text-secondary)',marginBottom:10}}>Add Organizer</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:4}}>Staff Member</label><select className="input" value={orgForm.userId} onChange={e=>setOrgForm({...orgForm,userId:e.target.value})} style={{fontSize:13}}><option value="">Select…</option>{allStaff.map((s:any)=><option key={s.id} value={s.id}>{s.firstname} {s.surname} ({s.role})</option>)}</select></div>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:4}}>Role Label</label><input className="input" value={orgForm.roleLabel} onChange={e=>setOrgForm({...orgForm,roleLabel:e.target.value})} style={{fontSize:13}} placeholder="e.g. Faculty Advisor"/></div>
            </div>
            <button onClick={addOrg} disabled={!orgForm.userId} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>+ Add Organizer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── ROUNDS ──
function RoundsPanel() {
  const [rounds,setRounds]=useState<any[]>([]);
  const [forms,setForms]=useState<Record<number,any>>({});
  const [saved,setSaved]=useState<number|null>(null);
  useEffect(()=>{fetch('/api/rounds').then(r=>r.json()).then(d=>{setRounds(d.rounds??[]);const f:Record<number,any>={};(d.rounds??[]).forEach((r:any)=>{f[r.round]={...r};});setForms(f);});},[]);
  const save=async(round:number)=>{const r=forms[round];await fetch('/api/rounds',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({round,openAt:r.openAt,closeAt:r.closeAt,sessionDate:r.sessionDate})});setSaved(round);setTimeout(()=>setSaved(null),2000);};
  const toLocal=(iso:string)=>{const d=new Date(iso);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  const now=new Date();
  const getStatus=(r:any)=>{if(now<new Date(r.openAt))return{label:'◎ Upcoming',color:'var(--purple-mid)'};if(now>new Date(r.closeAt))return{label:'✕ Closed',color:'var(--text-muted)'};return{label:'● Open',color:'var(--green-mid)'};};
  return(
    <div className="admin-round-grid">
      {rounds.map(r=>{const f=forms[r.round];if(!f)return null;const s=getStatus(r);return(
        <div key={r.round} className="card" style={{padding:22}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div><div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Round</div><div style={{fontSize:30,fontFamily:'DM Serif Display,serif',color:'var(--purple-mid)',lineHeight:1}}>{r.round}</div></div><span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.label}</span></div>
          {[{label:'Session Date',type:'date',key:'sessionDate',val:f.sessionDate??''},{label:'Registration Opens',type:'datetime-local',key:'openAt',val:toLocal(f.openAt)},{label:'Registration Closes',type:'datetime-local',key:'closeAt',val:toLocal(f.closeAt)}].map(field=>(
            <div key={field.key} style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>{field.label}</label><input className="input" type={field.type} value={field.val} onChange={e=>{const v=field.type==='date'?e.target.value:new Date(e.target.value).toISOString();setForms(p=>({...p,[r.round]:{...f,[field.key]:v}}));}} style={{fontSize:13}}/></div>
          ))}
          <div style={{marginBottom:14}}><p style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:6}}>Clubs in this round:</p><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{(r.clubs??[]).map((c:any)=><span key={c.id} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'var(--purple-soft)',color:'var(--purple-mid)',fontWeight:600}}>{c.name}</span>)}</div></div>
          <button onClick={()=>save(r.round)} className={saved===r.round?'btn-green':'btn-primary'} style={{width:'100%',justifyContent:'center'}}>{saved===r.round?'✓ Saved!':'◈ Save'}</button>
        </div>
      );})}
    </div>
  );
}

// ── TREASURE ──
function TreasurePanel() {
  const [forms,setForms]=useState<Record<number,string>>({});
  const [saved,setSaved]=useState(false);
  useEffect(()=>{fetch('/api/treasure?admin=1').then(r=>r.json()).then(d=>{const f:Record<number,string>={};(d.answers??[]).forEach((a:any)=>{f[a.slot]=a.answer;});setForms(f);});},[]);
  const save=async()=>{const answers=Array.from({length:12},(_,i)=>({slot:i,answer:forms[i]??''}));await fetch('/api/treasure',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})});setSaved(true);setTimeout(()=>setSaved(false),2500);};
  return(
    <div>
      <div style={{marginBottom:16,padding:'12px 16px',background:'rgba(251,146,60,0.1)',borderRadius:10,border:'1px solid rgba(251,146,60,0.3)',fontSize:13,color:'#FB923C'}}>⚠ Editing answers re-validates all user locked answers.</div>
      <div className="treasure-grid" style={{marginBottom:22}}>
        {Array.from({length:12},(_,i)=>(
          <div key={i} style={{padding:14,background:'var(--surface)',borderRadius:12,border:'1.5px solid var(--border)'}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--purple-mid)',marginBottom:6}}>Clue #{i+1}</label>
            <input className="input" value={forms[i]??''} onChange={e=>setForms(p=>({...p,[i]:e.target.value}))} placeholder="Answer…" style={{fontSize:13}}/>
          </div>
        ))}
      </div>
      <button onClick={save} className={saved?'btn-green':'btn-primary'} style={{padding:'12px 32px',fontSize:15}}>{saved?'✓ Saved!':'◈ Save Answers'}</button>
    </div>
  );
}

// ── ACTIVITIES ──
function ActivitiesPanel() {
  const [activities,setActivities]=useState<any[]>([]);
  const [editing,setEditing]=useState<any>(null);
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState<any>({});
  const [activityTypes,setActivityTypes]=useState<string[]>([]);
  const load=useCallback(()=>fetch('/api/activities').then(r=>r.json()).then(d=>setActivities(d.activities??[])),[]);
  useEffect(()=>{load();fetch('/api/config').then(r=>r.json()).then(d=>setActivityTypes(d.activityTypes??[]));},[load]);
  const save=async()=>{if(creating)await fetch('/api/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});else await fetch('/api/activities',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setEditing(null);setCreating(false);load();};
  const del=async(id:string)=>{if(!confirm('Delete?'))return;await fetch(`/api/activities?id=${id}`,{method:'DELETE'});load();};
  return(
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><button onClick={()=>{setCreating(true);setEditing(null);setForm({title:'',date:'',time:'09:00',location:'',description:'',type:activityTypes[0]??'Event'});}} className="btn-primary">+ Add Activity</button></div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--purple-soft)'}}>{['Date','Title','Location','Type','Actions'].map(h=><th key={h} style={{padding:'11px 14px',fontSize:12,fontWeight:700,color:'var(--purple-mid)',textAlign:'left'}}>{h}</th>)}</tr></thead>
          <tbody>{activities.map((a,i)=>(
            <tr key={a.id} style={{borderTop:'1px solid var(--border)',background:i%2===0?'var(--surface)':'var(--surface2)'}}>
              <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{new Date(a.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}<div style={{fontSize:11,color:'var(--text-muted)'}}>{a.time}</div></td>
              <td style={{padding:'10px 14px'}}><div style={{fontWeight:700,fontSize:14}}>{a.title}</div><div style={{fontSize:12,color:'var(--text-muted)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.description}</div></td>
              <td style={{padding:'10px 14px',fontSize:13}}>{a.location}</td>
              <td style={{padding:'10px 14px'}}><span className="badge badge-purple" style={{fontSize:11}}>{a.type}</span></td>
              <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:6}}><button onClick={()=>{setEditing(a);setForm({...a});setCreating(false);}} className="btn-secondary" style={{padding:'5px 10px',fontSize:12}}>✏</button><button onClick={()=>del(a.id)} className="btn-danger" style={{padding:'5px 10px',fontSize:12}}>✕</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {(editing||creating)&&(
        <Modal title={creating?'Add Activity':'Edit Activity'} onClose={()=>{setEditing(null);setCreating(false);}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div style={{gridColumn:'1/-1'}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Title</label><input className="input" value={form.title??''} onChange={e=>setForm({...form,title:e.target.value})} style={{fontSize:13}}/></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Date</label><input className="input" type="date" value={form.date??''} onChange={e=>setForm({...form,date:e.target.value})} style={{fontSize:13}}/></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Time</label><input className="input" type="time" value={form.time??''} onChange={e=>setForm({...form,time:e.target.value})} style={{fontSize:13}}/></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Location</label><input className="input" value={form.location??''} onChange={e=>setForm({...form,location:e.target.value})} style={{fontSize:13}}/></div>
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Type</label><select className="input" value={form.type??'Event'} onChange={e=>setForm({...form,type:e.target.value})} style={{fontSize:13}}>{activityTypes.map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:4}}>Description</label><textarea className="input" value={form.description??''} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{fontSize:13,resize:'vertical'}}/></div>
          </div>
          <button onClick={save} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>◈ Save</button>
        </Modal>
      )}
    </div>
  );
}

// ── TIMETABLE CONFIG ──
function TimetablePanel({adminId}:{adminId:string}) {
  const [mode,setMode]=useState<'configure'|'preview'>('configure');
  const [activities,setActivities]=useState<any[]>([]);
  const [previewActivities,setPreviewActivities]=useState<any[]>([]);
  const [editing,setEditing]=useState<any>(null);
  const [staffRoles,setStaffRoles]=useState<any[]>([]);
  const [allStaff,setAllStaff]=useState<any[]>([]);
  const [allUsers,setAllUsers]=useState<any[]>([]);
  const [saved,setSaved]=useState('');
  // Preview controls
  const [previewRole,setPreviewRole]=useState<'student'|'staff'>('student');
  const [previewUserId,setPreviewUserId]=useState('');

  const load=useCallback(()=>fetch('/api/timetable?adminAll=1').then(r=>r.json()).then(d=>setActivities(d.activities??[])),[]);
  const loadPreview=useCallback(()=>{
    const params=new URLSearchParams({role:previewRole});
    if(previewUserId) { params.set('userId',previewUserId); params.set('viewAsUserId',previewUserId); params.set('viewAsRole',previewRole); }
    fetch(`/api/timetable?${params}`).then(r=>r.json()).then(d=>setPreviewActivities(d.activities??[]));
  },[previewRole,previewUserId]);

  useEffect(()=>{
    load();
    fetch('/api/users').then(r=>r.json()).then(d=>{
      const users=d.users??[];
      setAllStaff(users.filter((u:any)=>u.role==='staff'||u.role==='admin'));
      setAllUsers(users);
    });
  },[load]);
  useEffect(()=>{ if(mode==='preview') loadPreview(); },[mode,loadPreview]);

  const openEdit=(a:any)=>{setEditing(a);setStaffRoles(a.staffRoles?.map((sr:any)=>({user_id:sr.user_id,role_label:sr.role_label,notes:sr.notes??''}))??[]);};
  const save=async()=>{await fetch('/api/timetable',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({activityId:editing.id,audience:editing.audience,staffRoles})});setSaved(editing.id);setTimeout(()=>setSaved(''),2000);load();setEditing(null);};
  const addRole=()=>setStaffRoles(p=>[...p,{user_id:'',role_label:'',notes:''}]);
  const removeRole=(i:number)=>setStaffRoles(p=>p.filter((_,idx)=>idx!==i));
  const updateRole=(i:number,k:string,v:string)=>setStaffRoles(p=>p.map((r,idx)=>idx===i?{...r,[k]:v}:r));

  const AUDIENCE_OPTIONS=[
    {value:'all',label:'Everyone',desc:'Visible to all students and staff'},
    {value:'student',label:'Students only',desc:'Only students can see this'},
    {value:'staff',label:'Staff only',desc:'Only staff and admin can see this'},
  ];

  const audienceColor=(a:string)=>a==='all'?'var(--green-mid)':a==='student'?'var(--purple-mid)':'#0EA5E9';

  const TYPE_STYLES:Record<string,{bg:string;color:string;icon:string}>={
    Ceremony:{bg:'rgba(168,85,247,0.15)',color:'var(--purple-mid)',icon:'✦'},
    Workshop:{bg:'rgba(96,165,250,0.15)',color:'#60A5FA',icon:'⚙'},
    Exhibition:{bg:'rgba(244,114,182,0.15)',color:'var(--pink-vivid)',icon:'◈'},
    Competition:{bg:'rgba(251,191,36,0.15)',color:'#FBBF24',icon:'◎'},
    Event:{bg:'rgba(74,222,128,0.15)',color:'var(--green-mid)',icon:'◇'},
    Performance:{bg:'rgba(251,146,60,0.15)',color:'#FB923C',icon:'♪'},
    Meeting:{bg:'rgba(20,184,166,0.15)',color:'#14B8A6',icon:'◷'},
    Trip:{bg:'rgba(34,197,94,0.15)',color:'#22C55E',icon:'↗'},
  };

  // Group helpers
  const groupByDate=(acts:any[])=>{const g:Record<string,any[]>={};acts.forEach(a=>{if(!g[a.date])g[a.date]=[];g[a.date].push(a);});return g;};
  const configGrouped=groupByDate(activities);
  const previewGrouped=groupByDate(previewActivities);
  const configDates=Object.keys(configGrouped).sort();
  const previewDates=Object.keys(previewGrouped).sort();

  // Filter users for preview selector
  const previewableUsers=allUsers.filter(u=>previewRole==='student'?u.role==='student':u.role==='staff');

  return(
    <div>
      {/* Mode tabs */}
      <div style={{display:'flex',gap:2,marginBottom:20,background:'var(--surface2)',borderRadius:10,padding:3,border:'1px solid var(--border)',width:'fit-content'}}>
        <button onClick={()=>setMode('configure')} style={{padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:mode==='configure'?'var(--purple-mid)':'transparent',color:mode==='configure'?'white':'var(--text-secondary)',transition:'all 0.15s'}}>⚙ Configure</button>
        <button onClick={()=>{setMode('preview');loadPreview();}} style={{padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:mode==='preview'?'var(--purple-mid)':'transparent',color:mode==='preview'?'white':'var(--text-secondary)',transition:'all 0.15s'}}>👁 Preview As</button>
      </div>

      {/* CONFIGURE MODE */}
      {mode==='configure'&&(
      <div>
      <div style={{marginBottom:18,padding:'12px 16px',background:'rgba(14,165,233,0.08)',borderRadius:10,border:'1px solid rgba(14,165,233,0.25)',fontSize:13,color:'#0EA5E9'}}>
        ◷ Configure who can see each activity and assign staff roles. Admin can always see everything.
      </div>

      {configDates.map(date=>{
        const acts=configGrouped[date];
        return(
          <div key={date} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--purple-mid)',padding:'4px 12px',background:'var(--purple-soft)',borderRadius:8,border:'1px solid var(--border)'}}>
                {new Date(date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
              </div>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {acts.sort((a,b)=>a.time.localeCompare(b.time)).map((a:any)=>(
                <div key={a.id} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--purple-mid)',fontFamily:'DM Serif Display,serif',minWidth:44,textAlign:'center'}}>{a.time.slice(0,5)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{a.title}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontSize:12,padding:'2px 9px',borderRadius:20,fontWeight:700,background:`${audienceColor(a.audience)}22`,color:audienceColor(a.audience)}}>{a.audience==='all'?'Everyone':a.audience==='student'?'Students only':'Staff only'}</span>
                      {a.staffRoles?.length>0&&<span style={{fontSize:12,color:'var(--text-muted)'}}>{a.staffRoles.length} staff role{a.staffRoles.length>1?'s':''}</span>}
                    </div>
                  </div>
                  <button onClick={()=>openEdit(a)} className="btn-secondary" style={{padding:'6px 14px',fontSize:12}}>
                    {saved===a.id?'✓ Saved':'✏ Configure'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
      )}

      {/* PREVIEW MODE */}
      {mode==='preview'&&(
      <div>
        {/* Role + user selector */}
        <div className="card" style={{padding:20,marginBottom:20}}>
          <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>View as role</div>
              <div style={{display:'flex',gap:8}}>
                {(['student','staff'] as const).map(r=>(
                  <button key={r} onClick={()=>{setPreviewRole(r);setPreviewUserId('');}} style={{padding:'7px 16px',borderRadius:8,fontWeight:700,fontSize:13,border:`2px solid ${previewRole===r?'var(--purple-mid)':'var(--border)'}`,background:previewRole===r?'var(--purple-soft)':'var(--surface2)',color:previewRole===r?'var(--purple-mid)':'var(--text-secondary)',cursor:'pointer',textTransform:'capitalize'}}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>Specific person (optional — shows their individual role assignments)</div>
              <select className="input" value={previewUserId} onChange={e=>{setPreviewUserId(e.target.value);}} style={{fontSize:13}}>
                <option value="">— Generic {previewRole} view —</option>
                {previewableUsers.map((u:any)=><option key={u.id} value={u.id}>{u.firstname} {u.surname} ({u.nickname})</option>)}
              </select>
            </div>
            <button onClick={loadPreview} className="btn-primary" style={{alignSelf:'flex-end',padding:'9px 18px',fontSize:13}}>Refresh Preview</button>
          </div>
          {previewUserId&&(
            <div style={{marginTop:12,padding:'8px 12px',background:'rgba(14,165,233,0.08)',borderRadius:8,border:'1px solid rgba(14,165,233,0.25)',fontSize:13,color:'#0EA5E9'}}>
              ◷ Showing personalised view for {previewableUsers.find(u=>u.id===previewUserId)?.firstname} — highlighted activities have their assigned role.
            </div>
          )}
        </div>

        {/* Preview timetable */}
        {previewDates.length===0?(
          <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>No activities visible for this view.</div>
        ):previewDates.map(date=>{
          const acts=previewGrouped[date];
          const today=new Date().toISOString().slice(0,10);
          return(
            <div key={date} style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{padding:'6px 14px',borderRadius:10,fontWeight:700,fontSize:14,background:date===today?'var(--purple-mid)':'var(--purple-soft)',color:date===today?'white':'var(--purple-mid)',border:`1px solid var(--border)`}}>
                  {date===today&&<span style={{fontSize:10,background:'rgba(255,255,255,0.3)',padding:'1px 6px',borderRadius:4,marginRight:6}}>TODAY</span>}
                  {new Date(date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
                </div>
                <div style={{flex:1,height:1,background:'var(--border)'}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,paddingLeft:14,borderLeft:'2px solid var(--purple-light)'}}>
                {acts.sort((a:any,b:any)=>a.time.localeCompare(b.time)).map((a:any)=>{
                  const hasMyRole=!!a.myRole;
                  const type=TYPE_STYLES[a.type]??{bg:'var(--surface2)',color:'var(--text-secondary)',icon:'◇'};
                  return(
                    <div key={a.id} className="card" style={{display:'flex',alignItems:'stretch',overflow:'hidden',border:hasMyRole?'1.5px solid rgba(14,165,233,0.5)':'1px solid var(--border)',background:hasMyRole?'rgba(14,165,233,0.03)':'var(--surface)'}}>
                      <div style={{width:64,flexShrink:0,padding:'12px 8px',background:hasMyRole?'rgba(14,165,233,0.1)':'var(--purple-soft)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRight:'1px solid var(--border)'}}>
                        <div style={{fontSize:17,fontWeight:800,color:hasMyRole?'#0EA5E9':'var(--purple-mid)',fontFamily:'DM Serif Display,serif',lineHeight:1}}>{a.time.slice(0,5)}</div>
                      </div>
                      <div style={{padding:'12px 16px',flex:1}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:4}}>
                          <div style={{fontWeight:700,fontSize:14}}>{a.title}</div>
                          <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap',background:type.bg,color:type.color}}>{type.icon} {a.type}</span>
                        </div>
                        <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:hasMyRole?8:4}}>{a.description}</div>
                        {hasMyRole&&(
                          <div style={{padding:'8px 12px',background:'rgba(14,165,233,0.1)',borderRadius:8,border:'1px solid rgba(14,165,233,0.3)'}}>
                            <div style={{fontSize:12,fontWeight:700,color:'#0EA5E9'}}>◷ Role: {a.myRole.role_label}</div>
                            {a.myRole.notes&&<div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>{a.myRole.notes}</div>}
                          </div>
                        )}
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>⌖ {a.location}</div>
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

      {editing&&(
        <Modal title={`Configure: ${editing.title}`} wide onClose={()=>setEditing(null)}>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:13,fontWeight:700,color:'var(--text-secondary)',marginBottom:10}}>Who can see this activity?</label>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {AUDIENCE_OPTIONS.map(opt=>(
                <label key={opt.value} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,border:`2px solid ${editing.audience===opt.value?audienceColor(opt.value):'var(--border)'}`,background:editing.audience===opt.value?`${audienceColor(opt.value)}10`:'var(--surface)',cursor:'pointer',transition:'all 0.15s'}} onClick={()=>setEditing({...editing,audience:opt.value})}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${audienceColor(opt.value)}`,display:'flex',alignItems:'center',justifyContent:'center'}}>{editing.audience===opt.value&&<div style={{width:10,height:10,borderRadius:'50%',background:audienceColor(opt.value)}}/>}</div>
                  <div><div style={{fontSize:14,fontWeight:600}}>{opt.label}</div><div style={{fontSize:12,color:'var(--text-secondary)'}}>{opt.desc}</div></div>
                </label>
              ))}
            </div>
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:20,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:700,color:'var(--text-secondary)'}}>Staff Role Assignments</label>
              <button onClick={addRole} className="btn-secondary" style={{padding:'5px 12px',fontSize:12}}>+ Add Role</button>
            </div>
            {staffRoles.length===0?<p style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>No staff roles assigned.</p>:(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {staffRoles.map((sr:any,i:number)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'center',padding:'10px 12px',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)'}}>
                    <select className="input" value={sr.user_id} onChange={e=>updateRole(i,'user_id',e.target.value)} style={{fontSize:12}}>
                      <option value="">Select staff…</option>
                      {allStaff.map((s:any)=><option key={s.id} value={s.id}>{s.firstname} {s.surname}</option>)}
                    </select>
                    <input className="input" value={sr.role_label} onChange={e=>updateRole(i,'role_label',e.target.value)} placeholder="Role…" style={{fontSize:12}}/>
                    <input className="input" value={sr.notes} onChange={e=>updateRole(i,'notes',e.target.value)} placeholder="Notes…" style={{fontSize:12}}/>
                    <button onClick={()=>removeRole(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#F87171',fontSize:18,padding:'0 4px'}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={save} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>◈ Save Configuration</button>
        </Modal>
      )}
    </div>
  );
}

// ── CONFIG ──
function ConfigPanel() {
  const [activityTypes,setActivityTypes]=useState<string[]>([]);
  const [clubTypes,setClubTypes]=useState<string[]>([]);
  const [newActivity,setNewActivity]=useState('');
  const [newClub,setNewClub]=useState('');
  const load=useCallback(()=>{fetch('/api/config').then(r=>r.json()).then(d=>{setActivityTypes(d.activityTypes??[]);setClubTypes(d.clubTypes??[]);});},[]);
  useEffect(()=>{load();},[load]);
  const addType=async(table:string,name:string,clear:()=>void)=>{if(!name.trim())return;await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table,name:name.trim()})});clear();load();};
  const delType=async(table:string,name:string)=>{await fetch(`/api/config?table=${table}&name=${encodeURIComponent(name)}`,{method:'DELETE'});load();};
  const TypeList=({title,items,table,newVal,setNew}:any)=>(
    <div className="card" style={{padding:24}}>
      <h3 style={{fontSize:18,marginBottom:4}}>{title}</h3>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>These types appear in all dropdowns across the platform.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
        {items.map((t:string)=>(
          <div key={t} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'var(--purple-soft)',borderRadius:8,border:'1px solid var(--border)'}}>
            <span style={{fontSize:13,fontWeight:600}}>{t}</span>
            <button onClick={()=>delType(table,t)} style={{background:'none',border:'none',cursor:'pointer',color:'#F87171',fontSize:14,lineHeight:1,padding:0}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input className="input" value={newVal} onChange={e=>setNew(e.target.value)} placeholder="New type name…" style={{fontSize:13}} onKeyDown={e=>{if(e.key==='Enter')addType(table,newVal,()=>setNew(''));}}/>
        <button onClick={()=>addType(table,newVal,()=>setNew(''))} className="btn-primary" style={{whiteSpace:'nowrap'}}>+ Add</button>
      </div>
    </div>
  );
  return(<div style={{display:'flex',flexDirection:'column',gap:20}}><TypeList title="Activity Types" items={activityTypes} table="config_activity_types" newVal={newActivity} setNew={setNewActivity}/><TypeList title="Club Types" items={clubTypes} table="config_club_types" newVal={newClub} setNew={setNewClub}/></div>);
}

// ── CLUB LOGS ──
function ClubLogsPanel({adminId}:{adminId:string}) {
  const [activeTab,setActiveTab]=useState<'log'|'summary'>('summary');
  const [round,setRound]=useState(1);
  const [rounds,setRounds]=useState<any[]>([]);
  const [logs,setLogs]=useState<any[]>([]);
  const [summary,setSummary]=useState<any[]>([]);
  const [allUsers,setAllUsers]=useState<any[]>([]);
  const [assignModal,setAssignModal]=useState<any>(null);
  const [assignUserId,setAssignUserId]=useState('');
  const [assignMsg,setAssignMsg]=useState('');

  useEffect(()=>{fetch('/api/rounds').then(r=>r.json()).then(d=>setRounds(d.rounds??[]));fetch('/api/users').then(r=>r.json()).then(d=>setAllUsers(d.users??[]));fetch('/api/admin?type=club-log').then(r=>r.json()).then(d=>setLogs(d.logs??[]));}, []);
  const loadSummary=useCallback(()=>{fetch(`/api/admin?type=club-summary&round=${round}`).then(r=>r.json()).then(d=>setSummary(d.clubs??[]));}, [round]);
  useEffect(()=>{loadSummary();},[loadSummary]);

  const remove=async(userId:string,roundNum:number)=>{if(!confirm('Remove from club?'))return;await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove-club',userId,round:roundNum,adminId})});loadSummary();fetch('/api/admin?type=club-log').then(r=>r.json()).then(d=>setLogs(d.logs??[]));};
  const assign=async()=>{if(!assignUserId||!assignModal)return;const res=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'assign-club',userId:assignUserId,clubId:assignModal.id,round,adminId})});const d=await res.json();setAssignMsg(d.error??'✓ Assigned');if(res.ok){loadSummary();fetch('/api/admin?type=club-log').then(r=>r.json()).then(d=>setLogs(d.logs??[]));setTimeout(()=>{setAssignModal(null);setAssignUserId('');setAssignMsg('');},1500);}};
  const fmtDT=(iso:string)=>new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

  const ACTION_LABELS:Record<string,{label:string,color:string}>={
    registered:{label:'Registered',color:'var(--green-mid)'},
    switched_to:{label:'Switched to',color:'#0EA5E9'},
    switched_away:{label:'Switched away',color:'#FB923C'},
    admin_assigned:{label:'Admin assigned',color:'var(--purple-mid)'},
    admin_switched_to:{label:'Admin switched to',color:'var(--purple-mid)'},
    admin_switched_away:{label:'Admin switched away',color:'#FB923C'},
    admin_removed:{label:'Admin removed',color:'#F87171'},
  };

  return(
    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:10,padding:3,border:'1px solid var(--border)'}}>
          {(['summary','log']as const).map(t=><button key={t} onClick={()=>setActiveTab(t)} style={{padding:'7px 16px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:activeTab===t?'var(--purple-mid)':'transparent',color:activeTab===t?'white':'var(--text-secondary)',transition:'all 0.15s'}}>{t==='summary'?'Student Lists':'Full Audit Log'}</button>)}
        </div>
        {activeTab==='summary'&&(<div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:13,color:'var(--text-secondary)',fontWeight:600}}>Round:</span>{rounds.map(r=><button key={r.round} onClick={()=>setRound(r.round)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:700,border:`2px solid ${round===r.round?'var(--purple-mid)':'var(--border)'}`,background:round===r.round?'var(--purple-soft)':'var(--surface2)',color:round===r.round?'var(--purple-mid)':'var(--text-muted)',cursor:'pointer'}}>R{r.round}</button>)}</div>)}
      </div>

      {activeTab==='summary'&&(
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {summary.map((club:any)=>(
            <div key={club.id} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',background:'var(--purple-soft)',borderBottom:'1px solid var(--border)'}}>
                <img src={club.image_url} alt={club.name} style={{width:44,height:44,borderRadius:8,objectFit:'cover'}}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>{club.name}</div><div style={{fontSize:13,color:'var(--text-secondary)'}}>{club.enrolled}/{club.capacity} enrolled</div></div>
                {club.organizers?.length>0&&<div style={{fontSize:12,color:'var(--text-muted)'}}>Organizers: {club.organizers.map((o:any)=>o.firstname).join(', ')}</div>}
                <div style={{height:6,width:100,background:'var(--border)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,club.enrolled/club.capacity*100)}%`,background:club.enrolled>=club.capacity?'#EF4444':'var(--green-mid)',borderRadius:3}}/></div>
                <button onClick={()=>{setAssignModal(club);setAssignUserId('');setAssignMsg('');}} className="btn-primary" style={{fontSize:12,padding:'6px 14px'}}>+ Assign</button>
              </div>
              {club.members.length===0?<p style={{padding:'14px 20px',fontSize:13,color:'var(--text-muted)'}}>No students enrolled.</p>:(
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'var(--surface2)'}}>{['#','Student','Registered At','By','Remove'].map(h=><th key={h} style={{padding:'8px 14px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textAlign:'left'}}>{h}</th>)}</tr></thead>
                  <tbody>{club.members.map((m:any,i:number)=>(
                    <tr key={m.id} style={{borderTop:'1px solid var(--border)'}}>
                      <td style={{padding:'9px 14px',fontSize:13,color:'var(--text-muted)',fontWeight:700}}>{i+1}</td>
                      <td style={{padding:'9px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={m.profile_picture} style={{width:28,height:28,borderRadius:'50%',background:'var(--purple-light)'}}/><div><div style={{fontSize:13,fontWeight:600}}>{m.firstname} {m.surname}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{m.nickname}{m.student_id?` · #${m.student_id}`:''}</div></div></div></td>
                      <td style={{padding:'9px 14px',fontSize:12,color:'var(--text-muted)'}}>{fmtDT(m.registered_at)}</td>
                      <td style={{padding:'9px 14px'}}><span style={{fontSize:11,padding:'2px 7px',borderRadius:5,background:m.registered_by?.startsWith('admin')?'rgba(168,85,247,0.15)':'rgba(74,222,128,0.15)',color:m.registered_by?.startsWith('admin')?'var(--purple-mid)':'var(--green-mid)',fontWeight:600}}>{m.registered_by?.startsWith('admin')?'Admin':'Self'}</span></td>
                      <td style={{padding:'9px 14px'}}><button onClick={()=>remove(m.id,round)} className="btn-danger" style={{padding:'4px 10px',fontSize:11}}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab==='log'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--purple-soft)'}}>{['Student','Club','Round','Action','Time'].map(h=><th key={h} style={{padding:'11px 14px',fontSize:12,fontWeight:700,color:'var(--purple-mid)',textAlign:'left'}}>{h}</th>)}</tr></thead>
            <tbody>{logs.map((l:any,i:number)=>{const al=ACTION_LABELS[l.action]??{label:l.action,color:'var(--text-muted)'};return(
              <tr key={l.id} style={{borderTop:'1px solid var(--border)',background:i%2===0?'var(--surface)':'var(--surface2)'}}>
                <td style={{padding:'9px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={l.profile_picture} style={{width:26,height:26,borderRadius:'50%',background:'var(--purple-light)'}}/><div style={{fontSize:13,fontWeight:600}}>{l.firstname} {l.surname} <span style={{color:'var(--text-muted)',fontWeight:400}}>({l.nickname})</span></div></div></td>
                <td style={{padding:'9px 14px'}}><div style={{fontSize:13,fontWeight:600}}>{l.club_name}</div><span className="badge badge-purple" style={{fontSize:10}}>{l.club_type}</span></td>
                <td style={{padding:'9px 14px',fontSize:13}}>R{l.round}</td>
                <td style={{padding:'9px 14px'}}><span style={{fontSize:12,padding:'2px 8px',borderRadius:6,background:`${al.color}20`,color:al.color,fontWeight:700}}>{al.label}</span></td>
                <td style={{padding:'9px 14px',fontSize:12,color:'var(--text-muted)'}}>{fmtDT(l.created_at)}</td>
              </tr>
            );})}
          </tbody></table>
        </div>
      )}

      {assignModal&&(
        <Modal title={`Assign to ${assignModal.name}`} onClose={()=>setAssignModal(null)}>
          <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Select a student to assign to Round {round} – {assignModal.name}.</p>
          <div style={{marginBottom:16}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:6}}>Student</label><select className="input" value={assignUserId} onChange={e=>setAssignUserId(e.target.value)} style={{fontSize:13}}><option value="">Select…</option>{allUsers.filter(u=>u.role==='student').map((u:any)=><option key={u.id} value={u.id}>{u.firstname} {u.surname} ({u.nickname})</option>)}</select></div>
          {assignMsg&&<div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:assignMsg.startsWith('✓')?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:assignMsg.startsWith('✓')?'var(--green-mid)':'#F87171',fontSize:13,fontWeight:600}}>{assignMsg}</div>}
          <button onClick={assign} disabled={!assignUserId} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>◈ Assign to Club</button>
        </Modal>
      )}
    </div>
  );
}

// ── TREASURE LOGS ──
function TreasureLogsPanel({adminId}:{adminId:string}) {
  const [activeTab,setActiveTab]=useState<'ranking'|'log'>('ranking');
  const [summary,setSummary]=useState<any[]>([]);
  const [logs,setLogs]=useState<any[]>([]);
  const [totalSlots,setTotalSlots]=useState(12);
  const [manageUser,setManageUser]=useState<any>(null);

  const loadSummary=useCallback(()=>{fetch('/api/admin?type=treasure-summary').then(r=>r.json()).then(d=>{setSummary(d.summary??[]);setTotalSlots(d.totalSlots??12);});},[]);
  const loadLog=useCallback(()=>{fetch('/api/admin?type=treasure-log').then(r=>r.json()).then(d=>setLogs(d.logs??[]));},[]);
  useEffect(()=>{loadSummary();loadLog();},[loadSummary,loadLog]);

  const addSlot=async(userId:string,slot:number)=>{await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add-treasure',userId,slot,adminId})});loadSummary();loadLog();};
  const removeSlot=async(userId:string,slot:number)=>{await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove-treasure',userId,slot,adminId})});loadSummary();loadLog();};
  const clearCooldown=async(userId:string)=>{await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear-cooldown',userId,adminId})});loadSummary();loadLog();};
  const clearAll=async()=>{if(!confirm('Clear ALL cooldowns?'))return;await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear-cooldown',userId:'all',adminId})});loadSummary();loadLog();};

  const fmtDT=(iso:string)=>new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:10,padding:3,border:'1px solid var(--border)',width:'fit-content'}}>
          {(['ranking','log']as const).map(t=><button key={t} onClick={()=>setActiveTab(t)} style={{padding:'7px 18px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:activeTab===t?'var(--purple-mid)':'transparent',color:activeTab===t?'white':'var(--text-secondary)',transition:'all 0.15s'}}>{t==='ranking'?'◆ Rankings':'◷ Log'}</button>)}
        </div>
        <button onClick={clearAll} className="btn-danger" style={{fontSize:13}}>⏺ Clear All Cooldowns</button>
      </div>

      {activeTab==='ranking'&&(
        <div>
          <div className="stats-grid" style={{marginBottom:20}}>
            {[{label:'Completed',value:summary.filter(s=>s.completedAt).length,color:'var(--green-mid)'},{label:'In Progress',value:summary.filter(s=>!s.completedAt&&s.solvedCount>0).length,color:'var(--purple-mid)'},{label:'Not Started',value:summary.filter(s=>s.solvedCount===0).length,color:'var(--text-muted)'}].map(s=>(
              <div key={s.label} className="card" style={{padding:16,textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:800,color:s.color,fontFamily:'DM Serif Display,serif'}}>{s.value}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:500,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'var(--purple-soft)'}}>{['Rank','Student','Progress','Clues','Completed','Cooldown','Actions'].map(h=><th key={h} style={{padding:'11px 14px',fontSize:12,fontWeight:700,color:'var(--purple-mid)',textAlign:'left'}}>{h}</th>)}</tr></thead>
              <tbody>{summary.map((s:any,i:number)=>{
                const pct=Math.round(s.solvedCount/totalSlots*100);
                const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
                return(
                  <tr key={s.id} style={{borderTop:'1px solid var(--border)',background:s.completedAt&&i===0?'rgba(74,222,128,0.05)':'var(--surface)'}}>
                    <td style={{padding:'10px 14px',fontSize:s.completedAt&&i<3?20:14,fontWeight:700,color:'var(--purple-mid)'}}>{medal}</td>
                    <td style={{padding:'10px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={s.profile_picture} style={{width:30,height:30,borderRadius:'50%',background:'var(--purple-light)'}}/><div><div style={{fontSize:13,fontWeight:600}}>{s.firstname} {s.surname}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{s.nickname}{s.student_id?` · #${s.student_id}`:''}</div></div></div></td>
                    <td style={{padding:'10px 14px'}}><div style={{width:80,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:s.completedAt?'var(--green-mid)':'var(--purple-mid)',borderRadius:3}}/></div></td>
                    <td style={{padding:'10px 14px',fontSize:14,fontWeight:700,color:s.completedAt?'var(--green-mid)':'var(--text-primary)'}}>{s.solvedCount}/{totalSlots}</td>
                    <td style={{padding:'10px 14px',fontSize:12}}>{s.completedAt?<span style={{color:'var(--green-mid)',fontWeight:700}}>{fmtDT(s.completedAt)}</span>:<span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td style={{padding:'10px 14px'}}>{s.cooldownEnd?<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,color:'#FB923C',fontWeight:600}}>Active</span><button onClick={()=>clearCooldown(s.id)} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(251,146,60,0.15)',color:'#FB923C',border:'1px solid rgba(251,146,60,0.3)',cursor:'pointer'}}>Clear</button></div>:<span style={{fontSize:12,color:'var(--text-muted)'}}>None</span>}</td>
                    <td style={{padding:'10px 14px'}}><button onClick={()=>setManageUser(s)} className="btn-secondary" style={{padding:'4px 10px',fontSize:11}}>Manage</button></td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab==='log'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--purple-soft)'}}>{['Student','Clue #','Answer','Action','By','Time'].map(h=><th key={h} style={{padding:'11px 14px',fontSize:12,fontWeight:700,color:'var(--purple-mid)',textAlign:'left'}}>{h}</th>)}</tr></thead>
            <tbody>{logs.map((l:any,i:number)=>{
              const ta:Record<string,{label:string,color:string}>={
                solved:{label:'Solved',color:'var(--green-mid)'},
                wrong_attempt:{label:'Wrong attempt',color:'#F87171'},
                admin_granted:{label:'Admin granted',color:'var(--purple-mid)'},
                admin_removed:{label:'Admin removed',color:'#FB923C'},
                revoked_answer_changed:{label:'Revoked (answer changed)',color:'#6B7280'},
                cooldown_started:{label:'Cooldown started',color:'#FBBF24'},
                cooldown_cleared:{label:'Cooldown cleared',color:'#0EA5E9'},
              };
              const al=ta[l.action]??{label:l.action,color:'var(--text-muted)'};
              const isWrong=l.action==='wrong_attempt';
              return(
              <tr key={l.id} style={{borderTop:'1px solid var(--border)',background:isWrong?'rgba(248,113,113,0.04)':i%2===0?'var(--surface)':'var(--surface2)'}}>
                <td style={{padding:'9px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={l.profile_picture} style={{width:26,height:26,borderRadius:'50%',background:'var(--purple-light)'}}/><div style={{fontSize:13,fontWeight:600}}>{l.firstname} {l.surname} <span style={{color:'var(--text-muted)',fontWeight:400}}>({l.nickname}){l.student_id?` #${l.student_id}`:''}</span></div></div></td>
                <td style={{padding:'9px 14px',fontSize:14,fontWeight:700,color:isWrong?'#F87171':'var(--purple-mid)'}}>{l.slot>=0?`#${l.slot+1}`:'—'}</td>
                <td style={{padding:'9px 14px',fontSize:13,fontFamily:'monospace',color:isWrong?'#F87171':'var(--text-primary)',opacity:isWrong?0.7:1}}>{l.answer||'—'}</td>
                <td style={{padding:'9px 14px'}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:`${al.color}20`,color:al.color,fontWeight:700}}>{al.label}</span></td>
                <td style={{padding:'9px 14px'}}><span style={{fontSize:11,padding:'2px 7px',borderRadius:5,background:l.performed_by?.startsWith('admin')?'rgba(168,85,247,0.15)':l.performed_by==='system'?'rgba(107,114,128,0.15)':'rgba(74,222,128,0.15)',color:l.performed_by?.startsWith('admin')?'var(--purple-mid)':l.performed_by==='system'?'#6B7280':'var(--green-mid)',fontWeight:600}}>{l.performed_by?.startsWith('admin')?'Admin':l.performed_by==='system'?'System':'Self'}</span></td>
                <td style={{padding:'9px 14px',fontSize:12,color:'var(--text-muted)'}}>{fmtDT(l.created_at)}</td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      )}

      {/* Manage individual user's treasure progress */}
      {manageUser&&(
        <Modal title={`Treasure Progress — ${manageUser.firstname} ${manageUser.surname}`} wide onClose={()=>{setManageUser(null);loadSummary();}}>
          <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Click ✓ to grant a clue, ✕ to remove. Admin-granted clues use the current correct answer.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
            {Array.from({length:12},(_,i)=>{
              const solved=summary.find(s=>s.id===manageUser.id)?.slots?.find((sl:any)=>sl.slot===i);
              return(
                <div key={i} style={{padding:'12px',borderRadius:10,border:`1.5px solid ${solved?'rgba(74,222,128,0.4)':'var(--border)'}`,background:solved?'rgba(74,222,128,0.07)':'var(--surface)',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:700,color:solved?'var(--green-mid)':'var(--text-muted)',marginBottom:6,textTransform:'uppercase'}}>Clue #{i+1}</div>
                  {solved?<div style={{fontSize:12,fontFamily:'monospace',marginBottom:6,color:'var(--green-mid)'}}>{solved.answer}</div>:<div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>Not solved</div>}
                  {solved?<button onClick={()=>removeSlot(manageUser.id,i)} className="btn-danger" style={{width:'100%',justifyContent:'center',fontSize:11,padding:'4px'}}>✕ Remove</button>:<button onClick={()=>addSlot(manageUser.id,i)} className="btn-green" style={{width:'100%',justifyContent:'center',fontSize:11,padding:'4px'}}>+ Grant</button>}
                </div>
              );
            })}
          </div>
          {manageUser.cooldownEnd&&(
            <div style={{marginTop:16,padding:'10px 14px',background:'rgba(251,146,60,0.1)',borderRadius:8,border:'1px solid rgba(251,146,60,0.3)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#FB923C',fontWeight:600}}>⏳ Cooldown active</span>
              <button onClick={()=>clearCooldown(manageUser.id)} style={{fontSize:12,padding:'4px 12px',borderRadius:6,background:'rgba(251,146,60,0.15)',color:'#FB923C',border:'1px solid rgba(251,146,60,0.3)',cursor:'pointer'}}>Clear Cooldown</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
