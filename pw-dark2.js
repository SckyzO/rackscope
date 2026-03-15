const { chromium } = require('/workspace/node_modules/playwright-core');
const BASE = 'http://docs:3001/docs';
(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const m = await ctx.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await m.waitForTimeout(3000);
  // Open sidebar via hamburger
  await m.click('.navbar__toggle');
  await m.waitForTimeout(800);
  await m.screenshot({ path: '/workspace/dark-sidebar.png' });
  console.log('done');
  await browser.close();
})();
