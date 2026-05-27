import { act, render, screen } from '@testing-library/react';
import IntelligentLoadingSpinner, { LONG_PROCESSING_THRESHOLD_MS } from './IntelligentLoadingSpinner';

describe('IntelligentLoadingSpinner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows an honest long-running state instead of staying only at finalizing progress', () => {
    render(<IntelligentLoadingSpinner supplementName="Lion's mane" />);

    expect(screen.queryByText('Esto está tardando más de lo normal')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(LONG_PROCESSING_THRESHOLD_MS);
    });

    expect(screen.getByText('Esto está tardando más de lo normal')).toBeInTheDocument();
    expect(screen.getByText('La búsqueda sigue en proceso.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar esta página' })).toBeInTheDocument();
    expect(screen.getByText(/Algunas búsquedas toman más tiempo/)).toBeInTheDocument();
  });
});
