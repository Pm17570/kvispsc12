import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { run } from '@/lib/dbHelpers';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'user' | 'club'
    const id = formData.get('id') as string;

    if (!file || !type || !id) {
      return NextResponse.json({ error: 'Missing file, type, or id' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
    }

    // Convert to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment variables.' }, { status: 500 });
    }

    const folder = `psc12/${type}s`;
    const public_id = `${type}_${id}_${Date.now()}`;

    // Use Cloudinary Upload API directly (no SDK needed)
    const timestamp = Math.floor(Date.now() / 1000);
    const str = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
    
    // Generate SHA1 signature
    const crypto = await import('crypto');
    const signature = crypto.createHash('sha1').update(str).digest('hex');

    const cloudForm = new FormData();
    cloudForm.append('file', dataUri);
    cloudForm.append('api_key', apiKey);
    cloudForm.append('timestamp', String(timestamp));
    cloudForm.append('signature', signature);
    cloudForm.append('folder', folder);
    cloudForm.append('public_id', public_id);
    cloudForm.append('transformation', 'w_400,h_400,c_fill,q_auto,f_auto');

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: cloudForm }
    );

    if (!cloudRes.ok) {
      const err = await cloudRes.json();
      return NextResponse.json({ error: err.error?.message ?? 'Cloudinary upload failed' }, { status: 500 });
    }

    const cloudData = await cloudRes.json();
    const url = cloudData.secure_url;

    // Update DB
    const db = await getDb();
    if (type === 'user') {
      run(db, `UPDATE users SET profile_picture = ? WHERE id = ?`, [url, id]);
    } else if (type === 'club') {
      run(db, `UPDATE clubs SET image_url = ? WHERE id = ?`, [url, id]);
    }
    saveDb();

    return NextResponse.json({ success: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
