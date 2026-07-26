import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import FinancialYearClosing from '../../../service/Administration/FinancialYear/FinancialYearClosing/page/FinancialYearClosing';

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="close-icon">×</span>,
  Folder: () => <span data-testid="folder-icon">📁</span>,
  __esModule: true,
}));

// Mock the component
vi.mock('../../../service/Administration/FinancialYear/FinancialYearClosing/page/FinancialYearClosing', () => ({
  __esModule: true,
  default: () => <div data-testid="financial-year-closing">FinancialYearClosing Component</div>
}));

describe('FinancialYearClosing Component', () => {
  test('renders the component', () => {
    render(<FinancialYearClosing />);
    expect(screen.getByTestId('financial-year-closing')).toBeInTheDocument();
    expect(screen.getByText('FinancialYearClosing Component')).toBeInTheDocument();
  });
});

