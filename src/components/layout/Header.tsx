'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const onSettings = pathname === '/settings';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-12 flex-shrink-0 items-center justify-center">
          <img src="/logo.png" alt="CARS24" className="h-full w-full object-contain" loading="eager" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-gray-900">Marketing Assistant</span>
      </Link>

      <Link
        href={onSettings ? '/' : '/settings'}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title={onSettings ? 'Back to chat' : 'Settings'}
      >
        {onSettings ? <MessageSquare className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        <span>{onSettings ? 'Chat' : 'Settings'}</span>
      </Link>
    </header>
  );
};
