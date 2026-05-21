const { chromium, devices } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();
  
  await page.goto('https://showroom-topaz.vercel.app/', { waitUntil: 'domcontentloaded' });
  
  const metrics = await page.evaluate(() => {
    window.scrollTo(500, 0);
    const scrolledX = window.scrollX;
    
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      bodyOverflowX: window.getComputedStyle(document.body).overflowX,
      htmlOverflowX: window.getComputedStyle(document.documentElement).overflowX,
      actualScrollX: scrolledX
    };
  });
  
  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
})();
