const { test, expect, devices } = require('@playwright/test');

test.use({ ...devices['iPhone 12'] });

test('Mobile Responsiveness Check', async ({ page }) => {
  const targetUrl = process.env.TARGET_URL || 'https://example.com';
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  // 1. Verify the viewport meta tag exists (crucial for mobile responsiveness)
  const viewportMeta = await page.locator('meta[name="viewport"]').count();
  if (viewportMeta === 0) {
      throw new Error('__MOBILE_ISSUES__:["Missing <meta name=\\"viewport\\"> tag. Add this to your <head>: <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">"]');
  }
  
  // 2. Check for structural layout issues
  const layoutInfo = await page.evaluate(() => {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);
    
    // If overflow-x is hidden/clip on html or body, the developer intentionally
    // prevents horizontal scrolling — the layout is considered responsive.
    const overflowHidden = ['hidden', 'clip'].some(v => 
        htmlStyle.overflowX === v || bodyStyle.overflowX === v
    );
    
    if (overflowHidden) {
        return { broken: false, reason: 'overflow-x is hidden' };
    }
    
    // Use clientWidth (excludes scrollbar) for accurate comparison
    const viewportWidth = document.documentElement.clientWidth;
    const contentWidth = document.documentElement.scrollWidth;
    const overflow = contentWidth - viewportWidth;
    
    // Allow a generous 25px buffer for scrollbar artifacts and rounding
    if (overflow > 25) {
        // Find the widest culprit element
        const allElements = document.querySelectorAll('body *');
        let widest = null;
        let maxWidth = viewportWidth;
        
        for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > maxWidth) {
                maxWidth = Math.round(rect.width);
                widest = el;
            }
        }
        
        if (widest) {
            widest.setAttribute('data-qa-broken', 'true');
            const tag = widest.tagName.toLowerCase();
            const id = widest.id ? ` id="${widest.id}"` : '';
            const cls = widest.className && typeof widest.className === 'string' 
                ? ` class="${widest.className.substring(0, 60)}"` : '';
            return { 
                broken: true, 
                hasElement: true, 
                details: `Page content overflows by ${overflow}px on mobile. The widest element is: <${tag}${id}${cls}> (${maxWidth}px wide, viewport is ${viewportWidth}px). Fix: add max-width:100% or overflow-x:hidden to this element.`
            };
        }
        return { 
            broken: true, 
            hasElement: false, 
            details: `Page content overflows by ${overflow}px on mobile (viewport: ${viewportWidth}px, content: ${contentWidth}px). Fix: add "overflow-x: hidden" to your body or html in CSS.`
        };
    }
    
    return { broken: false };
  });
  
  if (layoutInfo.broken) {
      let screenshotStr = '';
      const filename = `mobile-issue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.png`;
      
      if (layoutInfo.hasElement) {
          try {
              await page.locator('[data-qa-broken="true"]').first().screenshot({ path: `public/screenshots/${filename}`, timeout: 3000 });
              screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
          } catch(e) {
              try {
                  await page.screenshot({ path: `public/screenshots/${filename}`, fullPage: false, timeout: 3000 });
                  screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
              } catch(e2) {}
          }
      } else {
          try {
              await page.screenshot({ path: `public/screenshots/${filename}`, fullPage: false, timeout: 3000 });
              screenshotStr = `[SCREENSHOT:/screenshots/${filename}] `;
          } catch(e) {}
      }
      
      throw new Error(`__MOBILE_ISSUES__:["${screenshotStr}${layoutInfo.details}"]`);
  }
});
