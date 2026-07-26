# Tests Directory

> **Note:** For a comprehensive testing strategy and guidelines, please refer to the [TESTING_STRATEGY.md](../docs/TESTING_STRATEGY.md) document in the docs folder.

## Structure

This directory contains all tests for the application, organized by test type:

- `tests/` - Main test directory
  - `accessibility/` - Accessibility tests
  - `e2e/` - End-to-end tests using Playwright (*.spec.ts files)
  - `integration/` - Integration tests using Playwright
  - `stress/` - Performance and stress tests
  - `unit/` - Unit tests using Jest
    - `components/` - Component tests
    - `pages/` - Page component tests
  - `visual/` - Visual regression tests
  - `setupTests.ts` - Jest setup file

## Test Migration Complete

All tests have been migrated from `src/tests/` to the main `tests/` directory. The project now uses a single test directory structure for better organization and clarity.

### Important Changes

1. The `jest.config.ts` file has been updated to only use the `tests/` directory as the root for tests.
2. All unit tests have been moved from `src/tests/unit/` to `tests/unit/`.
3. All import paths in the test files have been updated to reference components from the `src/` directory.

### Adding New Tests

When adding new tests, follow these guidelines:

1. Place tests in the appropriate directory based on test type:
   - Unit tests: `tests/unit/`
   - E2E tests: `tests/e2e/`
   - Integration tests: `tests/integration/`
   - Accessibility tests: `tests/accessibility/`
   - Stress tests: `tests/stress/`
   - Visual tests: `tests/visual/`

2. Use the correct file naming convention:
   - Unit tests: `*.test.tsx` or `*.test.ts`
   - E2E tests: `*.spec.ts`

3. When importing components or modules from the source code, use the `src/` prefix:

```typescript
// Correct import path for components
import Component from '../../../src/components/Component';
```

## Running Tests

### Playwright E2E Tests

```bash
# Run all E2E tests
npx playwright test tests/e2e

# Run a specific test file
npx playwright test tests/e2e/example.spec.ts

# Run tests with UI mode
npx playwright test tests/e2e --ui
```

### Playwright Integration Tests

```bash
# Run all integration tests
npx playwright test tests/integration

# Run a specific integration test file
npx playwright test tests/integration/navbar-modal.spec.ts

# Run tests with UI mode
npx playwright test tests/integration --ui
```

### Jest Unit Tests

```bash
npm test
```

### Specific Component Tests

```bash
npm test -- -t "Component Name"
```

### Using the Batch Files

You can also use the provided batch files to run specific tests:

```bash
# Run Navbar tests
.\run-navbar-tests.bat

# Run integration tests for Navbar and Modal interaction
.\run-navbar-modal-tests.bat
```