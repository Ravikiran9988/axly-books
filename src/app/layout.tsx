import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

// The global shell uses pathname-aware navigation and client-side overlays.
// Allow routes to render through their request-time shell instead of forcing
// a static-shell validation that can fail on client navigation hooks.
export const instant = false;

export const metadata: Metadata = {
  title: 'AXLY Books — Digital Reading Platform by Slayer',
  description:
    'Discover and read books by Slayer (Medicharla Ravi Kiran) online for free. Explore technology, machine learning, deep learning, and thoughtful ideas in an elegant digital reading space.',
  keywords: [
    'AXLY',
    'AXLY Books',
    'Slayer',
    'Medicharla Ravi Kiran',
    'ML + Deep Learning Fundamentals',
    'Free Technical Books',
    'AI Books',
    'Deep Learning',
    'Generative AI',
  ],
  authors: [{ name: 'Slayer (Medicharla Ravi Kiran)' }],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
    apple: ['/icon.svg'],
  },
  openGraph: {
    title: 'AXLY Books — A World of Ideas, One Page at a Time',
    description:
      'Free digital reading platform for published works by Slayer. Featuring ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
