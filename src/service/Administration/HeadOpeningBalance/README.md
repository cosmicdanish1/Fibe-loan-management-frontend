# Head Opening Balance

A modern, responsive component for managing head opening balances that matches the original screenshot layout.

## Structure

```
HeadOpeningBalance/
├── page/
│   └── HeadOpeningBalance.tsx    # Main component matching screenshot layout
├── index.ts                      # Simple exports
└── README.md                     # This file
```

**Clean & Simple**: All empty folders and complex implementations have been removed.

## Features

- **Exact Layout Match**: Matches the original screenshot structure
- **Modern Design**: Clean, professional styling with gradients and shadows
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Build Tree Button**: Green gradient button with tree icon
- **Trust Nagpur Header**: Purple gradient company header section
- **Data Grid**: 4-column table structure matching screenshot
- **Empty State**: Shows helpful message when no data is configured

## Usage

```tsx
import { HeadOpeningBalance } from './service/Administration/HeadOpeningBalance';

// Basic usage
<HeadOpeningBalance />

// With custom class
<HeadOpeningBalance className="custom-class" />
```

## Component Props

- `className?: string` - Optional CSS class name

## Layout

The component maintains the exact same structure as the original:

1. **Title Bar**: "HEAD OPENING BALANCE"
2. **Build Tree Button**: Green gradient button with tree icon
3. **Trust Nagpur Section**: Purple gradient company header
4. **Data Grid**: 4-column table with headers:
   - Column 1: "0"
   - Column 2: "Opening"
   - Column 3: "0"
   - Column 4: "0"

## Responsive Behavior

- **Desktop**: Full table layout matching screenshot
- **Mobile/Tablet**: Card-based layout for better readability
- **Adaptive Spacing**: Responsive padding and margins
- **Touch-Friendly**: Larger touch targets on mobile devices

## Modern Features

- **Gradient Backgrounds**: Subtle blue and purple gradients
- **Smooth Transitions**: Hover effects and animations
- **Professional Typography**: Clean, readable fonts
- **Accessibility**: Keyboard navigation and screen reader support
- **Empty States**: Helpful messages when no data is available