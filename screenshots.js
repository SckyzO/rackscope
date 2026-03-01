const { chromium } = require('@playwright/test');

const BASE = 'http://frontend:5173';
const OUT = '/workspace/website/static/img/screenshots';
const VIEWPORT = { width: 2560, height: 1440 };

async function shot(page, name, url, wait = 2000) {
  console.log(`📸 ${name}...`);
  if (url) await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`   ✓ ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  
  await shot(page, 'dashboard', `${BASE}/`, 3000);
  await shot(page, 'worldmap', `${BASE}/views/worldmap`, 3000);
  await shot(page, 'ui-library', `${BASE}/ui`, 1500);
  await shot(page, 'ui-buttons', `${BASE}/ui/buttons`, 1000);
  await shot(page, 'ui-badges', `${BASE}/ui/badges`, 1000);
  await shot(page, 'ui-alerts', `${BASE}/ui/alerts`, 1000);
  await shot(page, 'ui-charts', `${BASE}/charts`, 3000);
  await shot(page, 'settings', `${BASE}/editors/settings`, 2000);
  await shot(page, 'topology-editor', `${BASE}/editors/topology`, 2000);
  await shot(page, 'templates-editor', `${BASE}/editors/templates`, 2000);
  await shot(page, 'checks-editor', `${BASE}/editors/checks`, 2000);
  await shot(page, 'rack-editor', `${BASE}/editors/rack`, 2000);
  await shot(page, 'signin', `${BASE}/auth/signin`, 1000);
  await shot(page, 'signup', `${BASE}/auth/signup`, 1000);
  await shot(page, 'profile', `${BASE}/profile`, 1000);
  await shot(page, 'notifications', `${BASE}/notifications`, 1500);
  await shot(page, 'tables', `${BASE}/tables`, 1500);
  await shot(page, 'calendar', `${BASE}/calendar`, 2000);
  await shot(page, 'slurm-overview', `${BASE}/slurm/overview`, 2000);
  await shot(page, 'theme-settings', `${BASE}/settings`, 2000);
  
  await browser.close();
  console.log('\n✅ Done — screenshots in', OUT);
})().catch(e => { console.error('❌ ERROR:', e.message); process.exit(1); });
