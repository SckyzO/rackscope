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
  
  // Take a shot at every 1000px from the bottom
  for (let offset = 2800; offset >= 0; offset -= 600) {
    await m.evaluate((o) => window.scrollTo(0, document.body.scrollHeight - o), offset);
    await m.waitForTimeout(300);
    await m.screenshot({ path: `/workspace/ss-scan-${offset}.png` });
  }
  
  // Also get exact section heights
  const info = await m.evaluate(() => {
    const els = document.querySelectorAll('main > div, main > section');
    return Array.from(els).map(el => ({
      h: Math.round(el.getBoundingClientRect().height + el.offsetTop),
      offsetTop: Math.round(el.offsetTop),
      height: Math.round(el.getBoundingClientRect().height),
      cls: el.className,
      preview: el.innerText.substring(0, 40),
    }));
  });
  info.forEach(i => console.log(`top:${i.offsetTop} h:${i.height} cls:${i.cls} "${i.preview}"`));
  
  await browser.close();
})();
