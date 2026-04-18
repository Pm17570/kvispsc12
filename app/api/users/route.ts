import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, queryOne, run } from '@/lib/dbHelpers';

function fmt(u: any) {
  return { id: u.id, studentId: u.student_id ?? '', firstname: u.firstname, surname: u.surname, nickname: u.nickname, email: u.email, role: u.role, profilePicture: u.profile_picture, bio: u.bio, password: u.password };
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const user = queryOne(db, `SELECT * FROM users WHERE id = ?`, [id]);
      if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const selectedClubs: Record<number, string | null> = {};
      const regs = queryAll(db, `SELECT round, club_id FROM club_registrations WHERE user_id = ?`, [id]);
      regs.forEach((r: any) => { selectedClubs[r.round] = r.club_id; });
      const history = queryAll(db, `
        SELECT cr.round, cr.club_id, cr.registered_at, c.name as club_name
        FROM club_registrations cr JOIN clubs c ON c.id = cr.club_id
        WHERE cr.user_id = ? ORDER BY cr.registered_at DESC
      `, [id]);
      const treasure = queryAll(db, `SELECT slot, answer FROM user_treasure WHERE user_id = ?`, [id]);
      const treasureMap: Record<number, string> = {};
      treasure.forEach((t: any) => { treasureMap[t.slot] = t.answer; });
      return NextResponse.json({ user: { ...fmt(user), selectedClubs, clubHistory: history, treasureAnswers: treasureMap } });
    }

    const users = queryAll(db, `SELECT * FROM users ORDER BY firstname`);
    return NextResponse.json({ users: users.map(fmt) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const b = await req.json();
    run(db, `INSERT INTO users (id,student_id,firstname,surname,nickname,email,role,bio,password,profile_picture) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.studentId ?? '', b.firstname, b.surname, b.nickname, b.email, b.role ?? 'student', b.bio ?? '', b.password, b.profilePicture ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.id}`]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const b = await req.json();
    const { id } = b;
    const fields: [string, any][] = [];
    if (b.bio !== undefined) fields.push(['bio', b.bio]);
    if (b.password) fields.push(['password', b.password]);
    if (b.firstname) fields.push(['firstname', b.firstname]);
    if (b.surname) fields.push(['surname', b.surname]);
    if (b.nickname) fields.push(['nickname', b.nickname]);
    if (b.email) fields.push(['email', b.email]);
    if (b.role) fields.push(['role', b.role]);
    if (b.profilePicture) fields.push(['profile_picture', b.profilePicture]);
    if (b.studentId !== undefined) fields.push(['student_id', b.studentId]);
    for (const [col, val] of fields) run(db, `UPDATE users SET ${col} = ? WHERE id = ?`, [val, id]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    run(db, `DELETE FROM users WHERE id = ?`, [searchParams.get('id')]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
