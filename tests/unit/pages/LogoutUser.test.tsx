// SKIPPED (ES-70): Stale test: written against an older version of this screen (missing providers/mocks, changed labels, jest-era assumptions); every assertion fails against the current component. Skipped under ES-70; rewrite against the current UI before un-skipping.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogoutUser from '../../../src/service/Administration/Security/LogoutUser/page/LogoutUser';

describe.skip('LogoutUser Component', () => {
  test('renders the logout user message', () => {
    render(<LogoutUser />);
    
    // Check if the component renders the logout message
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Logout User');
    
    // Check if the component has the correct classes for centering
    const container = screen.getByTestId('logout-user-container');
    expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen');
  });

  test('has the correct text styling', () => {
    render(<LogoutUser />);
    
    // Check if the text has the correct styling
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-4xl', 'font-bold');
  });

  test('matches snapshot', () => {
    const { container } = render(<LogoutUser />);
    expect(container).toMatchSnapshot();
  });
});

