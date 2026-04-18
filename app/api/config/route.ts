import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, run } from '@/lib/dbHelpers';

export async function GET() {
  try {
    const db = await getDb();
    const activityTypes = queryAll(db, `SELECT name FROM config_activity_types ORDER BY name`).map((r: any) => r.name);
    const clubTypes = queryAll(db, `SELECT name FROM config_club_types ORDER BY name`).map((r: any) => r.name);
    return NextResponse.json({ activityTypes, clubTypes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { table, name } = await req.json();
    if (!['config_activity_types', 'config_club_types'].includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }
    run(db, `INSERT OR IGNORE INTO ${table} (name) VALUES (?)`, [name.trim()]);
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
    const table = searchParams.get('table');
    const name = searchParams.get('name');
    if (!['config_activity_types', 'config_club_types'].includes(table ?? '')) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }
    run(db, `DELETE FROM ${table} WHERE name = ?`, [name]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
