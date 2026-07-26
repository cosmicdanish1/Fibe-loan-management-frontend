# Loan Application Testing Guide

This directory contains the full testing suite for the **Loan Application** component. We use a multi-layered testing approach to ensure stability, performance, and a smooth user experience.

## 📋 Available Tests

### 1. Unit & Component Tests (Vitest)
Located in: `Frontend/tests/unit/LoanApplication/`
These tests verify individual logic and UI rendering in isolation.

- **`useLoanApplication.test.ts`**: Tests the custom hook that manages the form state, tab switching, and data updates.
- **`LoanApplication.test.tsx`**: Tests the main component rendering, tab navigation, and action buttons.

**How to run:**
```bash
# From the project root:
npm --prefix Frontend run test -- tests/unit/LoanApplication

# Or from the Frontend directory:
npm run test -- tests/unit/LoanApplication
```

---

### 2. End-to-End (E2E) Tests (Playwright)
Located in: `Frontend/tests/e2e/LoanApplication/`
These tests simulate real user interactions in a live browser.

- **`LoanApplication.spec.ts`**: Verifies that the page loads, tabs are clickable, and the basic form flow is functional.

**How to run:**
```bash
# From the project root:
npm --prefix Frontend run test:e2e -- tests/e2e/LoanApplication

# Recommendation: Run with UI mode for visual debugging:
npm --prefix Frontend run test:ui
```

---

### 3. Stress & Performance Tests (Playwright)
Located in: `Frontend/tests/stress/LoanApplication/`
These tests ensure the component meets our "High-Speed" standards.

- **`LoanApplicationPerformance.spec.ts`**: Checks page load speed (< 2s) and tab switching latency (< 200ms).

**How to run:**
```bash
# From the project root:
npm --prefix Frontend run test:frontend:stress -- tests/stress/LoanApplication
```

---

### 4. Rendering Stress Tests
Located in: `Frontend/tests/stress/LoanApplication/`
These tests verify that the UI remains responsive when adding large amounts of data (e.g., 50+ rows).

- **`RenderingStress.spec.ts`**: Stress tests the "Add Row" functionality and table rendering performance.

**How to run:**
```bash
# From the project root:
npm --prefix Frontend run test:frontend:stress -- tests/stress/LoanApplication/RenderingStress.spec.ts
```

---


## 🛠️ Debugging Tips
- If a test fails with a `ReferenceError`, check that all imports in the `.test.tsx` file use the correct path (e.g., `../../../src/...`).
- Use `npx vitest --ui` to see a beautiful dashboard of all unit tests.
- Use `npm run test:frontend:ui` to watch Playwright tests run in a real browser window.

## 📂 Directory Structure
```text
Frontend/tests/
├── unit/LoanApplication/          # Logic & Component Tests
├── e2e/LoanApplication/           # Browser-based User Journeys
└── stress/LoanApplication/        # Performance Audits
```
