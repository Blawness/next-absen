/**
 * E2E test: Auto-checkout at end of shift (piggyback sweep)
 *
 * Verifies the whole loop against a real DB and a real server:
 * 1. Admin enables auto-checkout + sets the shift end through the Settings UI
 * 2. A shift left open past its end is closed when a user simply opens the app
 *    (no cron job involved — the sweep piggybacks on the read request)
 * 3. The recorded checkout is the configured endTime, NOT the sweep time
 * 4. An existing note is preserved, not overwritten
 * 5. A shift whose end has not arrived is left untouched
 * 6. An "auto_check_out" ActivityLog is written for the record's owner
 *
 * The shift end is derived from the current clock (one hour ago) so the run
 * is deterministic regardless of the time of day. Because endTime resolves
 * against the check-in's own local date, the test needs the planted check-in
 * to land on today — so it refuses to run before 05:00 local.
 *
 * Usage:
 *   npm run dev
 *   node e2e/auto-checkout.mjs
 */

import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const CHROMIUM_PATH = '/home/blawness/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.env.BASE_URL || 'http://localhost:3004';

const SUPERADMIN = { email: 'superadmin@demo.com', password: 'password123' };
const WORKER = { email: 'user1@demo.com', password: 'password123' };

const MAX_WORK_HOURS = 12;
const EXISTING_NOTE = 'Catatan lama dari user';

// Shift end = one hour ago, so a check-in planted earlier today is already
// past its end and the sweep is due to close it right now.
const SHIFT_END = new Date(Date.now() - 60 * 60 * 1000);
SHIFT_END.setSeconds(0, 0);
const END_TIME = `${String(SHIFT_END.getHours()).padStart(2, '0')}:${String(SHIFT_END.getMinutes()).padStart(2, '0')}`;

// Hours the planted stale shift will have worked: check-in this far before
// the shift end, so the expected workHours is exactly this number.
const STALE_SHIFT_HOURS = 4;

// Dates far enough in the past that they cannot collide with real records
// on the [userId, date] unique constraint.
const STALE_DATE = new Date(Date.UTC(2020, 0, 6));
const FRESH_DATE = new Date(Date.UTC(2020, 0, 7));

const prisma = new PrismaClient();

const results = [];
function pass(name) { results.push({ test: name, pass: true }); console.log(`  PASS  ${name}`); }
function fail(name, err) { results.push({ test: name, pass: false, error: err }); console.log(`  FAIL  ${name}: ${err}`); }

async function login(page, { email, password }) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

