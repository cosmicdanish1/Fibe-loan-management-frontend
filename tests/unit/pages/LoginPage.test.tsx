import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '../../../pages/LoginPage';

// Mock the LoginForm component
jest.mock('../../../auth/components/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="mock-login-form">Mock Login Form</div>;
  };
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders login page with login form', () => {
    // Render the component
    render(<LoginPage />);

    // Check if the login form is rendered
    expect(screen.getByTestId('mock-login-form')).toBeInTheDocument();
    
    // Check if the page has the correct layout classes
    const pageContainer = screen.getByTestId('login-page');
    expect(pageContainer).toHaveClass('min-h-screen', 'bg-gray-50', 'flex', 'items-center', 'justify-center', 'p-4');
  });

  test('has the correct container styling', () => {
    render(<LoginPage />);
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('w-full', 'max-w-md');
  });
});

