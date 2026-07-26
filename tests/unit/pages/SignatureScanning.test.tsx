import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SignatureScanning from '../../../service/Masters/SignatureScanning/page/SignatureScanning';
import { useSignatureScanning } from '../../../service/Masters/SignatureScanning/hook/useSignatureScanning';

// Mock the useSignatureScanning hook
vi.mock('../../../../service/Masters/SignatureScanning/hook/useSignatureScanning');

const mockUseSignatureScanning = useSignatureScanning as jest.MockedFunction<typeof useSignatureScanning>;

describe('SignatureScanning Component', () => {
  // Mock data and functions
  const mockUpdateMemberNumber = vi.fn();
  const mockUpdateMemberName = vi.fn();
  const mockClearSignature = vi.fn();
  const mockSaveSignature = vi.fn();

  // Default mock data
  const defaultMockData = {
    memberNumber: '30001358',
    memberName: 'HIMMAT SINGH',
    signatureData: ''
  };

  // Set up the mock implementation before each test
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSignatureScanning.mockReturnValue({
      data: defaultMockData,
      updateMemberNumber: mockUpdateMemberNumber,
      updateMemberName: mockUpdateMemberName,
      clearSignature: mockClearSignature,
      saveSignature: mockSaveSignature
    });
  });

  test('renders the component with title', () => {
    render(<SignatureScanning />);
    expect(screen.getByText('Signature Scanning')).toBeInTheDocument();
  });

  test('displays member number input with default value', () => {
    render(<SignatureScanning />);
    const memberNumberInput = screen.getByLabelText('Member Number');
    expect(memberNumberInput).toBeInTheDocument();
    expect(memberNumberInput).toHaveValue('30001358');
  });

  test('displays member name input with default value', () => {
    render(<SignatureScanning />);
    const memberNameInput = screen.getByLabelText('Member Name');
    expect(memberNameInput).toBeInTheDocument();
    expect(memberNameInput).toHaveValue('HIMMAT SINGH');
  });

  test('calls updateMemberNumber when member number is changed', () => {
    render(<SignatureScanning />);
    const memberNumberInput = screen.getByLabelText('Member Number');
    fireEvent.change(memberNumberInput, { target: { value: '30001359' } });
    expect(mockUpdateMemberNumber).toHaveBeenCalledWith('30001359');
  });

  test('calls updateMemberName when member name is changed', () => {
    render(<SignatureScanning />);
    const memberNameInput = screen.getByLabelText('Member Name');
    fireEvent.change(memberNameInput, { target: { value: 'NEW NAME' } });
    expect(mockUpdateMemberName).toHaveBeenCalledWith('NEW NAME');
  });

  test('calls clearSignature when Clear button is clicked', () => {
    render(<SignatureScanning />);
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    expect(mockClearSignature).toHaveBeenCalled();
  });

  test('calls saveSignature when Save button is clicked', () => {
    render(<SignatureScanning />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockSaveSignature).toHaveBeenCalled();
  });

  test('displays the signature canvas area', () => {
    render(<SignatureScanning />);
    const canvasArea = screen.getByText('Signature Canvas Area');
    expect(canvasArea).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { container } = render(<SignatureScanning />);
    expect(container).toMatchSnapshot();
  });
});

