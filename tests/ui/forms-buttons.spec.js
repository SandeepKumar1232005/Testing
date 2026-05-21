const { test, expect } = require('@playwright/test');

test('Forms & Interactive Elements Audit', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  const jsErrors = [];
  page.on('pageerror', error => {
      jsErrors.push(error.message);
  });
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  // Find all buttons and ensure they are not disabled and are visible
  const buttons = await page.locator('button').all();
  const brokenButtonsDetails = [];
  for (const btn of buttons) {
      if (!await btn.isVisible() || await btn.isDisabled()) {
          const filename = `btn-issue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.png`;
          let screenshotStr = '';
          try {
              await btn.screenshot({ path: `public/screenshots/${filename}`, timeout: 2000 });
              screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
          } catch(e) {
              try {
                  await page.screenshot({ path: `public/screenshots/${filename}`, timeout: 2000 });
                  screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
              } catch(e2) {}
          }
          const html = await btn.evaluate(node => node.outerHTML.substring(0, 80).replace(/\n/g, ''));
          brokenButtonsDetails.push(`${screenshotStr}Hidden/Disabled button found: ${html}...`);
      }
  }
  
  // Find all forms and check if they have basic structure (submit button, inputs)
  const forms = await page.locator('form').all();
  const invalidFormsDetails = [];
  for (const form of forms) {
      const inputsCount = await form.locator('input, textarea, select').count();
      const submitsCount = await form.locator('button[type="submit"], input[type="submit"]').count();
      if (inputsCount > 0 && submitsCount === 0) {
          const filename = `form-issue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.png`;
          let screenshotStr = '';
          try {
              await form.screenshot({ path: `public/screenshots/${filename}`, timeout: 2000 });
              screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
          } catch(e) {
              try {
                  await page.screenshot({ path: `public/screenshots/${filename}`, timeout: 2000 });
                  screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
              } catch(e2) {}
          }
          const html = await form.evaluate(node => {
              const id = node.id ? `id="${node.id}"` : '';
              const cls = node.className ? `class="${node.className}"` : '';
              return `<form ${id} ${cls}>`;
          });
          invalidFormsDetails.push(`${screenshotStr}Form missing submit button: ${html}`);
      }
  }

  const issues = [];
  if (jsErrors.length > 0) issues.push(...jsErrors.map(e => `JS Console Error: ${e}`));
  if (brokenButtonsDetails.length > 0) issues.push(...brokenButtonsDetails);
  if (invalidFormsDetails.length > 0) issues.push(...invalidFormsDetails);
  
  if (issues.length > 0) {
      throw new Error(`__INTERACTION_ISSUES__:${JSON.stringify(issues)}`);
  }
});
