'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenValid, clearToken } from '../../lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isTokenValid()) {
      router.push('/login');
      return;
    }
    setReady(true);

    const interval = setInterval(() => {
      if (!isTokenValid()) {
        clearToken();
        router.push('/login');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
