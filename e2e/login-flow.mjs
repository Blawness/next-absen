/**
 * E2E test: Mobile login flow
 *
 * Usage:
 *   npm run dev                          # start dev server
 *   node e2e/login-flow.mjs              # run tests
 *
 * Requires: npm install -D playwright
 * Dependencies for headless chromium are in e2e/chromium-deps/
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEPS_DIR = resolve(__dirname, 'chromium-deps');
const CHROMIUM_PATH = '/home/blawness/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.env.BASE_URL || 'http://localhost:3004';

const results = [];

function pass(name) { results.push({ test: name, pass: true }); }
function fail(name, err) { results.push({ test: name, pass: false, error: err }); }

async function test() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });

  const page = await context.newPage();

  try {
    // [1] Signin page loads
    console.log('[1] Signin page...');
    await page.goto(`${BASE}/auth/signin`, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (title.includes('Absensi')) pass('Signin page loads');
    else fail('Signin page loads', `title=${title}`);

    // [2] Login
    console.log('[2] Login...');
    await page.waitForSelector('#email', { state: 'attached', timeout: 10000 });
    await page.fill('#email', 'user1@demo.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    const urlAfter = page.url();
    if (urlAfter.includes('/dashboard')) pass('Login redirects to dashboard');
    else fail('Login redirects to dashboard', `url=${urlAfter}`);

    // [3] Dashboard content
    if (urlAfter.includes('/dashboard')) {
      const body = await page.textContent('body');
      if (body?.includes('Selamat datang')) pass('Dashboard shows content');
      else fail('Dashboard shows content');
    }

    // [4] Session cookie
    console.log('[3] Session cookie...');
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('next-auth.session-token'));
    if (sessionCookie) pass('Session cookie set');
    else fail('Session cookie set');

    // [5] Direct dashboard access
    console.log('[4] Direct dashboard...');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    if (!page.url().includes('/auth/signin')) pass('Dashboard accessible with cookie');
    else fail('Dashboard accessible with cookie');

    // [6] API health
    console.log('[5] API health...');
    const health = await page.request.get(`${BASE}/api/health`);
    if (health.status() === 200) pass('API health returns 200');
    else fail('API health returns 200');

  } catch (err) {
    console.error('Fatal:', err.message);
  }

  await browser.close();

  console.log('\n=== RESULTS ===');
  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}${r.error ? ` (${r.error})` : ''}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\n${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

test();
