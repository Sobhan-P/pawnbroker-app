import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const { image, folder } = await req.json();
    if (!image || !folder) {
      return NextResponse.json({ error: 'Missing image or folder' }, { status: 400 });
    }
    const url = await uploadImage(image, folder);
    return NextResponse.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[Cloudinary Upload Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
