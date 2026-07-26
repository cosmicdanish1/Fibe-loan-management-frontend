# Unit Testing Documentation

> **Note:** All tests have been migrated from `src/tests/` to the `tests/` directory. For comprehensive testing documentation, please refer to [TESTING_STRATEGY.md](../../docs/TESTING_STRATEGY.md) in the docs folder.

## Test Commands

### Running Tests
- Run all tests once:
  ```bash
  npm test
  ```

- Run tests in watch mode (automatically re-runs on file changes):
  ```bash
  npm run test:watch
  ```

- Run tests with coverage report:
  ```bash
  npm run test:coverage
  ```

- Run a specific test file:
  ```bash
  npx jest tests/unit/pages/YourTestFile.test.tsx
  ```

- Update snapshots (if using snapshot testing):
  ```bash
  npm run test:update
  ```

## Tested Components

### Core Application

#### App
- **Component Path**: `/src/renderer/App.tsx`
- **Test File**: `/tests/unit/App.test.tsx`
- **Test Coverage**:
  - Renders login page at /login
  - Redirects to dashboard for root path
  - Renders protected routes when authenticated
  - Handles 404 routes
  - Renders DayEnd component at /day-end
- **Last Tested**: 2025-09-11

#### Main
- **File Path**: `/src/renderer/main.tsx`
- **Test File**: `/tests/unit/main.test.tsx`
- **Test Coverage**:
  - Renders App inside StrictMode
  - Uses StyleProvider with correct props
  - Sets up React root correctly
- **Last Tested**: 2025-09-09

### Authentication

#### LoginPage
- **Component Path**: `/src/pages/LoginPage.tsx`
- **Test File**: `/src/tests/unit/pages/LoginPage.test.tsx`
- **Test Coverage**:
  - Renders login page with login form
  - Has the correct container styling
- **Last Tested**: 2025-09-09

#### ChangePassword
- **Component Path**: `/src/service/Administration/ChangePassword/page/ChangePassword.tsx`
- **Test File**: `/src/tests/unit/pages/ChangePassword.test.tsx`
- **Test Coverage**:
  - Renders change password form
  - Validates password requirements
  - Handles form submission
  - Shows success/error messages
- **Last Tested**: 2025-09-09

### Navigation

#### Navbar
- **Component Path**: `/src/components/navigation/Navbar.tsx`
- **Test File**: `/src/tests/unit/components/Navbar.test.tsx`
- **Test Coverage**:
  - Renders all main menu items
  - Opens and closes dropdown menu on menu item click
  - Handles menu item click with action
  - Handles submenu items
  - Closes menu when clicking outside
- **Last Tested**: 2025-09-09

#### SubNavbar
- **Component Path**: `/src/components/navigation/SubNavbar.tsx`
- **Test File**: `/src/tests/unit/components/SubNavbar.test.tsx`
- **Test Coverage**:
  - Renders all navigation items
  - Calls handler functions when buttons are clicked
  - Uses default settings handler when no onSettings prop is provided
  - Uses custom settings handler when provided
  - Disables buttons when no handler is provided
  - Handles development mode when electronAPI is not available
- **Last Tested**: 2025-09-09

### Administration

#### DayEnd
- **Component Path**: `/src/service/Administration/DayEnd/page/DayEnd.tsx`
- **Test File**: `/src/tests/unit/pages/DayEnd.test.tsx`
- **Test Coverage**:
  - Renders with default data
  - Displays formatted dates and amounts
  - Handles process day end button click
  - Handles refresh button click
  - Shows loading state during processing
  - Displays error state
  - Shows unbalanced state when calculations don't match
- **Last Tested**: 2025-09-09

#### CreateModifyUsers
- **Component Path**: `/src/service/Administration/CreateModifyUsers/page/CreateModifyUsers.tsx`
- **Test File**: `/src/tests/unit/pages/CreateModifyUsers.test.tsx`
- **Test Coverage**:
  - Renders user management interface
  - Handles user creation and modification
  - Validates user input
  - Displays user list
- **Last Tested**: 2025-09-09

### Transaction Management

