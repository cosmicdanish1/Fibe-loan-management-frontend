import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeadOpeningBalance from '../../../service/Administration/HeadOpeningBalance/page/HeadOpeningBalance';

describe('HeadOpeningBalance Component', () => {
  test('renders the component with correct heading', () => {
    render(<HeadOpeningBalance />);
    
    // Check if the component renders with the correct heading
    const headingElement = screen.getByRole('heading', { level: 1 });
    expect(headingElement).toBeInTheDocument();
    expect(headingElement).toHaveTextContent('Head Opening Balanddddce');
    
    // Check if the component has the correct classes
    const containerElement = screen.getByRole('main');
    expect(containerElement).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen');
    
    // Check if the heading has the correct classes
    expect(headingElement).toHaveClass('text-4xl', 'font-bold');
  });

  test('matches snapshot', () => {
    const { container } = render(<HeadOpeningBalance />);
    expect(container).toMatchSnapshot();
  });
});

