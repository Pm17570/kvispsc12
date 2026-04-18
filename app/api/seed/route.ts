import { NextResponse } from 'next/server';
import { resetDb, getDb } from '@/lib/db';

export async function POST() {
  try {
    resetDb();
    await getDb(); // reinitialise with seed
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
