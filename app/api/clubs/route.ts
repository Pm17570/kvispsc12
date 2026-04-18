import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, queryOne, run } from '@/lib/dbHelpers';

function fmtClub(c: any, members: any[] = []) {
  return { id: c.id, name: c.name, description: c.description, type: c.type, capacity: c.capacity, imageUrl: c.image_url, members };
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const round = searchParams.get('round');
    const all = searchParams.get('all');

    let clubs: any[];
    if (all === '1') {
      clubs = queryAll(db, `SELECT * FROM clubs ORDER BY id`);
    } else if (round) {
      clubs = queryAll(db, `
        SELECT c.* FROM clubs c
        JOIN round_clubs rc ON rc.club_id = c.id
        WHERE rc.round = ?
        ORDER BY c.name
      `, [Number(round)]);
    } else {
      clubs = queryAll(db, `SELECT * FROM clubs ORDER BY name`);
    }

    const result = clubs.map(c => {
      let membersQuery = `
        SELECT cr.user_id, cr.round, cr.registered_at,
               u.firstname, u.surname, u.nickname, u.profile_picture
        FROM club_registrations cr JOIN users u ON u.id = cr.user_id
        WHERE cr.club_id = ?
      `;
      const params: any[] = [c.id];
      if (round) { membersQuery += ` AND cr.round = ?`; params.push(Number(round)); }
      membersQuery += ` ORDER BY cr.registered_at ASC`;
      const members = queryAll(db, membersQuery, params);
      return fmtClub(c, members);
    });

    return NextResponse.json({ clubs: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const id = `c${Date.now()}`;
    run(db, `INSERT INTO clubs (id,name,description,type,capacity,image_url) VALUES (?,?,?,?,?,?)`,
      [id, body.name, body.description ?? '', body.type ?? 'General', body.capacity ?? 20, body.imageUrl ?? '']);
    // Assign to requested rounds
    if (body.rounds && Array.isArray(body.rounds)) {
      for (const r of body.rounds) {
        run(db, `INSERT OR IGNORE INTO round_clubs (round,club_id) VALUES (?,?)`, [r, id]);
      }
    }
    saveDb();
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { id, name, description, type, capacity, imageUrl, rounds } = body;
    if (name !== undefined) run(db, `UPDATE clubs SET name=? WHERE id=?`, [name, id]);
    if (description !== undefined) run(db, `UPDATE clubs SET description=? WHERE id=?`, [description, id]);
    if (type !== undefined) run(db, `UPDATE clubs SET type=? WHERE id=?`, [type, id]);
    if (capacity !== undefined) run(db, `UPDATE clubs SET capacity=? WHERE id=?`, [capacity, id]);
    if (imageUrl !== undefined) run(db, `UPDATE clubs SET image_url=? WHERE id=?`, [imageUrl, id]);
    if (rounds !== undefined) {
      run(db, `DELETE FROM round_clubs WHERE club_id=?`, [id]);
      for (const r of rounds) run(db, `INSERT OR IGNORE INTO round_clubs (round,club_id) VALUES (?,?)`, [r, id]);
    }
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
    const id = searchParams.get('id');
    run(db, `DELETE FROM club_registrations WHERE club_id=?`, [id]);
    run(db, `DELETE FROM round_clubs WHERE club_id=?`, [id]);
    run(db, `DELETE FROM clubs WHERE id=?`, [id]);
    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
