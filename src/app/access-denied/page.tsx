import Link from 'next/link';

export const metadata = { title: 'Access Denied' };

export default function AccessDeniedPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams?.reason;

  const messages: Record<string, { title: string; body: string; icon: string }> = {
    unapproved_email: {
      title: 'Email Not Approved',
      body: 'Your Google email is not approved for this system. Contact the CEO/Super Admin to get access.',
      icon: '📧',
    },
    unapproved_ip: {
      title: 'Network Access Denied',
      body: 'Employee access is allowed only from the approved office Wi-Fi/IP (119.73.100.243). Please connect to office Wi-Fi (Tavaazo 2.4G or Tavaazo 5G) and try again.',
      icon: '🌐',
    },
    default: {
      title: 'Access Denied',
      body: 'You do not have permission to access this resource.',
      icon: '🔒',
    },
  };

  const msg = messages[reason || 'default'] || messages.default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 to-red-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">{msg.icon}</div>
        <h1 className="text-2xl font-bold text-white font-display mb-3">{msg.title}</h1>
        <p className="text-surface-300 mb-8 leading-relaxed">{msg.body}</p>
        <div className="space-y-3">
          <Link href="/login" className="block w-full btn-primary text-center py-3">
            Back to Login
          </Link>
          <p className="text-surface-500 text-sm">
            Need help? Contact <span className="text-surface-300">mjagrogroupe@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
