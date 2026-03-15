const { chromium } = require('/workspace/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));
  
  await page.goto('http://docs:3001/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(4000);
  
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.$eval('body', el => el.innerText.substring(0, 300));
  
  console.log('URL:', url);
  console.log('Title:', title);
  console.log('Body:', bodyText);
  console.log('JS errors:', errors.slice(0, 5));
  
  await browser.close();
})();
