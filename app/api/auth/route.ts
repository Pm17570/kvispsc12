import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryOne } from '@/lib/dbHelpers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const db = await getDb();
    const user = queryOne(db, `SELECT * FROM users WHERE email = ? AND password = ?`, [email, password]);
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    return NextResponse.json({ user: formatUser(user) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function formatUser(u: any) {
  return {
    id: u.id, firstname: u.firstname, surname: u.surname,
    nickname: u.nickname, email: u.email, role: u.role,
    profilePicture: u.profile_picture, bio: u.bio,
  };
}
