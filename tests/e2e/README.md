# End-to-End (E2E) Tests

This directory contains end-to-end tests for the application using Playwright.

## Purpose

End-to-end tests verify that the entire application works correctly from the user's perspective. They simulate real user scenarios by interacting with the application as a user would.

## Test Files

- `example.spec.ts` - Example Playwright test
- `navbar.spec.ts` - Tests for the Navbar component

## Running E2E Tests

```bash
npx playwright test
```

Or to run a specific test:

```bash
npx playwright test navbar.spec.ts
```

## Test Structure

E2E tests typically follow this pattern:

1. Launch the application
2. Interact with UI elements
3. Verify expected behavior
4. Close the application

Example:
```typescript
import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test('should perform a complete user flow', async () => {
  // Launch the app
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  
  // Perform actions
  await window.getByText('Login').click();
  
  // Verify results
  await expect(window.getByTestId('dashboard')).toBeVisible();
  
  // Close the app
  await electronApp.close();
});
```