'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import SearchModal from './SearchModal';

function AppShellInner({
  children,
  searchOpen,
  setSearchOpen,
}: {
  children: React.ReactNode;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  // Check if we are in the dedicated interactive reader route (/read/...)
  const isReaderRoute = pathname ? pathname.startsWith('/read/') : false;

  return (
    <>
      {!isReaderRoute && <Header onOpenSearch={() => setSearchOpen(true)} />}
      <main id="main-content">{children}</main>
      {!isReaderRoute && <Footer />}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search on '/' (when not focused in an input) or Ctrl+K / Cmd+K
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Suspense fallback={<main id="main-content">{children}</main>}>
      <AppShellInner searchOpen={searchOpen} setSearchOpen={setSearchOpen}>
        {children}
      </AppShellInner>
    </Suspense>
  );
}
