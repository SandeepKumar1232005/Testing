const { test, expect } = require('@playwright/test');

test('generic api ping test', async ({ request }) => {
  const targetUrl = process.env.TARGET_URL || process.env.BASE_URL || 'https://example.com';

  console.log(`Pinging API: ${targetUrl}`);
  const response = await request.get(targetUrl, { timeout: 10000 });
  
  expect(response.status()).toBeLessThan(400);
});
