# Integration Tests

This directory contains integration tests for the application using Playwright.

## Purpose

Integration tests verify that different parts of the application work together correctly. They test the interaction between components, services, and external dependencies. Unlike unit tests that test isolated components, integration tests focus on the interactions and data flow between multiple components.

## Test Types

- **Component Integration Tests**: Test how multiple UI components interact with each other
- **Navigation and Modal Tests**: Test navigation flows and modal interactions
- **Data Flow Tests**: Test how data flows between components and services
- **Form and Validation Tests**: Test form submissions and validation across components

## Example Test

```

## Running Integration Tests

Integration tests are run using Playwright. You can run them with the following commands:

```bash
# Run all integration tests
npx playwright test tests/integration

# Run a specific integration test file
npx playwright test tests/integration/navbar-modal.spec.ts

# Run tests with UI mode for debugging
npx playwright test tests/integration --ui
```

## Best Practices

1. **Test Real Interactions**: Focus on testing how components interact in real-world scenarios.
2. **Minimize Mocks**: Use as few mocks as possible to test actual integration points.
3. **Test Complete Flows**: Test entire user flows rather than isolated interactions.
4. **Verify State Changes**: Verify that interactions properly update the application state.
5. **Test Error Handling**: Verify that components handle errors from other components appropriately.

## Test Structure

Integration tests should follow this structure:

1. **Setup**: Launch the application and navigate to the starting point
2. **Interaction**: Perform user interactions that span multiple components
3. **Verification**: Verify that all components respond correctly to the interactions
4. **Cleanup**: Close the application or reset state for the next test

```typescript
// Sample integration test for Navbar and Modal interaction using Playwright
import { test, expect } from '@playwright/test';
import { _electron as electron } from '@playwright/test';

test.describe('Navigation and Modal Integration Tests', () => {
  test('should open settings modal from navbar', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: ['.']
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Click on Settings menu in navbar
    const settingsMenu = await window.getByText('Settings');
    await settingsMenu.click();
    
    // Verify that the settings modal appears
    const settingsModal = await window.locator('.settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Interact with the modal
    const darkModeToggle = await settingsModal.getByText('Dark Mode');
    await darkModeToggle.click();
    
    // Close the app
    await electronApp.close();
  });
});
```