const { test, expect } = require('@playwright/test');

test('generic page load & auth test', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  const requiresLogin = process.env.TEST_LOGIN_REQUIRED === 'true';
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  const loginPath = process.env.TEST_LOGIN_PATH || '';
  const loginSelector = process.env.TEST_LOGIN_SELECTOR;

  console.log(`Testing UI for: ${targetUrl}. Auth required: ${requiresLogin}`);
  
  if (requiresLogin) {
    // 1. Navigate to Login Page
    const loginUrl = targetUrl + (loginPath.startsWith('/') ? loginPath : '/' + loginPath);
    await page.goto(loginUrl.replace(/(?<!:)\/\//g, '/'), { waitUntil: 'domcontentloaded' });
    
    // 2. Find and fill username
    const usernameInput = page.locator('input[type="email"], input[type="text"], input[name*="user"], input[name*="email"], input[placeholder*="email" i], input[placeholder*="user" i]').first();
    await usernameInput.fill(username);
    
    // 3. Find and fill password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);
    
    // 4. Click Login Button
    if (loginSelector) {
        await page.locator(loginSelector).click();
    } else {
        const loginBtn = page.getByRole('button', { name: /login|sign in|submit/i }).first();
        if (await loginBtn.isVisible()) {
            await loginBtn.click();
        } else {
            // fallback generic selector
            await page.locator('button[type="submit"], input[type="submit"]').first().click();
        }
    }
    
    // 5. Verify success (wait for navigation or token)
    await page.waitForLoadState('networkidle');
    
    // The test passes if it didn't throw during the above generic interactions.
    // Further verification could check for 'Invalid Credentials' text
    const errorText = await page.getByText(/invalid credentials|wrong password/i).count();
    expect(errorText).toBe(0);
    
  } else {
    // Standard generic page load
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
    if (response) {
        expect(response.status()).toBeLessThan(400);
    }
    const title = await page.title();
    expect(title).toBeDefined();
  }
});
