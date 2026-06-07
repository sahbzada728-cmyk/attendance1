/**
 * Google Sheets Seeder
 * Run: npm run seed:sheets
 *
 * Creates all 13 sheet tabs, writes headers, and seeds:
 *   - CEO/Super Admin user
 *   - 2 employee records
 *   - Default office settings
 *   - Pakistan public holidays 2025–2026
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ensureHeaders, appendRow, getAllRows, makeId } from '../src/lib/sheets';
import { PK_HOLIDAYS_2025_2026 } from '../src/lib/business';

async function main() {
  console.log('🔧 Setting up Google Sheets...\n');

  // 1. Create all tabs + write headers
  console.log('📋 Creating sheet tabs and writing headers...');
  await ensureHeaders();
  console.log('   ✓ All 13 tabs ready\n');

  // 2. Office Settings
  console.log('⚙️  Seeding office settings...');
  const existing = await getAllRows<any>('Office_Settings');
  if (!existing.find(r => r.setting_id === 'default')) {
    await appendRow('Office_Settings', {
      setting_id: 'default',
      office_start_time: '11:00',
      office_end_time: '19:00',
      timezone: 'Asia/Karachi',
      attendance_grace_minutes: 20,
      grace_period_configurable: true,
      progress_report_window_minutes: 30,
      weekly_off_day: 'Sunday',
      employee_ip_restriction_enabled: true,
      allowed_public_ipv4_addresses: '119.73.100.243',
      allowed_ipv6_prefixes: '2407:aa80:314:8ad4::/64',
      ceo_any_ip_login_enabled: true,
      testing_mode: false,
      emergency_override_enabled: false,
      updated_by: 'seed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('   ✓ Default office settings seeded');
  } else {
    console.log('   ⏭  Office settings already exist — skipped');
  }

  // 3. CEO User
  console.log('\n👑 Seeding CEO/Super Admin user...');
  const users = await getAllRows<any>('Users');
  const ceoEmail = process.env.CEO_SUPER_ADMIN_EMAIL || 'mjagrogroupe@gmail.com';
  if (!users.find(u => u.email.toLowerCase() === ceoEmail.toLowerCase())) {
    await appendRow('Users', {
      user_id: makeId('usr'),
      email: ceoEmail,
      full_name: 'CEO / Super Admin',
      role: 'CEO_SUPER_ADMIN',
      employee_id: '',
      is_active: true,
      can_login_from_any_ip: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log(`   ✓ CEO user seeded: ${ceoEmail}`);
  } else {
    console.log(`   ⏭  CEO user already exists — skipped`);
  }

  // 4. Employee records
  console.log('\n👥 Seeding employee records...');
  const employees = await getAllRows<any>('Employees');
  const now = new Date().toISOString();

  const emp1 = {
    employee_id: makeId('emp'),
    employee_no: 1,
    full_name: 'Mr Ali Janjua',
    email: 'gac4ali@gmail.com',
    role_position: 'Account & Admin Officer',
    department: 'Accounts & Administration',
    status: 'Active',
    office_timing_group: 'default',
    access_rule: 'Office Wi-Fi/IP only',
    ssid: 'Tavaazo 2.4G',
    wifi_protocol: 'Wi-Fi 4 / 802.11n',
    network_band: '2.4 GHz',
    network_channel: '7',
    local_ipv4_address: '192.168.18.6',
    ipv4_dns: '192.168.18.1',
    ipv6_addresses: '2407:aa80:314:8ad4::2, 2407:aa80:314:8ad4:6ca0:6e4:d18c:d63a',
    observed_ipv6_prefix: '2407:aa80:314:8ad4::/64',
    adapter_manufacturer: 'Realtek Semiconductor Corp.',
    adapter_description: 'Realtek RTL8188FTV Wireless LAN 802.11n USB 2.0 Network Adapter',
    driver_version: '1030.52.1216.2025',
    mac_address: '00-E0-21-33-15-6B',
    created_at: now,
    updated_at: now,
  };

  const emp2 = {
    employee_id: makeId('emp'),
    employee_no: 2,
    full_name: 'Mr Ali Asfyand',
    email: 'aliasfi0112@gmail.com',
    role_position: 'CTO',
    department: 'Technology / IT',
    status: 'Active',
    office_timing_group: 'default',
    access_rule: 'Office Wi-Fi/IP only',
    ssid: 'Tavaazo 5G',
    wifi_protocol: 'Wi-Fi 5 / 802.11ac',
    network_band: '5 GHz',
    network_channel: '157',
    local_ipv4_address: '192.168.18.7',
    ipv4_dns: '192.168.18.1',
    ipv6_addresses: '2407:aa80:314:8ad4::1, 2407:aa80:314:8ad4:cef:aa8c:847:a54a',
    observed_ipv6_prefix: '2407:aa80:314:8ad4::/64',
    adapter_manufacturer: 'Qualcomm Atheros Communications Inc.',
    adapter_description: 'Qualcomm QCA9377 802.11ac Wireless Adapter',
    driver_version: '12.0.0.722',
    mac_address: 'D8-0F-99-6D-B8-7F',
    created_at: now,
    updated_at: now,
  };

  for (const emp of [emp1, emp2]) {
    if (!employees.find(e => e.email.toLowerCase() === emp.email.toLowerCase())) {
      await appendRow('Employees', emp);
      // Also seed Users record for each employee
      if (!users.find(u => u.email.toLowerCase() === emp.email.toLowerCase())) {
        await appendRow('Users', {
          user_id: makeId('usr'),
          email: emp.email,
          full_name: emp.full_name,
          role: 'EMPLOYEE',
          employee_id: emp.employee_id,
          is_active: true,
          can_login_from_any_ip: false,
          created_at: now,
          updated_at: now,
        });
      }
      console.log(`   ✓ Employee seeded: ${emp.full_name} (${emp.email})`);
    } else {
      console.log(`   ⏭  Employee already exists: ${emp.email} — skipped`);
    }
  }

  // 5. Pakistan Public Holidays
  console.log('\n🗓️  Seeding Pakistan public holidays 2025–2026...');
  const existingHolidays = await getAllRows<any>('Holidays');
  const existingDates = new Set(existingHolidays.map(h => h.holiday_date));
  let holidaysAdded = 0;

  for (const h of PK_HOLIDAYS_2025_2026) {
    if (!existingDates.has(h.date)) {
      await appendRow('Holidays', {
        holiday_id: makeId('hol'),
        holiday_name: h.name,
        holiday_date: h.date,
        holiday_type: 'Pakistan Public Holiday',
        country: 'Pakistan',
        is_working_day: false,
        created_by: 'seed',
        created_at: now,
        updated_at: now,
      });
      holidaysAdded++;
    }
  }
  console.log(`   ✓ ${holidaysAdded} holidays added (${PK_HOLIDAYS_2025_2026.length - holidaysAdded} already existed)`);

  console.log('\n✅ Seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Next steps:');
  console.log('  1. Open your Google Sheet and verify all 13 tabs exist');
  console.log('  2. Check the Users, Employees, Office_Settings, and Holidays tabs');
  console.log('  3. npm run build  →  npm run start  →  test login');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
