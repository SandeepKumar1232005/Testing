const { test, expect } = require('@playwright/test');

test('Broken Links Check', async ({ page, request }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .filter(href => href.startsWith('http'))
      .slice(0, 10);
  });
  
  let failedLinks = [];
  
  // Run link checks in parallel to avoid test timeout on slow sites
  const targetOrigin = new URL(targetUrl).origin;

  await Promise.all(links.map(async (link) => {
    try {
      const response = await request.get(link, { timeout: 4000 });
      if (response.status() >= 400) {
        // External sites often block headless bots with 403 Forbidden
        const isExternal = new URL(link).origin !== targetOrigin;
        if (isExternal && response.status() === 403) return;
        
        failedLinks.push(`${link} (Status: ${response.status()})`);
      }
    } catch (e) {
      // If it's an external link, ignore timeouts (bot protection).
      // If internal, it's a real failure.
      try {
        const isExternal = new URL(link).origin !== targetOrigin;
        if (!isExternal) failedLinks.push(`${link} (Timeout)`);
      } catch (err) {
        failedLinks.push(`${link} (Invalid URL format)`);
      }
    }
  }));
  
  // Custom assertion to easily parse in the server
  if (failedLinks.length > 0) {
      throw new Error(`__BROKEN_LINKS__:${JSON.stringify(failedLinks)}`);
  }
});
