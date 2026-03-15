const { chromium } = require('/workspace/node_modules/playwright-core');
const BASE = 'http://docs:3001/docs';
(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const m = await browser.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await m.waitForTimeout(3500);

  // Hero (bell area)
  await m.screenshot({ path: '/workspace/v-hero.png' });

  // Missing layer section
  await m.evaluate(() => window.scrollTo(0, 4700));
  await m.waitForTimeout(600);
  await m.screenshot({ path: '/workspace/v-missing.png' });

  // Steps section
  await m.evaluate(() => window.scrollTo(0, 5700));
  await m.waitForTimeout(600);
  await m.screenshot({ path: '/workspace/v-steps.png' });

  // Sidebar (open hamburger)
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(300);
  const hamburger = await m.$('.navbar__toggle, button[aria-label="Toggle navigation bar"]');
  if (hamburger) { await hamburger.click(); await m.waitForTimeout(500); }
  await m.screenshot({ path: '/workspace/v-sidebar.png' });

  await browser.close();
  console.log('done');
})();
