import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { run } from '@/lib/dbHelpers';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string;
    const id = formData.get('id') as string;

    if (!file || !type || !id)
      return NextResponse.json({ error: 'Missing file, type, or id' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type))
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret)
      return NextResponse.json({ error: 'Cloudinary not configured.' }, { status: 500 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const folder = `psc12/${type}s`;
    const public_id = `${type}_${id}_${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Signature = all params alphabetically (except file, api_key) + secret
    // No transformation/eager — keep it simple, just upload as-is
    const sigString = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(sigString).digest('hex');

    const cloudForm = new FormData();
    cloudForm.append('file', dataUri);
    cloudForm.append('api_key', apiKey);
    cloudForm.append('timestamp', String(timestamp));
    cloudForm.append('signature', signature);
    cloudForm.append('folder', folder);
    cloudForm.append('public_id', public_id);
    // No eager, no transformation — Cloudinary will store original

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: cloudForm }
    );

    const cloudData = await cloudRes.json();
    if (!cloudRes.ok)
      return NextResponse.json({ error: cloudData.error?.message ?? 'Upload failed' }, { status: 500 });

    const url: string = cloudData.secure_url;

    const db = await getDb();
    if (type === 'user') run(db, `UPDATE users SET profile_picture = ? WHERE id = ?`, [url, id]);
    else if (type === 'club') run(db, `UPDATE clubs SET image_url = ? WHERE id = ?`, [url, id]);
    saveDb();

    return NextResponse.json({ success: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
