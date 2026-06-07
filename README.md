# Office Attendance, Daily Commitment, Task Assignment & Progress Reporting System

**MJ Agro Trading (Pvt) Ltd — Internal Operations Platform**

Production-ready Next.js 14 application replacing WhatsApp-based task follow-up with a formal, role-based, auditable workflow.

---

## Quick Start

```bash
# 1. Copy environment config
cp .env.example .env.local

# 2. Fill all credentials in .env.local (see setup guide below)

# 3. Install dependencies
npm install

# 4. Type-check
npm run typecheck

# 5. Seed Google Sheets (once)
npm run seed:sheets

# 6. Start development server
npm run dev
# → Open http://localhost:3000
```

---

## Production Setup Guide

### Step 1 — Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: **Office Attendance System**
3. Enable **Google OAuth** via APIs & Services → Credentials
4. Create OAuth 2.0 Client ID → Application type: **Web application**
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)
6. Copy Client ID → `GOOGLE_CLIENT_ID`
7. Copy Client Secret → `GOOGLE_CLIENT_SECRET`
8. Generate NextAuth secret: `openssl rand -base64 32` → `NEXTAUTH_SECRET`

### Step 2 — Google Sheets (Service Account)

1. In Google Cloud Console → APIs & Services → Enable **Google Sheets API**
2. IAM & Admin → Service Accounts → Create Service Account
   - Name: `office-attendance-sheets`
3. Create JSON key → download the file
4. From the JSON:
   - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY` (keep the `\n` characters)
5. Create a new [Google Sheet](https://sheets.new)
6. Share the sheet with the service account email (Editor access)
7. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`
   → `GOOGLE_SHEETS_SPREADSHEET_ID`
8. Run: `npm run seed:sheets`

### Step 3 — Gmail API (for email notifications)

