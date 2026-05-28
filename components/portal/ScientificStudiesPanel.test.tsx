import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ScientificStudiesPanel from './ScientificStudiesPanel';

describe('ScientificStudiesPanel', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it('accepts the /api/portal/studies response shape and renders studies', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        studies: [
          {
            pmid: '12345',
            title: 'Magnesium clinical review',
            abstract: 'Review abstract',
            authors: ['A Author'],
            year: 2024,
            studyType: 'review',
            pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
          },
        ],
        totalFound: 1,
        searchQuery: 'Magnesium',
      }),
    } as Response);

    render(<ScientificStudiesPanel supplementName="Magnesium" />);

    fireEvent.click(screen.getByRole('button', { name: /ver estudios/i }));

    expect(await screen.findByText('Magnesium clinical review')).toBeInTheDocument();
    expect(screen.getByText(/1 estudios encontrados/i)).toBeInTheDocument();
  });

  it('shows controlled copy instead of raw 503 errors', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ success: false, error: 'upstream_unavailable' }),
    } as Response);

    render(<ScientificStudiesPanel supplementName="Magnesium" />);

    fireEvent.click(screen.getByRole('button', { name: /ver estudios/i }));

    await waitFor(() => {
      expect(screen.getByText(/temporalmente limitada/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/503/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir pubmed/i })).toHaveAttribute(
      'href',
      expect.stringContaining('Magnesium')
    );
  });
});
