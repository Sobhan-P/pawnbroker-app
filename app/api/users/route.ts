import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const users = await User.find({}, '-password').sort({ createdAt: -1 });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { username, password, name, role } = await req.json();

  if (!username || !password || !name) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    username: username.toLowerCase(),
    password: hashed,
    name,
    role: role || 'employee',
  });

  await AuditLog.create({
    action: 'user_created',
    performedBy: session.user.id,
    performedByName: session.user.name,
    details: `Created ${role || 'employee'} account for ${name} (${username})`,
  });

  const { password: _pw, ...safeUser } = user.toObject();
  void _pw;
  return NextResponse.json(safeUser, { status: 201 });
}
