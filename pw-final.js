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
  
  // Hero — badge removed
  await m.screenshot({ path: '/workspace/final-hero.png' });

  // Sidebar dark mode
  const btn = await m.$('.navbar__toggle, button[aria-label*="navigation"], button[aria-label*="Navigation"]');
  if (btn) { await btn.click(); await m.waitForTimeout(600); }
  await m.screenshot({ path: '/workspace/final-sidebar.png' });

  await browser.close();
  console.log('done');
})();
