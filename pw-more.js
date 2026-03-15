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
  const total = await m.evaluate(() => document.body.scrollHeight);
  console.log('New total height:', total);

  // Metrics section (was the 3-col problem)
  await m.evaluate(() => window.scrollTo(0, 2800));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-metrics.png' });

  // How it works steps
  await m.evaluate(() => window.scrollTo(0, 5500));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-steps.png' });

  // Footer area
  await m.evaluate(() => window.scrollTo(0, 99999));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-footer-new.png' });

  await browser.close();
})();
