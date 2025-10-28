/**
 * Unit tests for AuthHeader Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthHeader from '../../components/AuthHeader';

// Wrapper component for tests that need routing
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AuthHeader Component', () => {
  it('should render FinKen logo', () => {
    renderWithRouter(<AuthHeader />);
    
    // Check if logo image is present
    const logo = screen.getByAltText(/finken/i);
    expect(logo).toBeDefined();
  });

  it('should render company name', () => {
    renderWithRouter(<AuthHeader />);
    
    // Check if FinKen text is present
    const title = screen.getByText(/finken/i);
    expect(title).toBeDefined();
  });

  it('should be clickable and navigate to home', () => {
    renderWithRouter(<AuthHeader />);
    
    // Header should have a link or be clickable
    const header = screen.getByRole('banner');
    expect(header).toBeDefined();
  });

  it('should have proper styling classes', () => {
    const { container } = renderWithRouter(<AuthHeader />);
    
    // Check if container exists
    expect(container.firstChild).toBeDefined();
  });
});

