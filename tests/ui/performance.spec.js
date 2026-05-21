const { test, expect } = require('@playwright/test');

test('Page Load Speed Check', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  const startTime = Date.now();
  await page.goto(targetUrl, { waitUntil: 'load' });
  const loadTime = Date.now() - startTime;
  
  // Assert load time is under 5 seconds (5000ms)
  // If it's over, it fails.
  expect(loadTime).toBeLessThan(5000);
});
