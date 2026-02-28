import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  const { image, folder } = await req.json();
  if (!image || !folder) {
    return NextResponse.json({ error: 'Missing image or folder' }, { status: 400 });
  }
  const url = await uploadImage(image, folder);
  return NextResponse.json({ url });
}
