export function statusBadgeClass(status: string): string {
  const s = status?.toLowerCase() || '';
  if (['present', 'approved', 'approved / completed', 'work done', 'submitted', 'active'].some(x => s.includes(x))) return 'badge-green';
  if (['late', 'in progress', 'pending'].some(x => s.includes(x))) return 'badge-yellow';
  if (['absent', 'rejected', 'overdue', 'no attendance'].some(x => s.includes(x))) return 'badge-red';
  if (['ready for review', 'assigned'].some(x => s.includes(x))) return 'badge-blue';
  if (['blocked', 'urgent'].some(x => s.includes(x))) return 'badge-orange';
  if (['no activity', 'no entry', 'cancelled', 'inactive'].some(x => s.includes(x))) return 'badge-gray';
  if (['high'].some(x => s.includes(x))) return 'badge-orange';
  if (['low'].some(x => s.includes(x))) return 'badge-gray';
  return 'badge-gray';
}

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{status || '—'}</span>;
}
