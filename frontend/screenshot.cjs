const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 900 });

  // Go to login
  await page.goto('http://localhost:5173/cosmos/auth/signin', { waitUntil: 'networkidle', timeout: 20000 });
  
  // Fill credentials (auth is disabled, try admin/admin or just submit)
  await page.fill('input[placeholder="admin"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  console.log('URL after login:', page.url());

  // Navigate to aisle dashboard
  await page.goto('http://localhost:5173/cosmos/views/aisle', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: '/tmp/aisle-auth.png' });
  console.log('initial screenshot done, url:', page.url());

  // Look for aisle selector
  const selects = page.locator('select');
  const count = await selects.count();
  console.log('selects found:', count);
  
  if (count > 0) {
    const opts = await selects.first().locator('option').all();
    console.log('options:', opts.length);
    for (const o of opts) {
      console.log(' -', await o.textContent(), '=', await o.getAttribute('value'));
    }
    if (opts.length > 1) {
      const val = await opts[1].getAttribute('value');
      await selects.first().selectOption(val);
      await page.waitForTimeout(6000);
      await page.screenshot({ path: '/tmp/aisle-final.png' });
      console.log('final screenshot taken with aisle:', val);
    }
  }

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
