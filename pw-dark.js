const { chromium } = require('/workspace/node_modules/playwright-core');
const BASE = 'http://docs:3001/docs';
(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-dark-mode']
  });
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const m = await ctx.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await m.waitForTimeout(2000);
  // Click dark mode toggle if needed
  const toggle = await m.$('[data-theme-toggle], button[title*="dark"], button[title*="Dark"], button[aria-label*="dark"]');
  if (toggle) await toggle.click();
  await m.waitForTimeout(500);
  // Open sidebar
  const btn = await m.$('.navbar__toggle');
  if (btn) { await btn.click(); await m.waitForTimeout(500); }
  await m.screenshot({ path: '/workspace/dark-sidebar.png' });
  console.log('done');
  await browser.close();
})();
