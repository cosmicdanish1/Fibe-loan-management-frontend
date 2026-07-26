import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PassRdAccount from '../../../service/Masters/RdAccount/PassRdAccount/page/PassRdAccount';

describe('PassRdAccount Component', () => {
  test('renders the component with correct title', () => {
    render(<PassRdAccount />);
    
    // Check if the main title is rendered
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Pass RD A/C');
  });

  test('has correct styling classes', () => {
    const { container } = render(<PassRdAccount />);
    
    // Check if the main container has the correct classes
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('flex');
    expect(mainDiv).toHaveClass('items-center');
    expect(mainDiv).toHaveClass('justify-center');
    expect(mainDiv).toHaveClass('h-screen');
    
    // Check if the heading has the correct classes
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-4xl');
    expect(heading).toHaveClass('font-bold');
  });

  test('matches snapshot', () => {
    const { container } = render(<PassRdAccount />);
    expect(container).toMatchSnapshot();
  });
});

