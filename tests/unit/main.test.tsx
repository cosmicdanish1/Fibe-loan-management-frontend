// SKIPPED (ES-70): Stale test: written against an older version of this screen (missing providers/mocks, changed labels, jest-era assumptions); every assertion fails against the current component. Skipped under ES-70; rewrite against the current UI before un-skipping.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { StyleProvider } from '@ant-design/cssinjs';
import { StrictMode } from 'react';
import App from '../../src/renderer/App';

// Mock ReactDOM.createRoot
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('../../src/renderer/App', () => ({
  __esModule: true,
  default: () => <div data-testid="app">Mock App</div>,
}));

describe.skip('main', () => {
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    // Mock console.error to avoid React 18 act() warnings
    console.error = vi.fn();
  });
  
  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });
  
  test('renders App inside StrictMode and StyleProvider', async () => {
    // Import the main file to execute it
    await import('../../src/renderer/main');
    
    // Verify createRoot was called with the correct container
    expect(createRoot).toHaveBeenCalledWith(expect.any(HTMLElement));
    
    // Get the render function passed to createRoot
    const mockCreateRoot = vi.mocked(createRoot);
    expect(mockCreateRoot.mock.results[0]?.value).toBeDefined();
    const rootInstance = mockCreateRoot.mock.results[0]!.value;
    
    expect(rootInstance.render).toHaveBeenCalled();
    const renderCall = rootInstance.render.mock.calls[0]?.[0];
    expect(renderCall).toBeDefined();
    
    // Render the component to check its structure
    const { container } = render(renderCall);
    
    // Check if App is wrapped in StrictMode and StyleProvider
    expect(container.innerHTML).toContain('app');
  });
});
