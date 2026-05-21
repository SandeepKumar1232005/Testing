const { test, expect } = require('@playwright/test');

test('Basic Security Audit', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  let mixedContent = false;
  page.on('request', request => {
      // If target is HTTPS, block HTTP resources (mixed content)
      if (targetUrl.startsWith('https://') && request.url().startsWith('http://')) {
          mixedContent = true;
      }
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  // Check for HTTPS
  if (!targetUrl.startsWith('https://')) {
      throw new Error('__SECURITY_ISSUES__:["Target URL is not using HTTPS"]');
  }

  // Check for exposed secrets in the DOM (very basic heuristic)
  const pageContent = await page.content();
  const secretPatterns = [
      /AIza[0-9A-Za-z-_]{35}/, // Google API Key
      /sk_live_[0-9a-zA-Z]{24}/, // Stripe Secret Key
      /ghp_[0-9a-zA-Z]{36}/, // GitHub PAT
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/ // JWT Token Header
  ];

  const foundSecrets = secretPatterns.some(pattern => pattern.test(pageContent));
  
  const issues = [];
  if (mixedContent) issues.push('Mixed content detected (HTTP resources loaded on HTTPS page)');
  if (foundSecrets) issues.push('Potential exposed secrets (API keys/Tokens) found in page source');
  
  if (issues.length > 0) {
      throw new Error(`__SECURITY_ISSUES__:${JSON.stringify(issues)}`);
  }
});
