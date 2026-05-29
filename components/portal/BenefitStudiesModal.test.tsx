import { render, screen, waitFor } from '@testing-library/react';
import BenefitStudiesModal from './BenefitStudiesModal';

describe('BenefitStudiesModal', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it('does not show raw 503 errors and falls back to current recommendation evidence', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ success: false, error: 'upstream_unavailable' }),
    } as Response);

    render(
      <BenefitStudiesModal
        isOpen
        onClose={jest.fn()}
        supplementName="Magnesium"
        benefitQuery="migraine"
        benefitQueryEs="migraña"
        recommendation={{
          supplement: {
            worksFor: [
              {
                condition: 'Prevenir migraña en algunas personas',
                grade: 'B',
                evidenceGrade: 'B',
                notes: 'Uso preventivo con evidencia clínica moderada.',
                studyCount: 4,
              },
            ],
            doesntWorkFor: [],
            limitedEvidence: [],
          },
          evidence_summary: { totalStudies: 4 },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No pudimos cargar estudios verificables sobre este tema/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Error fetching studies: 503/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Error$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Basado en\s+4\s+estudios científicos/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Evidencia mostrada desde la ficha principal/i)).toBeInTheDocument();
    expect(screen.getByText('Prevenir migraña en algunas personas')).toBeInTheDocument();
  });
});
