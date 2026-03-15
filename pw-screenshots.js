const { chromium } = require('/workspace/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Desktop
  const desktop = await browser.newPage();
  await desktop.setViewportSize({ width: 1280, height: 800 });
  await desktop.goto('http://docs:3001', { waitUntil: 'networkidle', timeout: 15000 });
  await desktop.waitForTimeout(2000);
  await desktop.screenshot({ path: '/workspace/ss-desktop.png' });
  console.log('Desktop OK');

  // Mobile iPhone 12 — full page
  const mobile = await browser.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto('http://docs:3001', { waitUntil: 'networkidle', timeout: 15000 });
  await mobile.waitForTimeout(2000);
  await mobile.screenshot({ path: '/workspace/ss-mobile-top.png' });
  console.log('Mobile top OK');

  // Scroll to mid (carousel + pyramid sections)
  await mobile.evaluate(() => window.scrollTo(0, 1200));
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: '/workspace/ss-mobile-mid.png' });
  console.log('Mobile mid OK');

  // Footer area
  await mobile.evaluate(() => window.scrollTo(0, 99999));
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: '/workspace/ss-mobile-bottom.png' });
  console.log('Mobile bottom OK');

  await browser.close();
})();
