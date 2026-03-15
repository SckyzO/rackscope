const { chromium } = require('/workspace/node_modules/playwright-core');
const BASE = 'http://docs:3001/docs';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Desktop
  const d = await browser.newPage();
  await d.setViewportSize({ width: 1280, height: 900 });
  await d.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await d.waitForTimeout(3000);
  await d.screenshot({ path: '/workspace/ss-desktop.png', fullPage: false });
  console.log('Desktop OK');

  // Mobile 390px
  const m = await browser.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
  await m.waitForTimeout(3000);
  await m.screenshot({ path: '/workspace/ss-mobile-hero.png', fullPage: false });
  console.log('Mobile hero OK');

  await m.evaluate(() => window.scrollTo(0, 900));
  await m.waitForTimeout(800);
  await m.screenshot({ path: '/workspace/ss-mobile-carousel.png', fullPage: false });
  console.log('Mobile carousel OK');

  await m.evaluate(() => window.scrollTo(0, 2000));
  await m.waitForTimeout(800);
  await m.screenshot({ path: '/workspace/ss-mobile-pyramid.png', fullPage: false });
  console.log('Mobile pyramid OK');

  await m.evaluate(() => window.scrollTo(0, 99999));
  await m.waitForTimeout(800);
  await m.screenshot({ path: '/workspace/ss-mobile-footer.png', fullPage: false });
  console.log('Mobile footer OK');

  await browser.close();
})();
