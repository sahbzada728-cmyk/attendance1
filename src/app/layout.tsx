import type { Metadata } from 'next';
import { Sora, DM_Sans } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SessionProvider from '@/components/SessionProvider';
import Sidebar from '@/components/Sidebar';
import '@/styles/globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Office Attendance System', template: '%s | OAS' },
  description: 'Office Attendance, Daily Commitment, Task Assignment & Progress Reporting',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-surface-50">
        <SessionProvider session={session}>
          {session ? (
            <div className="flex min-h-screen">
              <Sidebar
                role={session.user?.role as string}
                name={session.user?.name || ''}
                email={session.user?.email || ''}
              />
              <main className="flex-1 ml-64 p-8 fade-in">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          ) : (
            <main>{children}</main>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
