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
      expect(screen.getByText(/No pudimos cargar estudios verificables/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/503/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir pubmed/i })).toHaveAttribute(
      'href',
      expect.stringContaining('Magnesium')
    );
  });

  it('falls back to local key studies when the studies API is unavailable', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ success: false, error: 'Failed to fetch studies from vector search' }),
    } as Response);

    render(
      <ScientificStudiesPanel
        supplementName="Ashwagandha"
        localStudies={[
          {
            pmid: '12345678',
            title: 'Ashwagandha randomized clinical trial',
            findings: [
              'Participants reported improved sleep quality compared with placebo.',
              'No severe adverse events were reported.',
            ],
            year: 2024,
            studyType: 'RCT',
            participants: 120,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ver estudios/i }));

    expect(await screen.findByText('Ashwagandha randomized clinical trial')).toBeInTheDocument();
    expect(screen.getByText(/1 estudios encontrados/i)).toBeInTheDocument();
    expect(screen.queryByText(/Estudios no disponibles temporalmente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/403/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver fuente original/i })).toHaveAttribute(
      'href',
      'https://pubmed.ncbi.nlm.nih.gov/12345678/'
    );
  });
});
