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
  await m.waitForTimeout(3000);

  // Get total page height
  const height = await m.evaluate(() => document.body.scrollHeight);
  console.log('Total page height:', height);

  // Screenshot the CTA section (near end of page)
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 2500));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-mobile-cta.png' });
  
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1800));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-mobile-cta2.png' });

  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1200));
  await m.waitForTimeout(500);
  await m.screenshot({ path: '/workspace/ss-mobile-cta3.png' });

  // What's in the blank area? Check elements
  const blankInfo = await m.evaluate(() => {
    const sections = document.querySelectorAll('section, [class*="section"], div[style*="padding"]');
    const results = [];
    sections.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.height > 200 && style.background.includes('rgb')) {
        results.push({
          tag: el.tagName,
          height: Math.round(rect.height),
          bg: style.background.substring(0, 50),
          text: el.innerText.substring(0, 60),
        });
      }
    });
    return results.slice(0, 8);
  });
  console.log('Large sections:', JSON.stringify(blankInfo, null, 2));

  await browser.close();
})();
