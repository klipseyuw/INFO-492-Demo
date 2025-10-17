'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doLogout() {
    setLoading(true);
    try {
      // Try POST first; if the route only supports GET, fall back.
      let res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.status === 405 || res.status === 404) {
        res = await fetch('/api/auth/logout', { method: 'GET' });
      }

      // Clear any dev override (non-HttpOnly) so role routing resets in dev
      document.cookie = 'devRole=; Max-Age=0; Path=/';

      // Hard navigate to login to ensure a clean state
      router.replace('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout failed', e);
      // As a last resort, force navigation
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={doLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      title="Sign out"
    >
      {loading ? 'Signing out…' : 'Log out'}
    </button>
  );
}
