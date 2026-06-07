/**
 * Gmail API sender using OAuth2 refresh token
 */
import { google } from 'googleapis';

function getGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail API credentials not configured.');
  }
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return { gmail: google.gmail({ version: 'v1', auth }), sender: GMAIL_SENDER_EMAIL || 'mjagrogroupe@gmail.com' };
}

function buildRawMessage(to: string, subject: string, htmlBody: string, sender: string): string {
  const lines = [
    `From: ${sender}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const { gmail, sender } = getGmailClient();
  const raw = buildRawMessage(to, subject, htmlBody, sender);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

// ─── Email Templates ──────────────────────────────────────────────────────────
export function attendanceReminderTemplate(name: string, window: string): string {
  return `<p>Dear ${name},</p><p>This is a reminder to mark your attendance. The attendance window closes at <strong>${window}</strong>.</p><p>Please log in to the Office Attendance System and mark your attendance now.</p>`;
}

export function commitmentReminderTemplate(name: string): string {
  return `<p>Dear ${name},</p><p>You have not yet submitted your <strong>Daily Work Commitment</strong> for today.</p><p>Please submit it as soon as possible via the Office Attendance System.</p>`;
}

export function progressReminderTemplate(name: string, window: string): string {
  return `<p>Dear ${name},</p><p>The Daily Progress Reporting window is now open (<strong>${window}</strong>).</p><p>Please submit your progress report for all active assigned tasks.</p>`;
}

export function taskDeadlineReminderTemplate(name: string, taskTitle: string, dueDate: string): string {
  return `<p>Dear ${name},</p><p>Task <strong>"${taskTitle}"</strong> is due on <strong>${dueDate}</strong>.</p><p>Please update the task status or mark it Ready for Review.</p>`;
}

export function ceoSummaryTemplate(data: {
  date: string;
  present: string[];
  late: string[];
  absent: string[];
  missingCommitment: string[];
  submittedProgress: string[];
  missingProgress: string[];
  tasksDueToday: string[];
  overdueTasks: string[];
  pendingApproval: string[];
  blockedTasks: string[];
  noActivityTasks: string[];
}): string {
  const list = (items: string[]) =>
    items.length ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '<p style="color:#6b7280">None</p>';

  return `
<div style="font-family:sans-serif;max-width:700px;margin:0 auto">
  <h2 style="color:#0c4a6e">📊 End-of-Day Summary — ${data.date}</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px;background:#f0f9ff;font-weight:bold;width:40%">✅ Present</td><td style="padding:8px">${list(data.present)}</td></tr>
    <tr><td style="padding:8px;background:#fffbeb;font-weight:bold">⏰ Late</td><td style="padding:8px">${list(data.late)}</td></tr>
    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold">❌ Absent / No Entry</td><td style="padding:8px">${list(data.absent)}</td></tr>
    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold">📋 Missing Commitment</td><td style="padding:8px">${list(data.missingCommitment)}</td></tr>
    <tr><td style="padding:8px;background:#f0f9ff;font-weight:bold">📝 Progress Submitted</td><td style="padding:8px">${list(data.submittedProgress)}</td></tr>
    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold">⚠️ Missing Progress</td><td style="padding:8px">${list(data.missingProgress)}</td></tr>
    <tr><td style="padding:8px;background:#fffbeb;font-weight:bold">📅 Tasks Due Today</td><td style="padding:8px">${list(data.tasksDueToday)}</td></tr>
    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold">🔴 Overdue Tasks</td><td style="padding:8px">${list(data.overdueTasks)}</td></tr>
    <tr><td style="padding:8px;background:#f0fdf4;font-weight:bold">👀 Pending Approval</td><td style="padding:8px">${list(data.pendingApproval)}</td></tr>
    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold">🚧 Blocked Tasks</td><td style="padding:8px">${list(data.blockedTasks)}</td></tr>
    <tr><td style="padding:8px;background:#f5f3ff;font-weight:bold">💤 No Activity Today</td><td style="padding:8px">${list(data.noActivityTasks)}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px;margin-top:20px">Sent automatically by Office Attendance System at end of working day.</p>
</div>`;
}
