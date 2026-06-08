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

  it('normalizes malformed remote studies before rendering', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        studies: [
          {
            pmid: '23456789',
            title: { _: 'Centella usable remote title', i: 'italic marker' },
            abstract: { _: 'Remote abstract text' },
            authors: [{ name: 'A Author' }, 'B Author'],
            year: 2024,
            journal: { _: 'Remote journal' },
            studyType: { _: 'review' },
            pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23456789/',
          },
          {
            pmid: '34567890',
            title: { i: 'object without usable text' },
            abstract: 'This study should be filtered out.',
          },
          {
            pmid: 'not-a-pmid',
            title: 'Invalid PMID study',
            abstract: 'This study should also be filtered out.',
          },
        ],
        totalFound: 3,
        searchQuery: 'Centella asiatica',
      }),
    } as Response);

    render(<ScientificStudiesPanel supplementName="Centella asiatica" />);

    fireEvent.click(screen.getByRole('button', { name: /ver estudios/i }));

    expect(await screen.findByText('Centella usable remote title')).toBeInTheDocument();
    expect(screen.getByText('A Author, B Author')).toBeInTheDocument();
    expect(screen.getByText('Remote journal')).toBeInTheDocument();
    expect(screen.getByText(/1 estudios encontrados/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ver resumen/i }));
    expect(screen.getByText('Remote abstract text')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid PMID study')).not.toBeInTheDocument();
    expect(screen.queryByText('This study should be filtered out.')).not.toBeInTheDocument();
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
