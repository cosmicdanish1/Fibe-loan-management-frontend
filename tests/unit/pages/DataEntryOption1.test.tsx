import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataEntryOption1 from '../../../service/Masters/DataEntry/DataEntryOption1/page/DataEntryOption1';

describe('DataEntryOption1 Component', () => {
  test('renders the component with correct title', () => {
    render(<DataEntryOption1 />);
    
    // Check if the title is rendered with the correct text
    const titleElement = screen.getByRole('heading', { level: 1 });
    expect(titleElement).toHaveTextContent('Data Entry Option 1');
    
    // Check if the title has the correct styling classes
    expect(titleElement).toHaveClass('text-4xl', 'font-bold');
  });

  test('is centered on the page', () => {
    const { container } = render(<DataEntryOption1 />);
    
    // Check if the main container has the correct flex classes for centering
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('flex', 'items-center', 'justify-center', 'h-screen');
  });

  test('matches snapshot', () => {
    const { container } = render(<DataEntryOption1 />);
    expect(container).toMatchSnapshot();
  });

  test('has no additional unexpected elements', () => {
    render(<DataEntryOption1 />);
    
    // Check that there's exactly one h1 element
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    
    // Check that there's no other interactive elements
    const buttons = screen.queryAllByRole('button');
    const links = screen.queryAllByRole('link');
    const inputs = screen.queryAllByRole('textbox');
    
    expect(buttons).toHaveLength(0);
    expect(links).toHaveLength(0);
    expect(inputs).toHaveLength(0);
  });
});

