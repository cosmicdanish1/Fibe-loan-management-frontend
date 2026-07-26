# EMI Chart Component

## Overview
The EMI Chart component provides a comprehensive view of loan repayment schedules with real-time payment status tracking. It allows users to search for members, select their loans, and view detailed amortization schedules.

## Features
- **Member Search**: Search members by number or name
- **Loan Selection**: View all active and pending loans for a member
- **EMI Schedule**: Complete month-by-month repayment breakdown
- **Payment Status**: Real-time status (Paid ✅, Pending ⏳, Overdue ❌)
- **Visual Summary**: Progress bars and statistics
- **Export Options**: PDF and text export functionality
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### Accessing the Component
Navigate to: **Utility > EMI Chart**

### Step-by-Step Guide
1. **Search Member**: Click "Click to search and select a member"
2. **Select Member**: Choose from search results
3. **Choose Loan**: Select from available loans for the member
4. **View Schedule**: Review the complete EMI schedule
5. **Export Data**: Use the "Export PDF" button to download

## Component Structure

```
EMIChart/
├── page/
│   └── EMIChart.tsx          # Main component
└── README.md                 # This file
```

## API Integration

### Endpoints Used
- `GET /members/search` - Member search
- `GET /loans/search/member-loans` - Member loans
- `GET /loans/master/:loanCaseNo/emi-schedule` - EMI schedule

### Fallback Data
The component includes mock data fallbacks for testing when the backend is not available.

## Data Sources

### Database Tables
- **loan_master**: Primary loan information
- **demand_master**: Payment status tracking
- **member_master**: Member details

### Payment Status Logic
- **Paid**: Payment recorded in demand_master for the month
- **Pending**: Future installments not yet due
- **Overdue**: Past due installments with no payment

## Styling
- Uses Tailwind CSS for responsive design
- Color-coded status indicators:
  - Green: Paid installments
  - Yellow: Pending installments  
  - Red: Overdue installments
  - Blue: Loan summary information

## Error Handling
- Network error handling with user-friendly messages
- Fallback to mock data when API is unavailable
- Loading states and error displays
- Graceful degradation for missing data

## Performance Features
- Pagination for large schedules (12 items per page)
- Lazy loading of search results
- Debounced search input
- Efficient API calls

## Future Enhancements
- Real-time payment updates
- Advanced filtering options
- Payment trend analytics
- Bulk payment processing
- Email/SMS notifications

## Troubleshooting

### Common Issues
1. **No members found**: Check member_master table data
2. **No loans displayed**: Verify loan_master table has data
3. **Incorrect payment status**: Check demand_master data integrity
4. **Export not working**: Verify backend PDF generation service

### Debug Steps
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check backend service logs
4. Validate database connections

## Dependencies
- React 18+
- Lucide React (icons)
- Tailwind CSS (styling)
- Custom API service layer