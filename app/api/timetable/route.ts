import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { queryAll, queryOne, run } from '@/lib/dbHelpers';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // student | staff | admin
    const adminAll = searchParams.get('adminAll'); // '1' = return all activities with full metadata
    // Admin preview: viewAsUserId overrides userId for myRole lookup, viewAsRole overrides role filter
    const viewAsUserId = searchParams.get('viewAsUserId') ?? userId;
    const viewAsRole = searchParams.get('viewAsRole') ?? role;

    // Get all activities
    const activities = queryAll(db, `
      SELECT a.*, COALESCE(av.audience, 'all') as audience
      FROM activities a
      LEFT JOIN activity_visibility av ON av.activity_id = a.id
      ORDER BY a.date ASC, a.time ASC
    `);

    const enriched = activities.map((a: any) => {
      // Get staff roles for this activity
      const staffRoles = queryAll(db, `
        SELECT asr.user_id, asr.role_label, asr.notes,
               u.firstname, u.surname, u.nickname, u.profile_picture
        FROM activity_staff_roles asr
        JOIN users u ON u.id = asr.user_id
        WHERE asr.activity_id = ?
      `, [a.id]);

      return {
        id: a.id, title: a.title, date: a.date, time: a.time,
        location: a.location, description: a.description, type: a.type,
        audience: a.audience,
        staffRoles,
        myRole: viewAsUserId ? staffRoles.find((r: any) => r.user_id === viewAsUserId) ?? null : null,
      };
    });

    if (adminAll === '1') {
      return NextResponse.json({ activities: enriched });
    }

    // Filter by role/audience (use viewAsRole for admin previews)
    const effectiveRole = viewAsRole ?? role;
    const filtered = enriched.filter((a: any) => {
      if (a.audience === 'all') return true;
      if (effectiveRole === 'student' && a.audience === 'student') return true;
      if (effectiveRole === 'staff' && a.audience === 'staff') return true;
      if (effectiveRole === 'staff' && a.audience === 'all') return true;
      if (effectiveRole === 'admin') return true;
      return false;
    });

    return NextResponse.json({ activities: filtered });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Update activity audience
export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { activityId, audience, staffRoles } = body;

    if (audience !== undefined) {
      run(db, `INSERT OR REPLACE INTO activity_visibility (activity_id, audience) VALUES (?,?)`, [activityId, audience]);
    }

    if (staffRoles !== undefined && Array.isArray(staffRoles)) {
      run(db, `DELETE FROM activity_staff_roles WHERE activity_id = ?`, [activityId]);
      for (const sr of staffRoles) {
        if (sr.user_id && sr.role_label) {
          run(db, `INSERT INTO activity_staff_roles (activity_id, user_id, role_label, notes) VALUES (?,?,?,?)`,
            [activityId, sr.user_id, sr.role_label, sr.notes ?? '']);
        }
      }
    }

    saveDb();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