async function main() {
  if (SHIFT_END.getHours() < STALE_SHIFT_HOURS + 1) {
    throw new Error(
      `Too early in the day to run this test (shift end would be ${END_TIME}). ` +
      `The planted check-in must land on the same local date as the shift end. Run after 05:00 local.`
    );
  }

  const worker = await prisma.user.findUnique({ where: { email: WORKER.email } });
  if (!worker) throw new Error(`Seed user ${WORKER.email} not found — run npm run db:seed`);

  const originalSettings = await prisma.systemSettings.findFirst();
  const originalBusinessHours = originalSettings?.businessHours ?? null;

  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // ── 1. Enable auto-checkout through the Settings UI ────────────────
    console.log('\n[1] Enable auto-checkout via Settings UI...');
    await login(page, SUPERADMIN);
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });

    const toggle = page.locator('#autoCheckoutEnabled');
    await toggle.waitFor({ state: 'visible', timeout: 15000 });

    if (await toggle.getAttribute('data-state') !== 'checked') {
      await toggle.click();
    }
    const hoursInput = page.locator('#maxWorkHours');
    await hoursInput.waitFor({ state: 'visible', timeout: 10000 });
    pass('Max work hours input appears once the toggle is on');

    await hoursInput.fill(String(MAX_WORK_HOURS));
    await page.locator('#endTime').fill(END_TIME);
    await page.getByRole('button', { name: /simpan/i }).first().click();
    await page.waitForTimeout(2500);

    const savedSettings = await prisma.systemSettings.findFirst();
    const savedHours = savedSettings?.businessHours ?? {};
    if (
      savedHours.autoCheckoutEnabled === true &&
      Number(savedHours.maxWorkHours) === MAX_WORK_HOURS &&
      savedHours.endTime === END_TIME
    ) {
      pass('Settings UI persists autoCheckoutEnabled + maxWorkHours + endTime');
    } else {
      fail('Settings UI persists autoCheckoutEnabled + maxWorkHours + endTime', JSON.stringify(savedHours));
      throw new Error('Cannot proceed without the feature enabled');
    }

    // ── 2. Plant one shift past its end and one not yet due ───────────
    console.log(`\n[2] Plant a shift that started ${STALE_SHIFT_HOURS}h before the ${END_TIME} shift end, and one that started just now...`);
    await prisma.absensiRecord.deleteMany({
      where: { userId: worker.id, date: { in: [STALE_DATE, FRESH_DATE] } },
    });

    // Ends at END_TIME, which is already an hour in the past → due now.
    const staleCheckIn = new Date(SHIFT_END.getTime() - STALE_SHIFT_HOURS * 60 * 60 * 1000);
    const stale = await prisma.absensiRecord.create({
      data: {
        userId: worker.id,
        date: STALE_DATE,
        checkInTime: staleCheckIn,
        checkOutTime: null,
        status: 'present',
        notes: EXISTING_NOTE,
      },
    });

    // Checked in after today's shift end, so the safety bound applies instead
    // and its checkout is still MAX_WORK_HOURS away → must stay untouched.
    const freshCheckIn = new Date(Date.now() - 10 * 60 * 1000);
    const fresh = await prisma.absensiRecord.create({
      data: {
        userId: worker.id,
        date: FRESH_DATE,
        checkInTime: freshCheckIn,
        checkOutTime: null,
        status: 'present',
      },
    });
    pass('Test records created');

    // ── 3. A plain user opening the app triggers the sweep ────────────
    // The in-process throttle may still be warm from other traffic, so poll
    // rather than assuming the very first page load does the work.
    console.log('\n[3] Open the dashboard as a normal user and wait for the sweep...');
    const workerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const workerPage = await workerContext.newPage();
    await login(workerPage, WORKER);

    let closed = null;
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await workerPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await workerPage.waitForTimeout(1500);
      const record = await prisma.absensiRecord.findUnique({ where: { id: stale.id } });
      if (record?.checkOutTime) { closed = record; break; }
      await workerPage.waitForTimeout(8000);
    }

    if (closed) pass('Stale shift is closed by a plain page visit (no cron)');
    else {
      fail('Stale shift is closed by a plain page visit (no cron)', 'still open after 90s');
      throw new Error('Sweep never ran');
    }

    // ── 4. Checkout time is derived, not "now" ────────────────────────
    console.log('\n[4] Verify the written values...');
    const expected = SHIFT_END;
    const driftMs = Math.abs(closed.checkOutTime.getTime() - expected.getTime());
    // The DB column has second precision; anything under 2s is storage rounding.
    if (driftMs < 2000) {
      pass(`checkOutTime = shift end ${END_TIME}, not the sweep time (drift ${driftMs}ms)`);
    } else {
      fail('checkOutTime = configured endTime', `expected ${expected.toISOString()}, got ${closed.checkOutTime.toISOString()}`);
    }

    if (Number(closed.workHours) === STALE_SHIFT_HOURS) pass(`workHours = ${STALE_SHIFT_HOURS}`);
    else fail(`workHours = ${STALE_SHIFT_HOURS}`, `got ${closed.workHours}`);

    if (closed.status === 'present') pass('status preserved');
    else fail('status preserved', `got ${closed.status}`);

    // ── 5. Existing note preserved, marker appended ───────────────────
    if (closed.notes?.includes(EXISTING_NOTE) && closed.notes?.includes('Auto checkout')) {
      pass('Existing note preserved and auto-checkout marker appended');
    } else {
      fail('Existing note preserved and marker appended', `notes=${JSON.stringify(closed.notes)}`);
    }

    // ── 6. The shift whose end has not arrived is untouched ───────────
    const freshAfter = await prisma.absensiRecord.findUnique({ where: { id: fresh.id } });
    if (freshAfter?.checkOutTime === null && freshAfter?.notes === null) {
      pass('Shift whose checkout is not yet due is left untouched');
    } else {
      fail('Shift whose checkout is not yet due is left untouched', `checkOutTime=${freshAfter?.checkOutTime}, notes=${freshAfter?.notes}`);
    }

    // ── 7. Activity log written for the record's owner ────────────────
    const log = await prisma.activityLog.findFirst({
      where: { action: 'auto_check_out', resourceId: stale.id },
    });
    if (log && log.userId === worker.id) {
      pass('ActivityLog auto_check_out written for the record owner');
    } else {
      fail('ActivityLog auto_check_out written', log ? `userId=${log.userId}` : 'no log found');
    }

    // ── 8. Idempotent: a second sweep must not touch the closed row ───
    console.log('\n[8] Confirm a later sweep does not re-close the record...');
    const beforeUpdatedAt = closed.updatedAt;
    await new Promise((r) => setTimeout(r, 61_000)); // outlast the 60s throttle
    // Reuse the existing session — proxy.ts rate-limits auth POSTs to 5/min/IP,
    // so extra logins would make this suite flaky when run alongside others.
    await workerPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await workerPage.waitForTimeout(2000);
    await workerContext.close();

    const afterSecond = await prisma.absensiRecord.findUnique({ where: { id: stale.id } });
    const logCount = await prisma.activityLog.count({
      where: { action: 'auto_check_out', resourceId: stale.id },
    });
    if (afterSecond.updatedAt.getTime() === beforeUpdatedAt.getTime() && logCount === 1) {
      pass('Second sweep is a no-op (no double write, no duplicate log)');
    } else {
      fail('Second sweep is a no-op', `updatedAt changed=${afterSecond.updatedAt.getTime() !== beforeUpdatedAt.getTime()}, logs=${logCount}`);
    }

    // ── 9. Cleanup ───────────────────────────────────────────────────
    await prisma.activityLog.deleteMany({ where: { resourceId: { in: [stale.id, fresh.id] } } });
    await prisma.absensiRecord.deleteMany({ where: { id: { in: [stale.id, fresh.id] } } });
  } finally {
    await browser.close();

    // Restore the settings we changed so the dev DB is left as we found it.
    if (originalSettings && originalBusinessHours) {
      await prisma.systemSettings.update({
        where: { id: originalSettings.id },
        data: { businessHours: originalBusinessHours },
      });
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error('\nE2E aborted:', err.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
