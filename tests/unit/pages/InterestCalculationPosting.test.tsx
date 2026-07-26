import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InterestCalculationPosting from '../../../service/Administration/loan/Interest Calculation Posting/page/InterestCalculationPosting';

describe('InterestCalculationPosting Component', () => {
  test('renders the component with correct heading', () => {
    render(<InterestCalculationPosting />);
    
    // Check if the component renders with the correct heading
    const headingElement = screen.getByRole('heading', { level: 1 });
    expect(headingElement).toBeInTheDocument();
    expect(headingElement).toHaveTextContent('Interest Calculation / Posting');
    
    // Check if the component has the correct classes
    const containerElement = screen.getByRole('main');
    expect(containerElement).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen');
    
    // Check if the heading has the correct classes
    expect(headingElement).toHaveClass('text-4xl', 'font-bold');
  });

  test('matches snapshot', () => {
    const { container } = render(<InterestCalculationPosting />);
    expect(container).toMatchSnapshot();
  });
});

