const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });

  await page.goto('http://localhost:5173/cosmos/auth/signin', { waitUntil: 'networkidle', timeout: 20000 });
  await page.fill('input[placeholder="admin"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/cosmos/views/aisle', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Click the aisle selector
  await page.click('button:has-text("Select aisle")');
  await page.waitForTimeout(500);
  
  // Click Aisle 01 (Compute)
  await page.click('button:has-text("Aisle 01")');
  console.log('Clicked Aisle 01');
  
  // Wait for racks to load
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/aisle01.png', fullPage: false });
  console.log('screenshot taken');

  // Also take a full page screenshot
  await page.screenshot({ path: '/tmp/aisle01-full.png', fullPage: true });
  console.log('full screenshot taken');

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
