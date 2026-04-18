import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, queryOne, run } from '@/lib/dbHelpers';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const admin = searchParams.get('admin');

    const answers = queryAll(db, `SELECT slot, answer FROM treasure_answers ORDER BY slot`);

    if (admin === '1') {
      return NextResponse.json({ answers });
    }

    if (!userId) return NextResponse.json({ answers: [], locked: {}, cooldownEnd: null });

    const locked = queryAll(db, `SELECT slot, answer FROM user_treasure WHERE user_id = ? ORDER BY slot`, [userId]);
    const lockedMap: Record<number, string> = {};
    locked.forEach((l: any) => { lockedMap[l.slot] = l.answer; });

    const cd = queryOne(db, `SELECT checked_at FROM treasure_cooldowns WHERE user_id = ?`, [userId]);
    let cooldownEnd: string | null = null;
    if (cd) {
      const end = new Date(new Date(cd.checked_at).getTime() + 20 * 60 * 1000);
      if (end > new Date()) cooldownEnd = end.toISOString();
    }

    return NextResponse.json({ locked: lockedMap, cooldownEnd });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { userId, inputs } = await req.json() as { userId: string; inputs: Record<number, string> };

    const cd = queryOne(db, `SELECT checked_at FROM treasure_cooldowns WHERE user_id = ?`, [userId]);
    if (cd) {
      const end = new Date(new Date(cd.checked_at).getTime() + 20 * 60 * 1000);
      if (end > new Date()) {
        return NextResponse.json({ error: 'Cooldown active', cooldownEnd: end.toISOString() }, { status: 429 });
      }
    }

    const answers = queryAll(db, `SELECT slot, answer FROM treasure_answers`);
    const answerMap: Record<number, string> = {};
    answers.forEach((a: any) => { answerMap[a.slot] = a.answer; });

    const correct: number[] = [];
    const wrong: number[] = [];
    const now = new Date().toISOString();

    for (const [slotStr, val] of Object.entries(inputs)) {
      if (!val?.trim()) continue;
      const slot = Number(slotStr);
      const already = queryOne(db, `SELECT 1 FROM user_treasure WHERE user_id = ? AND slot = ?`, [userId, slot]);
      if (already) continue;

      const expected = answerMap[slot];
      if (expected && val.trim().toLowerCase() === expected.toLowerCase()) {
        run(db, `INSERT OR REPLACE INTO user_treasure (user_id, slot, answer, locked_at) VALUES (?,?,?,?)`,
          [userId, slot, val.trim(), now]);
        // Audit log: user solved
        run(db, `INSERT INTO treasure_log (user_id, slot, answer, action, performed_by, created_at) VALUES (?,?,?,?,?,?)`,
          [userId, slot, val.trim(), 'solved', 'self', now]);
        correct.push(slot);
      } else {
        // Audit log: user attempted wrong answer
        run(db, `INSERT INTO treasure_log (user_id, slot, answer, action, performed_by, created_at) VALUES (?,?,?,?,?,?)`,
          [userId, slot, val.trim(), 'wrong_attempt', 'self', now]);
        wrong.push(slot);
      }
    }

    run(db, `INSERT OR REPLACE INTO treasure_cooldowns (user_id, checked_at) VALUES (?,?)`, [userId, now]);
    // Log the check event itself
    run(db, `INSERT INTO treasure_log (user_id, slot, answer, action, performed_by, created_at) VALUES (?,?,?,?,?,?)`,
      [userId, -1, '', 'cooldown_started', 'self', now]);
    saveDb();

    const cooldownEnd = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    return NextResponse.json({ correct, wrong, cooldownEnd });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const { answers } = await req.json() as { answers: { slot: number; answer: string }[] };

    for (const a of answers) {
      run(db, `INSERT OR REPLACE INTO treasure_answers (slot, answer) VALUES (?,?)`, [a.slot, a.answer]);
    }

    // Re-evaluate locked answers; remove those that no longer match
    const allLocked = queryAll(db, `SELECT user_id, slot, answer FROM user_treasure`);
    const newAnswerMap: Record<number, string> = {};
    answers.forEach(a => { newAnswerMap[a.slot] = a.answer; });
    const now = new Date().toISOString();

    for (const locked of allLocked) {
      const correct = newAnswerMap[locked.slot];
      if (!correct || locked.answer.toLowerCase() !== correct.toLowerCase()) {
        run(db, `DELETE FROM user_treasure WHERE user_id = ? AND slot = ?`, [locked.user_id, locked.slot]);
        run(db, `INSERT INTO treasure_log (user_id, slot, answer, action, performed_by, created_at) VALUES (?,?,?,?,?,?)`,
          [locked.user_id, locked.slot, locked.answer, 'revoked_answer_changed', 'system', now]);
      }
    }

    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
