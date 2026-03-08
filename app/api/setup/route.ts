import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// GET: check if setup is required
export async function GET() {
  try {
    await connectDB();
    const adminCount = await User.countDocuments({ role: 'admin' });
    return NextResponse.json({ setupRequired: adminCount === 0 });
  } catch (err) {
    console.error('Setup GET Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database connection failed' },
      { status: 500 }
    );
  }
}

// POST: create initial admin (only works if no admin exists)
export async function POST(req: NextRequest) {
  await connectDB();
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
  }

  const { username, password, name } = await req.json();
  if (!username || !password || !name) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await User.create({ username: username.toLowerCase(), password: hashed, name, role: 'admin' });
  return NextResponse.json({ success: true });
}
