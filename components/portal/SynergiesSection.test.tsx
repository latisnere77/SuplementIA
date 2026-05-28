import { render, screen } from '@testing-library/react';
import { SynergiesSection } from './SynergiesSection';

describe('SynergiesSection', () => {
  it('hides raw technical labels in Spanish', () => {
    render(
      <SynergiesSection
        language="es"
        supplementName="Centella asiatica"
        synergies={[
          {
            supplement: 'Complementary supplement combination',
            type: 'general_synergy',
            mechanism: 'Complementary supplement combination',
            effect: 'possible support',
            score: 70,
            tier: 3,
            categories: [],
            direction: 'positive',
          },
        ]}
      />
    );

    const content = document.body.textContent || '';

    expect(content).toContain('Combinación exploratoria');
    expect(content).toContain('Básica');
    expect(content).toContain('Exploratoria');
    expect(content).not.toContain('Complementary supplement combination');
    expect(content).not.toMatch(/\bBase\b/);
    expect(content).not.toMatch(/\bGeneral\b/);
    expect(content).not.toMatch(/\b70\b/);
  });

  it('keeps English labels readable without exposing raw scores', () => {
    render(
      <SynergiesSection
        language="en"
        supplementName="Centella asiatica"
        synergies={[
          {
            supplement: 'Magnesium',
            type: 'general_synergy',
            mechanism: 'General support',
            effect: 'possible support',
            score: 70,
            tier: 3,
            categories: [],
            direction: 'positive',
          },
        ]}
      />
    );

    expect(screen.getByText(/exploratory supplement combinations/i)).toBeInTheDocument();
    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText('Exploratory')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b70\b/);
  });
});
