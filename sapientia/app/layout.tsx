import type { Metadata } from 'next';
import { VT323 } from 'next/font/google';
import { LanguageSync } from '@/shared/i18n/LanguageSync';
import { ThemeSync } from '@/shared/theme/ThemeSync';
import { ToastProvider } from '@/shared/feedback/ToastProvider';
import './globals.css';

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
});

export const metadata: Metadata = {
  title: 'Sapientia',
  description: 'Sapientia: papan pelajar dan penyelarasan tugasan sekolah.',
  icons: { icon: '/brand/sapientia-logo.jpg' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // Theme and language default to dark and Bahasa Melayu; the client syncs the saved choice after hydration.
    <html lang="ms" data-theme="dark" data-skin="stone" data-frame="bracket" className={vt323.variable} suppressHydrationWarning>
      <body>
        <LanguageSync />
        <ThemeSync />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
