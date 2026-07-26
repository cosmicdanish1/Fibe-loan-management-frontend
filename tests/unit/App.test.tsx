import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../src/renderer/App';

// Mock lazy-loaded components
vi.mock('../../src/pages/LoginPage', () => ({
  __esModule: true,
  default: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../../src/pages/dashboard/Dashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));

// Mock other lazy-loaded components
vi.mock('../../src/service/Administration/DayEnd/page/DayEnd', () => ({
  __esModule: true,
  default: () => <div data-testid="day-end">Day End</div>,
}));

// Mock AuthProvider
vi.mock('../../src/auth/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

// Mock ProtectedRoute
vi.mock('../../src/auth/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

describe('App Component', () => {
  const originalScrollTo = window.scrollTo;
  
  beforeAll(() => {
    // Mock window.scrollTo
    window.scrollTo = vi.fn();
    
    // Mock Suspense fallback
    vi.mock('react', async () => {
      const actual = await vi.importActual('react');
      return {
        ...actual as object,
        Suspense: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="suspense">{children}</div>
        ),
      };
    });
  });
  
  afterAll(() => {
    // Restore window.scrollTo
    window.scrollTo = originalScrollTo;
    vi.restoreAllMocks();
  });
  
  test('renders without crashing', async () => {
    render(
      <Router>
        <App />
      </Router>
    );
    
    // Check if AuthProvider is rendered
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    
    // Wait for routes to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });
  });
});
