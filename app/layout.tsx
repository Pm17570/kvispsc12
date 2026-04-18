import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import ThemeScript from '@/components/ThemeScript';

export const metadata: Metadata = {
  title: 'PSC12 — Club Platform',
  description: 'PSC12 Club Registration & Activities Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
