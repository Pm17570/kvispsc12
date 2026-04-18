import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, run } from '@/lib/dbHelpers';

export async function GET() {
  try {
    const db = await getDb();
    const rounds = queryAll(db, `SELECT * FROM club_rounds ORDER BY round`);
    const now = new Date().toISOString();
    const current = rounds.find((r: any) => r.open_at <= now && now <= r.close_at) ?? null;

    // Enrich with clubs per round
    const enriched = rounds.map((r: any) => {
      const clubs = queryAll(db, `
        SELECT c.id, c.name, c.type, c.capacity, c.image_url
        FROM clubs c JOIN round_clubs rc ON rc.club_id = c.id
        WHERE rc.round = ?
      `, [r.round]);
      return {
        round: r.round,
        sessionDate: r.session_date,
        openAt: r.open_at,
        closeAt: r.close_at,
        clubs,
      };
    });

    return NextResponse.json({
      rounds: enriched,
      currentRound: current ? enriched.find((r: any) => r.round === current.round) ?? null : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const { round, openAt, closeAt, sessionDate } = await req.json();
    run(db, `UPDATE club_rounds SET open_at=?, close_at=?${sessionDate ? ', session_date=?' : ''} WHERE round=?`,
      sessionDate ? [openAt, closeAt, sessionDate, round] : [openAt, closeAt, round]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
