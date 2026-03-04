import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;
  const { newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(id, { password: hashed });

  await AuditLog.create({
    action: 'password_changed',
    performedBy: session.user.id,
    performedByName: session.user.name,
    details: `Changed password for ${user.role} account: ${user.name} (${user.username})`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  // Prevent deleting self
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Prevent deleting the last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin account' }, { status: 400 });
    }
  }

  await AuditLog.create({
    action: 'user_deleted',
    performedBy: session.user.id,
    performedByName: session.user.name,
    details: `Deleted ${user.role} account: ${user.name} (${user.username})`,
  });

  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
