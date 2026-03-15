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
  await m.waitForTimeout(2000);

  // Scroll slowly to give IntersectionObserver time to fire
  for (let y = 0; y <= 8000; y += 400) {
    await m.evaluate((pos) => window.scrollTo(0, pos), y);
    await m.waitForTimeout(200);
  }
  await m.waitForTimeout(1000);
  await m.screenshot({ path: '/workspace/ss-footer-slow.png', fullPage: false });
  console.log('done');
  await browser.close();
})();