#### Receipt
- **Component Path**: `/src/service/Transaction/Receipt&Payment/Receipt/page/Receipt.tsx`
- **Test File**: `/src/tests/unit/pages/Receipt.test.tsx`
- **Test Coverage**:
  - Renders with default values
  - Handles member and office details updates
  - Manages payment mode (cash/bank)
  - Handles receipt items (add/remove/update)
  - Validates and submits the form
  - Shows cheque details in bank payment mode
- **Last Tested**: 2025-09-09

#### DividendPayment
- **Component Path**: `/src/service/Transaction/Receipt&Payment/DividendPayment/page/DividendPayment.tsx`
- **Test File**: `/src/tests/unit/pages/DividendPayment.test.tsx`
- **Test Coverage**:
  - Renders with default values
  - Handles member selection
  - Manages payment mode (cash/bank)
  - Handles dividend records (add/remove/update)
  - Calculates total dividend amount
  - Shows cheque details in bank payment mode
- **Last Tested**: 2025-09-09

#### LoanPayment
- **Component Path**: `/src/service/Transaction/Receipt&Payment/LoanPayment/page/LoanPayment.tsx`
- **Test File**: `/src/tests/unit/pages/LoanPayment.test.tsx`
- **Test Coverage**:
  - Renders loan payment form
  - Handles member and loan details
  - Validates payment amount
  - Processes different payment types
  - Updates loan balance
- **Last Tested**: 2025-09-09

#### JournalTransferEntry
- **Component Path**: `/src/service/Transaction/JournalTransferEntry/page/JournalTransferEntry.tsx`
- **Test File**: `/src/tests/unit/pages/JournalTransferEntry.test.tsx`
- **Test Coverage**:
  - Renders journal entry form
  - Handles debit/credit entries
  - Validates balanced entries
  - Saves journal entries
- **Last Tested**: 2025-09-09

### Reports

#### CashBook
- **Component Path**: `/src/service/Reports/Daily/CashBook/page/CashBook.tsx`
- **Test File**: `/src/tests/unit/pages/CashBook.test.tsx`
- **Test Coverage**:
  - Renders cash book report
  - Filters transactions by date
  - Groups transactions by account
  - Calculates running balance
  - Exports to different formats
- **Last Tested**: 2025-09-09

#### GeneralLedger
- **Component Path**: `/src/service/Reports/Monthly/GeneralLedger/page/GeneralLedger.tsx`
- **Test File**: `/src/tests/unit/pages/GeneralLedger.test.tsx`
- **Test Coverage**:
  - Renders general ledger report
  - Filters by account and date range
  - Shows opening and closing balances
  - Groups transactions by account
- **Last Tested**: 2025-09-09

### Member Management

#### MemberMaster
- **Component Path**: `/src/service/Master/MemberMaster/page/MemberMaster.tsx`
- **Test File**: `/src/tests/unit/pages/MemberMaster.test.tsx`
- **Test Coverage**:
  - Renders member list
  - Handles member creation and editing
  - Validates member details
  - Searches and filters members
- **Last Tested**: 2025-09-09

#### MemberBalanceTransfer
- **Component Path**: `/src/service/Transaction/MemberBalanceTransfer/page/MemberBalanceTransfer.tsx`
- **Test File**: `/src/tests/unit/pages/MemberBalanceTransfer.test.tsx`
- **Test Coverage**:
  - Renders transfer form
  - Handles member selection
  - Validates transfer amounts
  - Processes balance transfers
- **Last Tested**: 2025-09-09

### Settings

#### SettingsPage
- **Component Path**: `/src/components/settings/SettingsPage.tsx`
- **Test File**: `/src/tests/unit/components/SettingsPage.test.tsx`
- **Test Coverage**:
  - Renders with default settings
  - Toggles theme between light and dark
  - Toggles notifications
  - Changes background type
  - Updates welcome text
  - Changes text color
  - Resets background settings
  - Saves settings with animation
  - Handles file upload for background
- **Last Tested**: 2025-09-09

#### CertificateParameterSetting
- **Component Path**: `/src/service/Administration/CertificateSettingAndPrinting/CertificateParameterSetting/page/CertificateParameterSetting.tsx`
- **Test File**: `/src/tests/unit/components/CertificateParameterSetting.test.tsx`
- **Test Coverage**:
  - Renders with default tab
  - Switches between tabs
  - Handles format name input change
