# Accessibility Tests

This directory contains accessibility tests for the application.

## Purpose

Accessibility tests ensure that the application is usable by people with disabilities, including those who use assistive technologies like screen readers, keyboard navigation, or voice recognition.

## Test Types

- Screen reader compatibility tests
- Keyboard navigation tests
- Color contrast tests
- ARIA compliance tests

## Example Test

```typescript
// Sample accessibility test for Navbar component
import { test } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Navbar Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Navigate to the page with the Navbar
    await page.goto('/');
    
    // Inject axe-core into the page
    await injectAxe(page);
    
    // Run accessibility tests
    await checkA11y(page, 'nav', {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
});
```