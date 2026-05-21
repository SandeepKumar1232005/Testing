const { test, expect } = require('@playwright/test');

test('Images Load Check', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  // Wait for all resources to load to check images
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => null);
  
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.images).filter(img => {
      // Natural width is 0 if image failed to load or is broken
      return !img.complete || img.naturalWidth === 0;
    }).length;
  });
  
  expect(brokenImages).toBe(0);
});
