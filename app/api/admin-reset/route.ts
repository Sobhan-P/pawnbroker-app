import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

/**
 * POST /api/admin-reset
 * Deletes all existing admin accounts and creates a new one.
 * Protected by CRON_SECRET — pass it as Authorization: Bearer <secret>
 *
 * Body: { username, password, name }
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, password, name } = await req.json();
  if (!username || !password || !name) {
    return NextResponse.json({ error: 'username, password and name are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  await connectDB();

  // Remove all existing admins, then create fresh admin
  await User.deleteMany({ role: 'admin' });
  const hashed = await bcrypt.hash(password, 12);
  await User.create({ username: username.toLowerCase(), password: hashed, name, role: 'admin' });

  return NextResponse.json({ success: true, message: 'Admin account reset successfully.' });
}
