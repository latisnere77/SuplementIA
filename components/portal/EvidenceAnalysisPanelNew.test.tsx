import { render, screen } from '@testing-library/react';
import EvidenceAnalysisPanelNew from './EvidenceAnalysisPanelNew';

jest.mock('./EvidenceOverview', () => function MockEvidenceOverview() {
  return <div data-testid="evidence-overview" />;
});

jest.mock('./BenefitEvidenceCard', () => ({
  BenefitEvidenceCard: ({ benefit, summary }: { benefit: string; summary: string }) => (
    <div data-testid="benefit-evidence-card">
      <span>{benefit}</span>
      <span>{summary}</span>
    </div>
  ),
}));

jest.mock('./SynergiesSection', () => ({
  SynergiesSection: () => <div data-testid="synergies-section" />,
}));

describe('EvidenceAnalysisPanelNew', () => {
  it('always starts the research model with supported uses, even when worksFor is empty', () => {
    render(
      <EvidenceAnalysisPanelNew
        language="es"
        supplementName="Garcinia Cambogia"
        evidenceSummary={{
          overallGrade: 'C',
          whatIsItFor: 'Extracto investigado en literatura clínica y de seguridad.',
          worksFor: [],
          doesntWorkFor: [
            {
              condition: 'Pérdida de peso',
              grade: 'D',
              description: 'La evidencia humana es mixta o no concluyente.',
            },
          ],
          limitedEvidence: [
            {
              condition: 'Marcadores metabólicos',
              grade: 'C',
              description: 'Estudios humanos limitados con endpoints indirectos.',
            },
          ],
          ingredients: [],
          evidenceByBenefit: [
            {
              benefit: 'Peso corporal',
              evidenceLevel: 'Insuficiente',
              studiesFound: 5,
              totalParticipants: 420,
              summary: 'No permite concluir un beneficio clínico consistente.',
            },
          ],
        }}
      />
    );

    expect(screen.getByRole('heading', { name: /para qué sí sirve/i })).toBeInTheDocument();
    expect(screen.getByText(/no encontramos usos con evidencia clínica humana suficiente/i)).toBeInTheDocument();
    expect(screen.getByText(/no funciona para/i)).toBeInTheDocument();
    expect(screen.getByText('Pérdida de peso')).toBeInTheDocument();
    expect(screen.getByText(/evidencia limitada/i)).toBeInTheDocument();
    expect(screen.getByText('Marcadores metabólicos')).toBeInTheDocument();
    expect(screen.getByText(/evidencia por beneficio/i)).toBeInTheDocument();
    expect(screen.getByText('Peso corporal')).toBeInTheDocument();
  });

  it('keeps the English first section explicit when there are no supported uses', () => {
    render(
      <EvidenceAnalysisPanelNew
        language="en"
        supplementName="Avocado leaf"
        evidenceSummary={{
          overallGrade: 'C',
          whatIsItFor: 'Botanical leaf with contextual preclinical literature.',
          worksFor: [],
          doesntWorkFor: [],
          limitedEvidence: [],
          ingredients: [],
        }}
      />
    );

    expect(screen.getByRole('heading', { name: /what it may help with/i })).toBeInTheDocument();
    expect(screen.getByText(/we did not find uses with sufficient human clinical evidence/i)).toBeInTheDocument();
  });
});
