import {
  classifyLiteratureArticle,
  formatLiteratureProfileMessage,
  getPubMedQueryPhrases,
  isHumanClinicalEvidenceArticle,
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

    expect(
      classifyLiteratureArticle({
        title: 'Antifungal potential of essential oils from native Mexican species',
        abstract: 'In vitro vapor-phase analyses of chemical composition and antifungal activity.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe('preclinical');

    expect(
      classifyLiteratureArticle({
        title: 'Abiotic stress alters the nutritional, metabolomic, and glycomic profiles of Piper auritum',
        abstract: 'Plants were grown under agricultural stress conditions.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe('other');

    expect(
      classifyLiteratureArticle({
        title: 'Randomized clinical trial of magnesium supplementation in healthy adults',
        abstract: 'Participants were randomized to magnesium or placebo.',
        publicationTypes: ['Randomized Controlled Trial'],
      })
    ).toBe('human_clinical');

    expect(
      classifyLiteratureArticle({
        title: 'Effectiveness of avocado leaf extract as antihypertensive',
        abstract: 'Blood pressure was evaluated after plant extract exposure.',
        publicationTypes: ['Journal Article'],
        meshHeadings: ['Animals', 'Rats', 'Rats, Wistar'],
      })
    ).toBe('preclinical');
  });

  it('only treats human clinical studies as benefit-claim evidence', () => {
    expect(
      isHumanClinicalEvidenceArticle({
        title: 'Selective cytotoxic effects of extracts in human cancer cell lines',
        abstract: 'The extract was evaluated in human cancer cells in vitro.',
        publicationTypes: ['Journal Article'],
      })
    ).toBe(false);

    expect(
      isHumanClinicalEvidenceArticle({
        title: 'Systematic review of in vitro antioxidant activity of botanical extracts',
        abstract: 'The review summarizes cell-free and cell line assays.',
        publicationTypes: ['Systematic Review'],
      })
    ).toBe(false);

    expect(
      isHumanClinicalEvidenceArticle({
        title: 'Meta-analysis of randomized controlled trials of psyllium supplementation',
        abstract: 'Included clinical trials enrolled adult participants with elevated cholesterol.',
        publicationTypes: ['Meta-Analysis'],
      })
    ).toBe(true);

    expect(
      isHumanClinicalEvidenceArticle({
        title: 'Double-blind placebo-controlled trial of vitamin D in adults',
        abstract: 'Healthy adults were randomized to supplementation or placebo.',
        publicationTypes: ['Clinical Trial'],
      })
    ).toBe(true);
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

  it('expands Spanish avocado leaf queries to controlled PubMed aliases', async () => {
    expect(getPubMedQueryPhrases('hoja de aguacate')).toEqual([
      'hoja de aguacate',
      'avocado leaf',
      'Persea americana leaf',
    ]);
    expect(getPubMedQueryPhrases('hojas de aguacate')).toEqual([
      'hojas de aguacate',
      'avocado leaf',
      'Persea americana leaf',
    ]);
    expect(getPubMedQueryPhrases('Piper auritum')).toEqual(['Piper auritum']);
  });

  it('expands Centella asiatica and gotu kola to controlled PubMed aliases', () => {
    expect(getPubMedQueryPhrases('centella asiatica')).toEqual([
      'centella asiatica',
      'gotu kola',
      'Centella asiatica extract',
      'total triterpenic fraction of Centella asiatica',
      'TECA Centella asiatica',
    ]);
    expect(getPubMedQueryPhrases('gotu kola')).toEqual([
      'gotu kola',
      'Centella asiatica',
      'Centella asiatica extract',
      'total triterpenic fraction of Centella asiatica',
      'TECA Centella asiatica',
    ]);
  });

  it('prioritizes human clinical Centella articles in the PubMed literature sample', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '1324', idlist: ['9001', '9002'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '6', idlist: ['11106141', '35328954', '23533507', '35204098'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          text: async () => `
          <PubmedArticle>
            <PMID>11106141</PMID>
            <ArticleTitle>A double-blind, placebo-controlled study on the effects of Gotu Kola (Centella asiatica) on acoustic startle response in healthy subjects.</ArticleTitle>
            <AbstractText>Healthy subjects participated in a randomized placebo-controlled study.</AbstractText>
            <PubDate><Year>2000</Year></PubDate>
            <PublicationType>Clinical Trial</PublicationType>
            <PublicationType>Randomized Controlled Trial</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>35328954</PMID>
            <ArticleTitle>A Systematic Review of the Effect of Centella asiatica on Wound Healing.</ArticleTitle>
            <AbstractText>Four clinical trials met the inclusion criteria.</AbstractText>
            <PubDate><Year>2022</Year></PubDate>
            <PublicationType>Systematic Review</PublicationType>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>23533507</PMID>
            <ArticleTitle>A Systematic Review of the Efficacy of Centella asiatica for Improvement of the Signs and Symptoms of Chronic Venous Insufficiency.</ArticleTitle>
            <AbstractText>Randomized clinical trials were searched for patients with chronic venous insufficiency.</AbstractText>
            <PubDate><Year>2013</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>35204098</PMID>
            <ArticleTitle>Pharmacokinetics and Pharmacodynamics of Key Components of a Standardized Centella asiatica Product in Cognitively Impaired Older Adults: A Phase 1, Double-Blind, Randomized Clinical Trial.</ArticleTitle>
            <AbstractText>Older adult participants were randomized in a clinical trial.</AbstractText>
            <PubDate><Year>2022</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          `,
        } as Response
      );
    global.fetch = fetchMock as jest.Mock;

    const profile = await searchPubMedLiteratureProfile('centella asiatica');
    const broadSearchUrl = String(fetchMock.mock.calls[0][0]);
    const clinicalSearchUrl = String(fetchMock.mock.calls[1][0]);
    const fetchUrl = String(fetchMock.mock.calls[2][0]);

    expect(broadSearchUrl).toContain(encodeURIComponent('"gotu kola"[Title/Abstract]'));
    expect(broadSearchUrl).toContain(encodeURIComponent('"Centella asiatica extract"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"venous insufficiency"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"wound healing"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"Randomized Controlled Trial"[Publication Type]'));
    expect(fetchUrl).toContain('11106141,35328954,23533507,35204098,3544968,7936334');
    expect(profile?.totalCount).toBe(1324);
    expect(profile?.articles.map((article) => article.pmid)).toEqual([
      '11106141',
      '35328954',
      '23533507',
      '35204098',
    ]);
    expect(profile?.categories.human_clinical).toBe(3);
    expect(profile?.categories.review).toBe(1);
    expect(profile?.categories.preclinical).toBe(0);
  });

  it('uses avocado leaf aliases for PubMed profiles and keeps rat literature preclinical', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '1', idlist: ['40919293'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          text: async () => `
          <PubmedArticle>
            <PMID>40919293</PMID>
            <ArticleTitle>Effectiveness of avocado leaf extract (Persea americana Mill.) as antihypertensive.</ArticleTitle>
            <AbstractText>This study used an experimental in vivo design involving white male Wistar rats.</AbstractText>
            <PubDate><Year>2022</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
            <MeshHeading><DescriptorName>Animals</DescriptorName></MeshHeading>
            <MeshHeading><DescriptorName>Rats</DescriptorName></MeshHeading>
            <MeshHeading><DescriptorName>Rats, Wistar</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
        } as Response
      );
    global.fetch = fetchMock as jest.Mock;

    const profile = await searchPubMedLiteratureProfile('hoja de aguacate');
    const searchUrl = String(fetchMock.mock.calls[0][0]);

    expect(searchUrl).toContain(encodeURIComponent('"hoja de aguacate"[Title/Abstract]'));
    expect(searchUrl).toContain(encodeURIComponent('"avocado leaf"[Title/Abstract]'));
    expect(searchUrl).toContain(encodeURIComponent('"Persea americana leaf"[Title/Abstract]'));
    expect(searchUrl).not.toContain(encodeURIComponent('"Persea americana"[Title/Abstract]'));
    expect(profile?.totalCount).toBe(1);
    expect(profile?.articles[0]).toMatchObject({
      pmid: '40919293',
      category: 'preclinical',
    });
    expect(profile?.categories.preclinical).toBe(1);
    expect(profile?.categories.human_clinical).toBe(0);
  });

  it('formats no-article profiles without implying clinical benefits', () => {
    const message = formatLiteratureProfileMessage('unknown herb', {
      query: '"unknown herb"[Title/Abstract]',
      totalCount: 0,
      sampledCount: 0,
      categories: {
        human_clinical: 0,
        review: 0,
        preclinical: 0,
        phytochemical: 0,
        other: 0,
      },
      articles: [],
    });

    expect(message).toBe('No encontramos evidencia clínica humana suficiente para confirmar beneficios de "unknown herb".');
    expect(message).not.toContain('sirve');
    expect(message).not.toContain('beneficios confirmados');
  });
});