- **Last Tested**: 2025-09-09

### SettingsPage
- **Component Path**: `/src/components/settings/SettingsPage.tsx`
- **Test File**: `/src/tests/unit/components/SettingsPage.test.tsx`
- **Test Coverage**:
  - Renders with default settings
  - Toggles theme between light and dark
  - Toggles notifications
  - Changes background type
  - Updates welcome text
  - Changes text color
  - Resets background settings
  - Saves settings with animation
  - Handles file upload for background
- **Last Tested**: 2025-09-09

### SubNavbar
- **Component Path**: `/src/components/navigation/SubNavbar.tsx`
- **Test File**: `/src/tests/unit/components/SubNavbar.test.tsx`
- **Test Coverage**:
  - Renders all navigation items
  - Calls handler functions when buttons are clicked
  - Uses default settings handler when no onSettings prop is provided
  - Uses custom settings handler when provided
  - Disables buttons when no handler is provided
  - Handles development mode when electronAPI is not available
- **Last Tested**: 2025-09-09

### Navbar
- **Component Path**: `/src/components/navigation/Navbar.tsx`
- **Test File**: `/src/tests/unit/components/Navbar.test.tsx`
- **Test Coverage**:
  - Renders all main menu items
  - Opens and closes dropdown menu on menu item click
  - Handles menu item click with action
  - Handles submenu items
  - Closes menu when clicking outside
- **Last Tested**: 2025-09-09

### CertificateParameterSetting
- **Component Path**: `/src/service/Administration/CertificateSettingAndPrinting/CertificateParameterSetting/page/CertificateParameterSetting.tsx`
- **Test File**: `/src/tests/unit/components/CertificateParameterSetting.test.tsx`
- **Test Coverage**:
  - Renders with default tab
  - Switches between tabs
  - Handles format name input change
- **Last Tested**: 2025-09-09

### LoginPage
- **Component Path**: `/src/pages/LoginPage.tsx`
- **Test File**: `/src/tests/unit/pages/LoginPage.test.tsx`
- **Test Coverage**:
  - Renders login page with login form
  - Has the correct container styling
- **Last Tested**: 2025-09-09

### Dashboard
- **Component Path**: `/src/pages/dashboard/Dashboard.tsx`
- **Test File**: `/src/tests/unit/pages/Dashboard.test.tsx`
- **Test Coverage**:
  - Renders with default settings
  - Loads settings from localStorage on mount
  - Handles settings update from CustomEvent
  - Handles settings update from postMessage
  - Cleans up event listeners on unmount
- **Last Tested**: 2025-09-09

### App
- **Component Path**: `/src/renderer/App.tsx`
- **Test File**: `/src/tests/unit/App.test.tsx`
- **Test Coverage**:
  - Renders login page at /login
  - Redirects to dashboard for root path
  - Renders protected routes when authenticated
  - Handles 404 routes
  - Renders DayEnd component at /day-end
- **Last Tested**: 2025-09-09

### Main
- **File Path**: `/src/renderer/main.tsx`
- **Test File**: `/src/tests/unit/main.test.tsx`
- **Test Coverage**:
  - Renders App inside StrictMode
  - Uses StyleProvider with correct props
  - Sets up React root correctly
- **Last Tested**: 2025-09-09

### DayEnd
- **Component Path**: `/src/service/Administration/DayEnd/page/DayEnd.tsx`
- **Test File**: `/src/tests/unit/pages/DayEnd.test.tsx`
- **Test Coverage**:
  - Renders with default data
  - Displays formatted dates and amounts
  - Handles process day end button click
  - Handles refresh button click
  - Shows loading state during processing
  - Displays error state
  - Shows unbalanced state when calculations don't match
- **Last Tested**: 2025-09-09

## Adding New Tests

1. Create a test file in the appropriate directory under `src/tests/unit/`
2. Follow the naming convention: `ComponentName.test.tsx`
3. Update this document with the component's test information
4. Run tests using the commands above

## Test Structure Guidelines

```typescript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Component from 'path/to/component';

describe('ComponentName', () => {
  test('should do something', () => {
    // Test implementation
  });
});
```

## Best Practices
- Test one thing per test case
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Keep tests independent and isolated
- Mock external dependencies
- Test both happy paths and edge cases
