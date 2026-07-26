import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CertificateParametersSetting from '../../../service/Administration/CertificateSettingAndPrinting/CertificateParameterSetting/page/CertificateParameterSetting';

// Mock any external dependencies
jest.mock('lucide-react', () => ({
  Search: () => <div>SearchIcon</div>,
  Save: () => <div>SaveIcon</div>,
  X: () => <div>XIcon</div>,
  XCircle: () => <div>XCircleIcon</div>,
}));

describe('CertificateParameterSetting', () => {
  beforeEach(() => {
    // Reset any mocked functions before each test
    jest.clearAllMocks();
  });

  test('renders the component with default tab', () => {
    render(<CertificateParametersSetting />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Certificate Parameter Setting')).toBeInTheDocument();
    
    // Check if both tabs are rendered
    expect(screen.getByText('Format Setting')).toBeInTheDocument();
    expect(screen.getByText('Detail Setting')).toBeInTheDocument();
    
    // Verify Format Setting tab is active by default
    expect(screen.getByLabelText('Format Setting')).toHaveClass('active');
  });

  test('switches between tabs', () => {
    render(<CertificateParametersSetting />);
    
    // Click on Detail Setting tab
    fireEvent.click(screen.getByText('Detail Setting'));
    
    // Verify Detail Setting tab is active
    expect(screen.getByLabelText('Detail Setting')).toHaveClass('active');
    
    // Click back to Format Setting tab
    fireEvent.click(screen.getByText('Format Setting'));
    
    // Verify Format Setting tab is active again
    expect(screen.getByLabelText('Format Setting')).toHaveClass('active');
  });

  test('handles format name input change', () => {
    render(<CertificateParametersSetting />);
    
    const formatNameInput = screen.getByPlaceholderText('Enter format name');
    const testFormatName = 'Test Format';
    
    fireEvent.change(formatNameInput, { target: { value: testFormatName } });
    
    expect(formatNameInput).toHaveValue(testFormatName);
  });
});

