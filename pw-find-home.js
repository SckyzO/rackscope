const { chromium } = require('/workspace/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  for (const url of ['http://docs:3001/', 'http://docs:3001/home', 'http://docs:3001/getting-started/quick-start', 'http://docs:3001/intro']) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    const title = await page.title();
    const h1 = await page.$eval('h1', el => el.textContent).catch(() => 'none');
    console.log(`${url} → "${title}" / h1: "${h1}"`);
  }
  await browser.close();
})();
