import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Contents from '../../../service/Help/Contents/page/Contents';

describe('Contents Component', () => {
  test('renders the help contents page', () => {
    render(<Contents />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Help Contents')).toBeInTheDocument();
    
    // Check if the table of contents section is rendered
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
    
    // Check if all main sections are rendered
    expect(screen.getByText('1. Getting Started')).toBeInTheDocument();
    expect(screen.getByText('2. User Guide')).toBeInTheDocument();
    expect(screen.getByText('3. Troubleshooting')).toBeInTheDocument();
    
    // Check if the support information is rendered
    expect(screen.getByText('Need more help?')).toBeInTheDocument();
    expect(screen.getByText(/Contact our support team at/)).toBeInTheDocument();
  });

  test('displays all subsections under Getting Started', () => {
    render(<Contents />);
    
    // Check if all Getting Started subsections are rendered
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('System Requirements')).toBeInTheDocument();
    expect(screen.getByText('Installation Guide')).toBeInTheDocument();
  });

  test('displays all subsections under User Guide', () => {
    render(<Contents />);
    
    // Check if all User Guide subsections are rendered
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Creating New Records')).toBeInTheDocument();
    expect(screen.getByText('Managing Accounts')).toBeInTheDocument();
    expect(screen.getByText('Generating Reports')).toBeInTheDocument();
  });

  test('displays all subsections under Troubleshooting', () => {
    render(<Contents />);
    
    // Check if all Troubleshooting subsections are rendered
    expect(screen.getByText('Common Issues')).toBeInTheDocument();
    expect(screen.getByText('Error Messages')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  test('displays the correct support contact information', () => {
    render(<Contents />);
    
    // Check if the support email and phone are rendered
    expect(screen.getByText('support@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1 (123) 456-7890')).toBeInTheDocument();
  });

  test('has the correct styling classes', () => {
    const { container } = render(<Contents />);
    
    // Check main container classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'bg-white', 'p-8');
    
    // Check content box classes
    const contentBox = screen.getByText('Table of Contents').closest('div');
    expect(contentBox).toHaveClass('bg-gray-100', 'p-6', 'rounded-lg', 'shadow-md', 'max-w-4xl', 'w-full');
  });

  test('matches snapshot', () => {
    const { container } = render(<Contents />);
    expect(container).toMatchSnapshot();
  });
});

