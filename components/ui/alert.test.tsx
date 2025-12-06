import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert', () => {
  it('renders with default variant', () => {
    render(<Alert>Default Alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('bg-background text-foreground');
  });

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive">Destructive Alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('border-destructive/50 text-destructive');
  });

  it('renders with warning variant', () => {
    render(<Alert variant="warning">Warning Alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('border-yellow-500/50 text-yellow-500');
  });

  it('renders with success variant', () => {
    render(<Alert variant="success">Success Alert</Alert>);
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('border-green-500/50 text-green-500');
  });

  it('renders with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
