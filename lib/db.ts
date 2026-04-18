import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'psc12.db.json');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SQL: any = null;

async function getSQL() {
  if (SQL) return SQL;
  const sqlJsPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.js');
  const initSqlJs = eval('require')(sqlJsPath);
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasmPath });
  return SQL;
}

export async function getDb() {
  if (db) return db;
  const SqlLib = await getSQL();
  if (fs.existsSync(DB_PATH)) {
    const arr = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as number[];
    db = new SqlLib.Database(new Uint8Array(arr));
    runMigrations(db);
    saveDb();
  } else {
    db = new SqlLib.Database();
    initSchema(db);
    seedData(db);
    saveDb();
  }
  return db;
}

export function saveDb() {
  if (!db) return;
  const data: number[] = Array.from(db.export() as Uint8Array);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data));
}

export function resetDb() {
  db = null;
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
}

function runMigrations(db: any) {
  // Safe migrations for existing DBs
  db.run(`CREATE TABLE IF NOT EXISTS config_activity_types (name TEXT PRIMARY KEY);`);
  db.run(`CREATE TABLE IF NOT EXISTS config_club_types (name TEXT PRIMARY KEY);`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_visibility (
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    audience TEXT NOT NULL DEFAULT 'all',
    PRIMARY KEY (activity_id)
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_staff_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_label TEXT NOT NULL,
    notes TEXT DEFAULT '',
    UNIQUE(activity_id, user_id)
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS club_organizers (
    club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_label TEXT NOT NULL DEFAULT 'Organizer',
    PRIMARY KEY (club_id, user_id)
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS club_registration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL DEFAULT 'self',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS treasure_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    slot INTEGER NOT NULL,
    answer TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL DEFAULT 'self',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  // Add student_id column if not exists
  try { db.run(`ALTER TABLE users ADD COLUMN student_id TEXT DEFAULT '';`); } catch {}
}

function initSchema(db: any) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      student_id TEXT DEFAULT '',
      firstname TEXT NOT NULL,
      surname TEXT NOT NULL,
      nickname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      profile_picture TEXT,
      bio TEXT DEFAULT '',
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'General',
      capacity INTEGER DEFAULT 20,
      image_url TEXT
    );
    CREATE TABLE IF NOT EXISTS club_rounds (
      round INTEGER PRIMARY KEY,
      session_date TEXT NOT NULL,
      open_at TEXT NOT NULL,
      close_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS round_clubs (
      round INTEGER NOT NULL REFERENCES club_rounds(round) ON DELETE CASCADE,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      PRIMARY KEY (round, club_id)
    );
    CREATE TABLE IF NOT EXISTS club_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      round INTEGER NOT NULL REFERENCES club_rounds(round),
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      registered_by TEXT DEFAULT 'self',
      UNIQUE(user_id, round)
    );
    CREATE TABLE IF NOT EXISTS club_registration_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      club_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL DEFAULT 'self',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS club_organizers (
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_label TEXT NOT NULL DEFAULT 'Organizer',
      PRIMARY KEY (club_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS treasure_answers (
      slot INTEGER PRIMARY KEY,
      answer TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS user_treasure (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL,
      answer TEXT NOT NULL,
      locked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, slot)
    );
    CREATE TABLE IF NOT EXISTS treasure_cooldowns (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      checked_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS treasure_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      slot INTEGER NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL DEFAULT 'self',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'Event'
    );
    CREATE TABLE IF NOT EXISTS activity_visibility (
      activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      audience TEXT NOT NULL DEFAULT 'all',
      PRIMARY KEY (activity_id)
    );
    CREATE TABLE IF NOT EXISTS activity_staff_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_label TEXT NOT NULL,
      notes TEXT DEFAULT '',
      UNIQUE(activity_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS config_activity_types (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS config_club_types (name TEXT PRIMARY KEY);
  `);
}

function seedData(db: any) {
  const users = [
    { id:'u001',sid:'',fn:'Admin',sn:'System',nn:'Admin',email:'00000@kvis.ac.th',role:'admin',bio:'System administrator',pw:'admin123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
    { id:'u002',sid:'12001',fn:'Siriporn',sn:'Khamdi',nn:'Nong',email:'12001@kvis.ac.th',role:'student',bio:'Love coding and music',pw:'pass123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=nong' },
    { id:'u003',sid:'12002',fn:'Tanapat',sn:'Srisuk',nn:'Film',email:'12002@kvis.ac.th',role:'student',bio:'Basketball & Science enthusiast',pw:'pass123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=film' },
    { id:'u004',sid:'12003',fn:'Kanya',sn:'Patel',nn:'Joy',email:'12003@kvis.ac.th',role:'student',bio:'Art lover',pw:'pass123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=joy' },
    { id:'u005',sid:'12004',fn:'Panya',sn:'Saen',nn:'Pete',email:'12004@kvis.ac.th',role:'student',bio:'Future engineer',pw:'pass123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=pete' },
    { id:'u006',sid:'',fn:'Wanida',sn:'Chai',nn:'Wan',email:'10001@kvis.ac.th',role:'staff',bio:'Science teacher',pw:'staff123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=wan' },
    { id:'u007',sid:'',fn:'Krit',sn:'Sriwong',nn:'Krit',email:'10002@kvis.ac.th',role:'staff',bio:'Activity coordinator',pw:'staff123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=krit' },
    { id:'u008',sid:'',fn:'Ploy',sn:'Tanaka',nn:'Ploy',email:'10003@kvis.ac.th',role:'staff',bio:'PE teacher',pw:'staff123',pic:'https://api.dicebear.com/7.x/avataaars/svg?seed=ploy' },
  ];
  for (const u of users) {
    db.run(`INSERT OR IGNORE INTO users (id,student_id,firstname,surname,nickname,email,role,bio,password,profile_picture) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [u.id,u.sid,u.fn,u.sn,u.nn,u.email,u.role,u.bio,u.pw,u.pic]);
  }

  const clubs = [
    { id:'c101',name:'Robotics Club',desc:'Build and program robots; compete in national engineering championships.',type:'STEM',cap:20,img:'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=80' },
    { id:'c102',name:'Art & Design',desc:'Painting, digital art, sculpture and design thinking for all skill levels.',type:'Arts',cap:15,img:'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80' },
    { id:'c103',name:'Debate Society',desc:'Sharpen critical thinking and public speaking; compete in tournaments.',type:'Academic',cap:18,img:'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80' },
    { id:'c104',name:'Environmental Club',desc:'Lead sustainability projects and campus green initiatives.',type:'Community',cap:30,img:'https://images.unsplash.com/photo-1542601906897-0d35d2f66e3f?w=400&q=80' },
    { id:'c105',name:'Photography Club',desc:'Explore composition, lighting and visual storytelling.',type:'Arts',cap:16,img:'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=400&q=80' },
    { id:'c201',name:'Music Ensemble',desc:'Perform classical and modern music at school events and concerts.',type:'Arts',cap:25,img:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80' },
    { id:'c202',name:'Coding & AI Club',desc:'Build apps, explore machine learning and compete in hackathons.',type:'STEM',cap:22,img:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80' },
    { id:'c203',name:'Drama & Theatre',desc:'Write, direct and perform original plays and classical productions.',type:'Arts',cap:20,img:'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80' },
    { id:'c204',name:'Math Olympiad',desc:'Intensive preparation for national and international math competitions.',type:'Academic',cap:14,img:'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
    { id:'c205',name:'Community Service',desc:'Volunteer, mentor, and drive positive change in the local community.',type:'Community',cap:35,img:'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&q=80' },
    { id:'c301',name:'Science Research',desc:'Real lab research mentored by university professors; publish findings.',type:'STEM',cap:12,img:'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&q=80' },
    { id:'c302',name:'Film & Media',desc:'Scriptwriting, cinematography and video production.',type:'Arts',cap:18,img:'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80' },
    { id:'c303',name:'Chess Club',desc:'Strategy, tactics and competitive play.',type:'Academic',cap:20,img:'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80' },
    { id:'c304',name:'Astronomy Society',desc:'Telescope sessions, astrophotography and space science seminars.',type:'STEM',cap:16,img:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80' },
    { id:'c305',name:'Culinary Arts',desc:'Master classic and fusion cuisines; host school food festivals.',type:'Community',cap:24,img:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80' },
    { id:'c401',name:'Dance Crew',desc:'Contemporary, hip-hop and traditional dance styles.',type:'Arts',cap:22,img:'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&q=80' },
    { id:'c402',name:'Cybersecurity Club',desc:'Ethical hacking, CTF competitions and network defense.',type:'STEM',cap:18,img:'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80' },
    { id:'c403',name:'Literary Magazine',desc:'Creative writing, journalism and publishing.',type:'Academic',cap:20,img:'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80' },
    { id:'c404',name:'Sports & Fitness',desc:'Multi-sport training, fitness coaching and competitions.',type:'Community',cap:40,img:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
    { id:'c405',name:'Language Exchange',desc:'Practice English, Japanese, Korean and more.',type:'Academic',cap:28,img:'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80' },
  ];
  for (const c of clubs) {
    db.run(`INSERT OR IGNORE INTO clubs (id,name,description,type,capacity,image_url) VALUES (?,?,?,?,?,?)`,
      [c.id,c.name,c.desc,c.type,c.cap,c.img]);
  }

  // Assign organizers
  db.run(`INSERT OR IGNORE INTO club_organizers (club_id,user_id,role_label) VALUES ('c101','u006','Lead Advisor')`);
  db.run(`INSERT OR IGNORE INTO club_organizers (club_id,user_id,role_label) VALUES ('c202','u007','Faculty Mentor')`);
  db.run(`INSERT OR IGNORE INTO club_organizers (club_id,user_id,role_label) VALUES ('c404','u008','Coach')`);

  const rounds = [
    { round:1, session:'2025-04-27', open:'2025-04-24T08:00:00.000Z', close:'2025-04-27T16:00:00.000Z', clubs:['c101','c102','c103','c104','c105'] },
    { round:2, session:'2025-04-30', open:'2025-04-27T08:00:00.000Z', close:'2025-04-30T16:00:00.000Z', clubs:['c201','c202','c203','c204','c205'] },
    { round:3, session:'2025-05-04', open:'2025-05-01T08:00:00.000Z', close:'2025-05-04T16:00:00.000Z', clubs:['c301','c302','c303','c304','c305'] },
    { round:4, session:'2025-05-07', open:'2025-05-04T08:00:00.000Z', close:'2025-05-07T16:00:00.000Z', clubs:['c401','c402','c403','c404','c405'] },
  ];
  for (const r of rounds) {
    db.run(`INSERT OR IGNORE INTO club_rounds (round,session_date,open_at,close_at) VALUES (?,?,?,?)`,
      [r.round,r.session,r.open,r.close]);
    for (const cid of r.clubs) db.run(`INSERT OR IGNORE INTO round_clubs (round,club_id) VALUES (?,?)`, [r.round,cid]);
  }

  const answers = ['pioneer','science','twelve','purple','cosmos','circuit','debate','spectrum','nature','campus','quest','delta'];
  for (let i = 0; i < 12; i++) db.run(`INSERT OR IGNORE INTO treasure_answers (slot,answer) VALUES (?,?)`, [i,answers[i]]);

  const activities = [
    { id:'a001',title:'Opening Assembly',date:'2025-04-25',time:'08:00',loc:'Main Auditorium',desc:'Kickoff ceremony welcoming all club members.',type:'Ceremony',audience:'all' },
    { id:'a002',title:'Club Info Fair',date:'2025-04-25',time:'10:00',loc:'School Courtyard',desc:'Browse club booths and talk to leaders.',type:'Event',audience:'all' },
    { id:'a003',title:'Staff Planning Meeting',date:'2025-04-25',time:'13:00',loc:'Staff Room',desc:'Staff-only planning session before Round 1.',type:'Meeting',audience:'staff' },
    { id:'a004',title:'Round 1 Club Day',date:'2025-04-27',time:'13:00',loc:'Club Rooms',desc:'First club session.',type:'Event',audience:'all' },
    { id:'a005',title:'Round 2 Club Day',date:'2025-04-30',time:'13:00',loc:'Club Rooms',desc:'Second club session.',type:'Event',audience:'all' },
    { id:'a006',title:'Treasure Hunt',date:'2025-05-02',time:'09:00',loc:'School Campus',desc:'Campus-wide treasure hunt for students.',type:'Event',audience:'student' },
    { id:'a007',title:'Staff Supervision Setup',date:'2025-05-02',time:'08:00',loc:'Various Stations',desc:'Staff prepare stations before treasure hunt.',type:'Meeting',audience:'staff' },
    { id:'a008',title:'Treasure Hunt Awards',date:'2025-05-02',time:'15:00',loc:'Main Auditorium',desc:'Announce top finishers.',type:'Ceremony',audience:'all' },
    { id:'a009',title:'Round 3 Club Day',date:'2025-05-04',time:'13:00',loc:'Club Rooms',desc:'Third session.',type:'Event',audience:'all' },
    { id:'a010',title:'STEM Showcase',date:'2025-05-06',time:'10:00',loc:'Science Wing',desc:'Science and tech clubs present projects.',type:'Exhibition',audience:'all' },
    { id:'a011',title:'Arts Showcase',date:'2025-05-06',time:'14:00',loc:'Gallery Room',desc:'Arts clubs display semester work.',type:'Exhibition',audience:'all' },
    { id:'a012',title:'Round 4 Club Day',date:'2025-05-07',time:'13:00',loc:'Club Rooms',desc:'Final session.',type:'Event',audience:'all' },
    { id:'a013',title:'Arts Festival',date:'2025-05-15',time:'14:00',loc:'Outdoor Stage',desc:'End-of-semester performances.',type:'Performance',audience:'all' },
    { id:'a014',title:'Closing Ceremony',date:'2025-05-20',time:'09:00',loc:'Main Auditorium',desc:'Awards, certificates and celebration.',type:'Ceremony',audience:'all' },
  ];
  for (const a of activities) {
    db.run(`INSERT OR IGNORE INTO activities (id,title,date,time,location,description,type) VALUES (?,?,?,?,?,?,?)`,
      [a.id,a.title,a.date,a.time,a.loc,a.desc,a.type]);
    db.run(`INSERT OR IGNORE INTO activity_visibility (activity_id,audience) VALUES (?,?)`, [a.id,a.audience]);
  }

  // Assign staff roles to some activities
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a003','u006','Science Lead','Prepare lab demo materials')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a003','u007','Logistics','Arrange room and equipment')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a007','u006','Station A Supervisor','Oversee clues 1–4')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a007','u007','Station B Supervisor','Oversee clues 5–8')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a007','u008','Station C Supervisor','Oversee clues 9–12')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a004','u008','Facility Manager','Open/close club rooms')`);
  db.run(`INSERT OR IGNORE INTO activity_staff_roles (activity_id,user_id,role_label,notes) VALUES ('a005','u007','Facility Manager','Open/close club rooms')`);

  // Config types
  const actTypes = ['Ceremony','Workshop','Exhibition','Competition','Event','Performance','Meeting','Trip','Other'];
  for (const t of actTypes) db.run(`INSERT OR IGNORE INTO config_activity_types (name) VALUES (?)`, [t]);
  const clbTypes = ['STEM','Arts','Academic','Community','Sports','Language','Music','Technology','Other'];
  for (const t of clbTypes) db.run(`INSERT OR IGNORE INTO config_club_types (name) VALUES (?)`, [t]);
}
