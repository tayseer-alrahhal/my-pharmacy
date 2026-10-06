'use client';

import { useEffect, useState } from 'react';

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-on-primary text-[28px]">medication</span>
          </div>
          <p className="text-on-surface-variant text-body-md">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
