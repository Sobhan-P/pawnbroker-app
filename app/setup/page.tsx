'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/setup')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Server error' }));
          throw new Error(data.error || 'Failed to check setup status');
        }
        return res.json();
      })
      .then((data) => {
        if (!data.setupRequired) setAlreadySetup(true);
        setChecking(false);
      })
      .catch((err) => {
        setError(err.message);
        setChecking(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password, name: form.name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Setup failed');
    } else {
      router.push('/login');
    }
  }

  if (checking) return null;

  if (alreadySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Admin account already exists.</p>
          <a href="/login" className="text-blue-600 hover:underline font-medium">Go to Login →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">SB Finance</h1>
          <p className="text-sm text-gray-500 mt-1">First-time Setup — Create Admin Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="FULL NAME"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              placeholder="USERNAME"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              placeholder="MIN 6 CHARACTERS"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              placeholder="CONFIRM PASSWORD"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
