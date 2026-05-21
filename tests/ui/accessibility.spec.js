const { test, expect } = require('@playwright/test');

test('Accessibility Audit', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  // Navigate to target URL
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
  
  // Inject axe-core library from a robust CDN
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'
  });
  
  // Run accessibility evaluation
  const results = await page.evaluate(async () => {
    // Wait for the axe library to be fully ready
    if (typeof axe === 'undefined') {
      throw new Error('Axe-core failed to load on the target page');
    }
    return await axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
  });
  
  // Filter for serious and critical violations to provide high-quality signal
  const violations = results.violations
    .filter(v => v.impact === 'critical' || v.impact === 'serious')
    .map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length
    }));
    
  if (violations.length > 0) {
    throw new Error(`__ACCESSIBILITY_VIOLATIONS__:${JSON.stringify(violations)}`);
  }
});
