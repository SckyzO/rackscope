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

  // Click the aisle selector button
  const selectorBtn = page.locator('button:has-text("Select aisle")');
  if (await selectorBtn.count() > 0) {
    console.log('Found aisle selector button, clicking...');
    await selectorBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/dropdown-open.png' });
    console.log('dropdown screenshot taken');
    
    // Look for dropdown items
    const items = await page.locator('[role="option"], .dropdown-item, button').filter({ hasText: /aisle|Aisle|allée/i }).all();
    console.log('Dropdown items found:', items.length);
    for (const item of items.slice(0, 5)) {
      const text = await item.textContent();
      console.log(' item:', text?.trim().slice(0, 50));
    }
    
    // Click the first non-placeholder item
    const allBtns = await page.locator('li button, ul button, [role="listbox"] button, [role="option"]').all();
    console.log('List items:', allBtns.length);
    if (allBtns.length > 0) {
      const text = await allBtns[0].textContent();
      console.log('Clicking first item:', text?.trim().slice(0, 50));
      await allBtns[0].click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/aisle-selected.png' });
      console.log('aisle selected screenshot taken');
    }
  } else {
    // Try select element
    const sel = page.locator('select');
    const count = await sel.count();
    console.log('select elements:', count);
    if (count > 0) {
      const opts = await sel.first().locator('option').all();
      console.log('options:', opts.length);
      if (opts.length > 1) {
        const val = await opts[1].getAttribute('value');
        await sel.first().selectOption(val);
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/aisle-selected.png' });
        console.log('selected via select element');
      }
    }
  }

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
