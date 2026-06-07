import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LoginButton from '@/components/LoginButton';

export const metadata = { title: 'Login' };

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-brand-950 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white text-2xl font-bold font-display mb-4 shadow-lg shadow-brand-900/50">
            OA
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Office Attendance System</h1>
          <p className="text-surface-400 text-sm mt-1">MJ Agro Trading (Pvt) Ltd</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white font-display mb-1">Sign in to continue</h2>
          <p className="text-surface-400 text-sm mb-6">Use your approved Google account. Employees must be on office Wi-Fi.</p>

          <LoginButton />

          <div className="mt-6 space-y-2 text-xs text-surface-500">
            <p>✅ CEO/Super Admin can sign in from any location.</p>
            <p>🏢 Employees must be connected to office Wi-Fi (119.73.100.243).</p>
            <p>🔒 Only approved Google accounts are permitted.</p>
          </div>
        </div>

        <p className="text-center text-surface-600 text-xs mt-6">
          Office hours: 11:00–19:00 PKT · Weekly off: Sunday
        </p>
      </div>
    </div>
  );
}
