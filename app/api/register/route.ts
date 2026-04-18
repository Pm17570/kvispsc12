import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryOne, run } from '@/lib/dbHelpers';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { userId, clubId, round } = await req.json();

    // Block admin/staff from enrolling
    const user = queryOne(db, `SELECT role FROM users WHERE id = ?`, [userId]);
    if (user?.role === 'admin' || user?.role === 'staff') {
      return NextResponse.json({ error: 'Admin and staff cannot enrol in clubs' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const rnd = queryOne(db, `SELECT * FROM club_rounds WHERE round = ?`, [round]);
    if (!rnd) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (now < rnd.open_at || now > rnd.close_at)
      return NextResponse.json({ error: 'Registration is not open for this round' }, { status: 400 });

    const club = queryOne(db, `SELECT * FROM clubs WHERE id = ?`, [clubId]);
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });

    const existing = queryOne(db, `SELECT * FROM club_registrations WHERE user_id = ? AND round = ?`, [userId, round]);
    if (existing?.club_id === clubId)
      return NextResponse.json({ error: 'Already registered for this club' }, { status: 400 });

    const memberCount = (queryOne(db, `SELECT COUNT(*) as cnt FROM club_registrations WHERE club_id = ? AND round = ?`, [clubId, round]) as any)?.cnt ?? 0;
    if (memberCount >= club.capacity)
      return NextResponse.json({ error: 'This club is full' }, { status: 400 });

    // Log the change
    if (existing) {
      run(db, `INSERT INTO club_registration_log (user_id,club_id,round,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
        [userId, existing.club_id, round, 'switched_away', 'self', now]);
    }

    run(db, `INSERT OR REPLACE INTO club_registrations (user_id,club_id,round,registered_at,registered_by) VALUES (?,?,?,?,?)`,
      [userId, clubId, round, now, 'self']);
    run(db, `INSERT INTO club_registration_log (user_id,club_id,round,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
      [userId, clubId, round, existing ? 'switched_to' : 'registered', 'self', now]);

    saveDb();
    return NextResponse.json({ success: true, message: 'Registered successfully' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
