const { chromium } = require('/workspace/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('http://docs:3001/docs/img/og-image.svg', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/workspace/og-preview.png', fullPage: false });
  console.log('done');
  await browser.close();
})();
