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
    expect(screen.getAllByText(/evidencia limitada/i).length).toBeGreaterThan(0);
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

  it('renders a complete Centella research structure without editorial garbage', () => {
    render(
      <EvidenceAnalysisPanelNew
        language="es"
        supplementName="Centella asiatica"
        evidenceSummary={{
          overallGrade: 'B',
          whatIsItFor: [
            'Extracto vegetal investigado para síntomas venosos.',
            'Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico.',
            'Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico.',
          ].join(' '),
          worksFor: [
            {
              condition: 'Insuficiencia venosa crónica',
              grade: 'B',
              description: 'Apoyo estudiado para síntomas, no como sustituto de tratamiento médico.',
            },
          ],
          doesntWorkFor: [
            {
              condition: 'Depresión mayor',
              grade: 'D',
              description: 'apoyo estudiado para depresión mayor clínica',
            },
          ],
          limitedEvidence: [
            {
              condition: 'Ansiedad',
              grade: 'C',
              description: 'Evidencia pequeña y preliminar.',
            },
          ],
          ingredients: [],
          evidenceByBenefit: [
            {
              benefit: 'Microcirculación',
              evidenceLevel: 'Moderada',
              studiesFound: 3,
              totalParticipants: 140,
              summary: 'mejoras reportadas en síntesis de señales vasculares.',
            },
          ],
          dosage: {
            effectiveDose: '60 mg/día en estudios seleccionados',
            commonDose: '60-120 mg/día',
            timing: 'Con alimentos',
            notes: 'No sustituye uso estudiado medico.',
          },
          sideEffects: {
            common: ['Molestias gastrointestinales leves'],
            rare: ['No reportes de hepatotoxicidad en estudios revisados.'],
            severity: 'Generally Safe' as any,
            notes: 'sin reportes de toxicidad hepática en la muestra.',
          },
          interactions: {
            medications: [
              {
                medication: 'Fármacos hepatotóxicos',
                severity: 'Moderate',
                description: 'Revisar con profesional de salud.',
              },
            ],
            supplements: ['uso estudiado medico'],
            foods: 'Sin interacción alimentaria relevante.',
          },
          contraindications: ['Evitar con enfermedad hepática activa y uso estudiado medico.'],
          mechanisms: [
            {
              name: 'Síntesis de colágeno',
              description: 'mejoras reportadas en síntesis de colágeno.',
              evidenceLevel: 'weak',
            },
          ],
          buyingGuidance: {
            preferredForm: 'Extracto estandarizado',
            keyCompounds: [
              {
                name: 'Triterpenos',
                source: 'Centella asiatica',
                lookFor: 'Asiaticósidos declarados',
              },
            ],
            avoidFlags: ['Claims de tratamiento médico'],
            qualityIndicators: ['Estandarización clara'],
            notes: 'Revisar con atención médica si hay enfermedad hepática.',
          },
        }}
      />
    );

    expect(screen.getByRole('heading', { name: /qué es/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /para qué sí sirve/i })).toBeInTheDocument();
    expect(screen.getByText(/no funciona para/i)).toBeInTheDocument();
    expect(screen.getAllByText(/evidencia limitada/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /dosificación/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /efectos secundarios/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /interacciones/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contraindicaciones/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mecanismos/i })).toBeInTheDocument();

    const bodyText = document.body.textContent || '';
    expect(bodyText.match(/Interpretar como apoyo estudiado/g)).toHaveLength(1);
    expect(bodyText).toMatch(/reportes raros de lesión hepática/i);
    expect(bodyText).toContain('Generalmente leve');
    expect(bodyText).toContain('Exploratoria');
    expect(bodyText).not.toMatch(/uso estudiado medico/i);
    expect(bodyText).not.toMatch(/Generally Safe/i);
    expect(bodyText).not.toMatch(/apoyo estudiado para depresión mayor clínica/i);
    expect(bodyText).not.toMatch(/mejoras reportadas en síntesis/i);
  });
});