1. In Google Cloud Console → Enable **Gmail API**
2. OAuth consent screen → add Gmail scope: `https://www.googleapis.com/auth/gmail.send`
3. Create OAuth 2.0 credentials (same or new client)
4. Use [OAuth Playground](https://developers.google.com/oauthplayground/) to generate refresh token:
   - Authorize: `https://mail.google.com/`
   - Exchange for refresh token
5. Fill in:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`
   - `GMAIL_SENDER_EMAIL=mjagrogroupe@gmail.com`

### Step 4 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard → Settings → Environment Variables
# Add all variables from .env.example
```

The `vercel.json` includes cron job configuration for automated reminders.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `NEXTAUTH_SECRET` | Random 32-char secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Full deployment URL (e.g., `https://oas.vercel.app`) |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account email |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheet ID |
| `GMAIL_CLIENT_ID` | Gmail OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token |
| `GMAIL_SENDER_EMAIL` | Sender email (mjagrogroupe@gmail.com) |
| `CEO_SUPER_ADMIN_EMAIL` | CEO email (mjagrogroupe@gmail.com) |
| `EMPLOYEE_EMAILS` | Comma-separated employee emails |
| `EMPLOYEE_IP_RESTRICTION_ENABLED` | `true` in production |
| `ALLOWED_PUBLIC_IPV4_ADDRESSES` | `119.73.100.243` |
| `ALLOWED_IPV6_PREFIXES` | `2407:aa80:314:8ad4::/64` |
| `CEO_ANY_IP_LOGIN_ENABLED` | `true` |
| `TESTING_MODE` | `false` in production |
| `CRON_SECRET` | Random secret for cron endpoint protection |

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   Google OAuth handler
│   │   ├── attendance/           GET/POST/PATCH
│   │   ├── commitments/          GET/POST
│   │   ├── tasks/                GET/POST/PATCH
│   │   ├── tasks/[id]/           GET (detail), POST (subtask/comment)
│   │   ├── progress/             GET/POST (window enforced)
│   │   ├── admin/employees/      GET/POST/PATCH (CEO only)
│   │   ├── admin/settings/       GET/PATCH (CEO only)
│   │   ├── admin/holidays/       GET/POST/PATCH (CEO only)
│   │   ├── admin/reports/        CSV export (CEO only)
│   │   └── cron/                 Email reminders (secret-protected)
│   ├── dashboard/                CEO (10 KPIs) + Employee views
│   ├── attendance/               Mark + CEO override + records
│   ├── commitments/              Submit + records
│   ├── tasks/                    Board + filter + status update
│   ├── tasks/[id]/               Detail + subtasks + comments + approve/reject
│   ├── progress/                 Per-task progress forms + window timer
│   ├── reports/                  CSV export + manual email triggers
│   ├── audit-log/                Full audit trail
│   ├── ip-access-log/            IP access attempts
│   └── admin/
│       ├── employees/            CRUD employee management
│       ├── settings/             Office timing + IP config
│       └── holidays/             Holiday calendar + seed PK holidays
├── lib/
│   ├── sheets.ts                 Google Sheets repository layer
│   ├── auth.ts                   NextAuth config + role mapping
│   ├── api.ts                    requireUser() + audit/IP logging helpers
│   ├── ip.ts                     canAccessSystem() IPv4 + IPv6 matching
│   ├── time.ts                   Attendance window + progress window (PKT)
│   ├── business.ts               isWorkingDay() + PK holiday baseline
│   ├── gmail.ts                  Gmail API sender + 5 email templates
│   └── validation.ts             8 Zod schemas for all forms
└── types/index.ts                15 TypeScript interfaces
```

---

## Business Rules

| Rule | Implementation |
|------|---------------|
| CEO login from any IP | `canAccessSystem()` in `lib/ip.ts` |
| Employees from office IP only | Server-observed `x-forwarded-for` |
| Attendance window 11:00–11:20 | `attendanceWindow()` in `lib/time.ts` |
| Progress window 18:30–19:00 | `progressWindow()` auto-adjusts to office_end_time |
| No attendance on Sunday/holidays | `isWorkingDay()` in `lib/business.ts` |
| Only CEO approves task completion | PATCH `/api/tasks` role check |
| No Activity Today requires reason | Zod `progressSchema.superRefine()` |
| Blocked requires blocker reason | Zod `progressSchema.superRefine()` |
| All actions audit-logged | `auditLog()` in `lib/api.ts` |
| All IP attempts logged | `logIpAccess()` in `lib/api.ts` |

---

## Cron Schedule (Vercel)

| Job | Schedule (UTC) | PKT Time | Purpose |
|-----|---------------|----------|---------|
| `attendance_reminder` | Mon–Sat 06:00 | 11:00 | Remind before grace period ends |
| `commitment_reminder` | Mon–Sat 07:30 | 12:30 | Remind if commitment not submitted |
| `progress_reminder` | Mon–Sat 13:30 | 18:30 | Alert: progress window opens |
| `ceo_summary` | Mon–Sat 14:15 | 19:15 | End-of-day summary to CEO |

> For non-Vercel deployments, configure these endpoints using your hosting provider's cron or an external service like Render Cron, Railway Cron, or cron-job.org.
> Protect with `x-cron-secret` header or `?secret=CRON_SECRET` query param.

---

## Google Sheets Tabs

| Tab | Purpose |
|-----|---------|
| `Users` | Auth records for all users |
| `Employees` | Employee roster + network info |
| `Office_Settings` | Configurable office timing + IP rules |
| `Holidays` | Public + company holiday calendar |
| `Attendance` | Daily attendance records |
| `Daily_Commitments` | Daily work commitment submissions |
| `Tasks` | Task assignment + status tracking |
| `Subtasks` | Subtasks under tasks |
| `Comments` | Task/subtask comments |
| `Daily_Task_Progress` | Progress reports per task per day |
| `Notifications` | Email notification log |
| `IP_Access_Log` | All login/access attempts |
| `Audit_Log` | All critical business actions |

---

## Office IP Configuration

The system uses **server-observed public IP** — never the employee's local LAN IP.

```
Office Public IP:     119.73.100.243
Wi-Fi SSIDs:          Tavaazo 2.4G, Tavaazo 5G
IPv6 Prefix:          2407:aa80:314:8ad4::/64
```

If the ISP changes the office IP:
1. Log in as CEO from any location
2. Go to **Admin → Office Settings → IP Access Control**
3. Update **Approved Office Public IPv4**
4. Save

If employees are locked out before you can update:
- Enable **Emergency Override** (temporarily allows all approved users from any IP)

---

## Pre-Go-Live Checklist

```
□ Google OAuth credentials configured
□ NEXTAUTH_URL set to production domain
□ Google Sheets created, service account added as Editor
□ npm run seed:sheets completed successfully
□ Gmail API refresh token generated and working
□ TESTING_MODE=false in production
□ EMPLOYEE_IP_RESTRICTION_ENABLED=true
□ CRON_SECRET set to random value
□ Deployed to Vercel / Railway / Render
□ Cron jobs verified in hosting dashboard
□ CEO login tested from outside office — should work
□ Employee login tested from office Wi-Fi — should work
□ Employee login tested from mobile data — should be BLOCKED
□ Attendance marked successfully (between 11:00–11:20)
□ Attendance blocked outside window
□ Daily commitment submitted
□ Task assigned by CEO
□ Employee updated task status
□ Progress submitted between 18:30–19:00
□ CEO approved task
□ CEO rejected task with reason
□ CEO received end-of-day summary email
□ Reports exported to CSV
□ Audit log shows all actions
□ IP access log shows CEO bypass + employee allowed
```

---

## Approved Users

| User | Email | Role | IP Restriction |
|------|-------|------|---------------|
| CEO / Super Admin | mjagrogroupe@gmail.com | CEO_SUPER_ADMIN | None (any IP) |
| Mr Ali Janjua | gac4ali@gmail.com | EMPLOYEE | Office IP only |
| Mr Ali Asfyand | aliasfi0112@gmail.com | EMPLOYEE | Office IP only |

To add more employees:
1. Admin → Employee Management → Add Employee
2. The new employee's Gmail address is automatically added to the approved list
3. They can log in immediately from office Wi-Fi

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS (Sora + DM Sans fonts) |
| Auth | NextAuth.js + Google OAuth |
| Database | Google Sheets via googleapis |
| Email | Gmail API (OAuth2 refresh token) |
| Validation | Zod |
| Time | date-fns + date-fns-tz (Asia/Karachi) |
| Deployment | Vercel (recommended) |

---

*Built for MJ Agro Trading (Pvt) Ltd — SECP CUIN 0269053*
*Timezone: Asia/Karachi (PKT, UTC+5)*
