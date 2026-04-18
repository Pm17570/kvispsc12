import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, run } from '@/lib/dbHelpers';

export async function GET() {
  try {
    const db = await getDb();
    const rows = queryAll(db, `SELECT * FROM activities ORDER BY date ASC, time ASC`);
    return NextResponse.json({ activities: rows.map(a => ({ id: a.id, title: a.title, date: a.date, time: a.time, location: a.location, description: a.description, type: a.type })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const b = await req.json();
    const id = `a${Date.now()}`;
    run(db, `INSERT INTO activities (id,title,date,time,location,description,type) VALUES (?,?,?,?,?,?,?)`,
      [id, b.title, b.date, b.time, b.location, b.description ?? '', b.type ?? 'Event']);
    saveDb();
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const b = await req.json();
    run(db, `UPDATE activities SET title=?,date=?,time=?,location=?,description=?,type=? WHERE id=?`,
      [b.title, b.date, b.time, b.location, b.description, b.type, b.id]);
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
    run(db, `DELETE FROM activities WHERE id = ?`, [searchParams.get('id')]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
