'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

const NO_NAVBAR_PREFIXES = ['/login', '/signup', '/forgot-password', '/support-chat'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = NO_NAVBAR_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
}

