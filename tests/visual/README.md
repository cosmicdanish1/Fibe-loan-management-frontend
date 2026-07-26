# Visual Tests

This directory contains visual regression tests for the application.

## Purpose

Visual tests ensure that the UI components render correctly and consistently across different browsers and screen sizes. They help detect unintended visual changes during development.

## Test Types

- Screenshot comparison tests
- Layout tests
- Responsive design tests
- Theme/styling tests

## Example Test

```typescript
// Sample visual test for Navbar component
import { test, expect } from '@playwright/test';

test.describe('Navbar Visual Tests', () => {
  test('should render correctly in light mode', async ({ page }) => {
    // Navigate to the page with the Navbar
    await page.goto('/');
    
    // Set light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    
    // Take a screenshot of the navbar
    const screenshot = await page.locator('nav').screenshot();
    
    // Compare with baseline
    expect(screenshot).toMatchSnapshot('navbar-light.png');
  });
  
  test('should render correctly in dark mode', async ({ page }) => {
    // Navigate to the page with the Navbar
    await page.goto('/');
    
    // Set dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    // Take a screenshot of the navbar
    const screenshot = await page.locator('nav').screenshot();
    
    // Compare with baseline
    expect(screenshot).toMatchSnapshot('navbar-dark.png');
  });
});
```