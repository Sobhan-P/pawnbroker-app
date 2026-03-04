'use client';

import { useEffect, useState } from 'react';
import { IUser } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'employee' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Change password state
  const [changePwdUserId, setChangePwdUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const data = await fetch('/api/users').then((r) => r.json());
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || 'Failed to create user');
    } else {
      setShowForm(false);
      setForm({ username: '', password: '', name: '', role: 'employee' });
      loadUsers();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete user');
    } else {
      loadUsers();
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError('');
    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters');
      return;
    }
    setPwdSubmitting(true);
    const res = await fetch(`/api/users/${changePwdUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    setPwdSubmitting(false);
    if (!res.ok) {
      setPwdError(data.error || 'Failed to change password');
    } else {
      setChangePwdUserId(null);
      setNewPassword('');
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage employee accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          + Add Employee
        </button>
      </div>

      {/* Change Password Modal */}
      {changePwdUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-800 mb-1">Change Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Changing password for: <strong>{users.find((u) => u._id === changePwdUserId)?.name}</strong>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="MIN 8 CHARACTERS"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
              {pwdError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwdError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={pwdSubmitting} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {pwdSubmitting ? 'Saving...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setChangePwdUserId(null); setNewPassword(''); setPwdError(''); }} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">New Employee Account</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input placeholder="FULL NAME" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input placeholder="USERNAME" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" autoComplete="new-password" placeholder="MIN 8 CHARACTERS" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No users found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50 text-blue-800 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      {u.role === 'admin' && (
                        <button
                          onClick={() => { setChangePwdUserId(u._id); setNewPassword(''); setPwdError(''); }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                        >
                          Change Password
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
