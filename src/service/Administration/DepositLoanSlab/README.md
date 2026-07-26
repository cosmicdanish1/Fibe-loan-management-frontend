# Deposit Interest Slab

A simple, modern component for managing deposit interest slabs that matches the original screenshot layout.

## Structure

```
DepositLoanSlab/
├── page/
│   └── DepositLoanSlab.tsx    # Main component matching screenshot layout
├── index.ts                   # Simple exports
└── README.md                  # This file
```

**Clean & Simple**: All empty folders and complex implementations have been removed.

## Features

- **Exact Layout Match**: Matches the original screenshot structure
- **Modern Design**: Clean, professional styling with gradients and shadows
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Radio Button Selection**: Fixed Deposit, Recurring Deposit, and Loan options
- **Data Grid**: Complex table structure with nested headers
- **Empty State**: Shows helpful message when no data is configured

## Usage

```tsx
import { DepositLoanSlab } from './service/Administration/DepositLoanSlab';

// Basic usage
<DepositLoanSlab />

// With close handler
<DepositLoanSlab onClose={() => console.log('Closed')} />
```

## Component Props

- `onClose?: () => void` - Optional close handler
- `className?: string` - Optional CSS class name

## Layout

The component maintains the exact same structure as the original:

1. **Title Bar**: "Deposit Interest Slab" with close button
2. **Slab Details Section**: Radio buttons for deposit type selection
3. **Data Grid**: Complex table with nested headers:
   - Sr.No
   - Amount (From/UpTo)
   - Period (From/UpTo)
   - Unit
   - Rate
   - Premature Rate
   - Applicable (From/UpTo)

## Responsive Behavior

- **Desktop**: Full table layout matching screenshot
- **Mobile/Tablet**: Card-based layout for better readability
- **Radio Buttons**: Stack vertically on mobile, horizontal on desktop