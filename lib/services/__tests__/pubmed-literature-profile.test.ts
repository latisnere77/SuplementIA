import {
  classifyLiteratureArticle,
  formatLiteratureProfileMessage,
  searchPubMedLiteratureProfile,
} from '../pubmed-literature-profile';

describe('pubmed literature profile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('categorizes broad PubMed literature without promoting it as confirmed evidence', () => {
    expect(
      classifyLiteratureArticle({
        title: 'Chemical composition and antimicrobial activity of Piper auritum essential oil',
        abstract: 'The extract was analyzed by gas chromatography.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe('phytochemical');

    expect(
      classifyLiteratureArticle({
        title: 'Protective effects of Piper auritum extract in rats',
        abstract: 'A rat model was used to evaluate activity in vivo.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe('preclinical');

    expect(
      classifyLiteratureArticle({
        title: 'Randomized controlled trial of magnesium in sleep quality',
        abstract: 'Human participants were randomized to treatment or placebo.',
        publicationTypes: ['Randomized Controlled Trial'],
      })
    ).toBe('human_clinical');

    expect(
      classifyLiteratureArticle({
        title: 'Selective cytotoxic effects of Piper auritum extracts in human cancer cell lines',
        abstract: 'The extract was evaluated in HeLa cells and primary human uterine fibroblasts.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe('preclinical');

    expect(
      classifyLiteratureArticle({
        title: 'Insecticidal activity of Piper auritum plant powders in stored corn grains',
        abstract: 'The powders were tested in a rural community for weevil control in corn.',
        publicationTypes: ['Journal Article'],
      })
    ).not.toBe('human_clinical');
  });

  it('builds a broad PubMed profile with categorized articles', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '2', idlist: ['1', '2'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          text: async () => `
          <PubmedArticle>
            <PMID>1</PMID>
            <ArticleTitle>Chemical composition of Piper auritum essential oil</ArticleTitle>
            <AbstractText>Phytochemical extract analysis.</AbstractText>
            <Journal><Title>Journal A</Title></Journal>
            <PubDate><Year>2021</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>2</PMID>
            <ArticleTitle>Piper auritum extract in rats</ArticleTitle>
            <AbstractText>Animal model in rats.</AbstractText>
            <Journal><Title>Journal B</Title></Journal>
            <PubDate><Year>2020</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          `,
        } as Response
      ) as jest.Mock;

    const profile = await searchPubMedLiteratureProfile('Piper auritum');

    expect(profile?.totalCount).toBe(2);
    expect(profile?.sampledCount).toBe(2);
    expect(profile?.categories.phytochemical).toBe(1);
    expect(profile?.categories.preclinical).toBe(1);
    expect(profile?.categories.human_clinical).toBe(0);

    const message = formatLiteratureProfileMessage('Piper auritum', profile);
    expect(message).toContain('Encontramos literatura publicada');
    expect(message).toContain('no evidencia clínica humana suficiente');
    expect(message).not.toContain('no hay estudios');
  });
});
