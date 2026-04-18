import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, queryOne, run } from '@/lib/dbHelpers';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'club-log') {
      // Full audit log — never deleted, includes switches
      const logs = queryAll(db, `
        SELECT crl.id, crl.user_id, crl.club_id, crl.round, crl.action, crl.performed_by, crl.created_at,
               u.firstname, u.surname, u.nickname, u.profile_picture,
               c.name as club_name, c.type as club_type
        FROM club_registration_log crl
        JOIN users u ON u.id = crl.user_id
        JOIN clubs c ON c.id = crl.club_id
        ORDER BY crl.created_at DESC
      `);
      return NextResponse.json({ logs });
    }

    if (type === 'club-summary') {
      const round = Number(searchParams.get('round') ?? '1');
      const clubs = queryAll(db, `
        SELECT c.id, c.name, c.type, c.capacity, c.image_url,
               COUNT(cr.id) as enrolled
        FROM clubs c
        JOIN round_clubs rc ON rc.club_id = c.id AND rc.round = ?
        LEFT JOIN club_registrations cr ON cr.club_id = c.id AND cr.round = ?
        GROUP BY c.id ORDER BY c.name
      `, [round, round]);

      const result = clubs.map((club: any) => {
        const members = queryAll(db, `
          SELECT u.id, u.firstname, u.surname, u.nickname, u.email, u.student_id, u.profile_picture,
                 cr.registered_at, cr.registered_by
          FROM club_registrations cr
          JOIN users u ON u.id = cr.user_id
          WHERE cr.club_id = ? AND cr.round = ?
          ORDER BY cr.registered_at ASC
        `, [club.id, round]);
        const organizers = queryAll(db, `
          SELECT co.user_id, co.role_label, u.firstname, u.surname, u.nickname, u.profile_picture
          FROM club_organizers co JOIN users u ON u.id = co.user_id
          WHERE co.club_id = ?
        `, [club.id]);
        return { ...club, members, organizers };
      });
      return NextResponse.json({ clubs: result });
    }

    if (type === 'treasure-summary') {
      const users = queryAll(db, `SELECT id, student_id, firstname, surname, nickname, profile_picture FROM users WHERE role = 'student'`);
      const totalSlots = 12;
      const summary = users.map((u: any) => {
        const solved = queryAll(db, `SELECT slot, answer, locked_at FROM user_treasure WHERE user_id = ? ORDER BY locked_at ASC`, [u.id]);
        const cd = queryOne(db, `SELECT checked_at FROM treasure_cooldowns WHERE user_id = ?`, [u.id]);
        const cooldownEnd = cd ? new Date(new Date(cd.checked_at).getTime() + 20 * 60 * 1000) : null;
        const hasCooldown = cooldownEnd && cooldownEnd > new Date();
        return {
          ...u, solvedCount: solved.length,
          completedAt: solved.length === totalSlots ? solved[solved.length - 1].locked_at : null,
          firstSolvedAt: solved.length > 0 ? solved[0].locked_at : null,
          slots: solved,
          cooldownEnd: hasCooldown ? cooldownEnd!.toISOString() : null,
        };
      });
      summary.sort((a: any, b: any) => {
        if (a.completedAt && b.completedAt) return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
        if (a.completedAt) return -1;
        if (b.completedAt) return 1;
        return b.solvedCount - a.solvedCount;
      });
      return NextResponse.json({ summary, totalSlots });
    }

    if (type === 'treasure-log') {
      const logs = queryAll(db, `
        SELECT tl.id, tl.user_id, tl.slot, tl.answer, tl.action, tl.performed_by, tl.created_at,
               u.firstname, u.surname, u.nickname, u.profile_picture, u.student_id
        FROM treasure_log tl JOIN users u ON u.id = tl.user_id
        ORDER BY tl.created_at DESC
      `);
      return NextResponse.json({ logs });
    }

    if (type === 'organizers') {
      const clubId = searchParams.get('clubId');
      const orgs = queryAll(db, `
        SELECT co.user_id, co.role_label, u.firstname, u.surname, u.nickname, u.profile_picture
        FROM club_organizers co JOIN users u ON u.id = co.user_id
        WHERE co.club_id = ?
      `, [clubId]);
      return NextResponse.json({ organizers: orgs });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { action } = body;

    if (action === 'assign-club') {
      const { userId, clubId, round, adminId } = body;
      // Block admin from enrolling themselves
      const targetUser = queryOne(db, `SELECT role FROM users WHERE id = ?`, [userId]);
      if (targetUser?.role === 'admin') return NextResponse.json({ error: 'Cannot enrol admin users' }, { status: 400 });

      const club = queryOne(db, `SELECT * FROM clubs WHERE id = ?`, [clubId]);
      if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });
      const memberCount = (queryOne(db, `SELECT COUNT(*) as cnt FROM club_registrations WHERE club_id = ? AND round = ?`, [clubId, round]) as any)?.cnt ?? 0;
      if (memberCount >= club.capacity) return NextResponse.json({ error: 'Club is full' }, { status: 400 });

      const existing = queryOne(db, `SELECT * FROM club_registrations WHERE user_id = ? AND round = ?`, [userId, round]);
      const now = new Date().toISOString();
      if (existing) {
        run(db, `INSERT INTO club_registration_log (user_id,club_id,round,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
          [userId, existing.club_id, round, 'admin_switched_away', `admin:${adminId}`, now]);
      }
      run(db, `INSERT OR REPLACE INTO club_registrations (user_id,club_id,round,registered_at,registered_by) VALUES (?,?,?,?,?)`,
        [userId, clubId, round, now, `admin:${adminId}`]);
      run(db, `INSERT INTO club_registration_log (user_id,club_id,round,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
        [userId, clubId, round, existing ? 'admin_switched_to' : 'admin_assigned', `admin:${adminId}`, now]);
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'remove-club') {
      const { userId, round, adminId } = body;
      const existing = queryOne(db, `SELECT * FROM club_registrations WHERE user_id = ? AND round = ?`, [userId, round]);
      if (existing) {
        run(db, `INSERT INTO club_registration_log (user_id,club_id,round,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
          [userId, existing.club_id, round, 'admin_removed', `admin:${adminId}`, new Date().toISOString()]);
        run(db, `DELETE FROM club_registrations WHERE user_id = ? AND round = ?`, [userId, Number(round)]);
      }
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'add-treasure') {
      const { userId, slot, adminId: aId } = body;
      const answers = queryAll(db, `SELECT slot, answer FROM treasure_answers`);
      const answerMap: Record<number, string> = {};
      answers.forEach((a: any) => { answerMap[a.slot] = a.answer; });
      const correctAnswer = answerMap[slot] ?? '';
      const now = new Date().toISOString();
      run(db, `INSERT OR REPLACE INTO user_treasure (user_id,slot,answer,locked_at) VALUES (?,?,?,?)`,
        [userId, slot, correctAnswer, now]);
      run(db, `INSERT INTO treasure_log (user_id,slot,answer,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
        [userId, slot, correctAnswer, 'admin_granted', `admin:${aId}`, now]);
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'remove-treasure') {
      const { userId, slot, adminId: aId2 } = body;
      const existing = queryOne(db, `SELECT answer FROM user_treasure WHERE user_id = ? AND slot = ?`, [userId, slot]);
      if (existing) {
        const now = new Date().toISOString();
        run(db, `DELETE FROM user_treasure WHERE user_id = ? AND slot = ?`, [userId, slot]);
        run(db, `INSERT INTO treasure_log (user_id,slot,answer,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
          [userId, slot, existing.answer, 'admin_removed', `admin:${aId2}`, now]);
      }
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'clear-cooldown') {
      const { userId, adminId: cdAdminId } = body;
      const now = new Date().toISOString();
      if (userId === 'all') {
        // Log for every user who had a cooldown
        const affected = queryAll(db, `SELECT user_id FROM treasure_cooldowns`);
        run(db, `DELETE FROM treasure_cooldowns`);
        for (const row of affected) {
          run(db, `INSERT INTO treasure_log (user_id,slot,answer,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
            [row.user_id, -1, '', 'cooldown_cleared', `admin:${cdAdminId}`, now]);
        }
      } else {
        run(db, `DELETE FROM treasure_cooldowns WHERE user_id = ?`, [userId]);
        run(db, `INSERT INTO treasure_log (user_id,slot,answer,action,performed_by,created_at) VALUES (?,?,?,?,?,?)`,
          [userId, -1, '', 'cooldown_cleared', `admin:${cdAdminId}`, now]);
      }
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'set-organizer') {
      const { clubId, userId, roleLabel } = body;
      run(db, `INSERT OR REPLACE INTO club_organizers (club_id,user_id,role_label) VALUES (?,?,?)`, [clubId, userId, roleLabel]);
      saveDb();
      return NextResponse.json({ success: true });
    }

    if (action === 'remove-organizer') {
      const { clubId, userId } = body;
      run(db, `DELETE FROM club_organizers WHERE club_id = ? AND user_id = ?`, [clubId, userId]);
      saveDb();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
