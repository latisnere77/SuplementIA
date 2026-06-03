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

    expect(
      classifyLiteratureArticle({
        title: 'Medical cannabinoids: a pharmacology-based systematic review and meta-analysis for chronic pain and nausea.',
        abstract: 'The review summarizes therapeutic outcomes in patients.',
        publicationTypes: ['Systematic Review', 'Meta-Analysis'],
        meshHeadings: ['Humans', 'Chronic Pain', 'Nausea', 'Vomiting'],
      })
    ).toBe('human_clinical');
  });

  it('keeps human clinical trials human even when abstracts mention animal background', () => {
    expect(
      classifyLiteratureArticle({
        title: 'A double-blind, placebo-controlled study on the effects of Gotu Kola (Centella asiatica) on acoustic startle response in healthy subjects.',
        abstract: 'Recent studies in the rat showed effects on acoustic startle response. In this study, subjects were randomly assigned to Gotu Kola or placebo.',
        publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
        meshHeadings: ['Humans'],
      })
    ).toBe('human_clinical');

    expect(
      classifyLiteratureArticle({
        title: 'Pharmacokinetics and Pharmacodynamics of Key Components of a Standardized Centella asiatica Product in Cognitively Impaired Older Adults: A Phase 1, Double-Blind, Randomized Clinical Trial.',
        abstract: 'Preclinical studies have demonstrated effects in mouse models. Older adult participants were randomized in a clinical trial.',
        publicationTypes: ['Journal Article'],
        meshHeadings: [],
      })
    ).toBe('human_clinical');
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

  it('expands Mimosa tenuiflora and tepezcohuite queries to controlled botanical aliases', () => {
    expect(getPubMedQueryPhrases('tepezcohuite')).toEqual(expect.arrayContaining([
      'tepezcohuite',
      'Mimosa tenuiflora',
      'Mimosa hostilis',
      'tepescohuite',
      'Mimosa tenuiflora bark',
      'Mimosa tenuiflora cortex',
      'Mimosae tenuiflorae cortex',
      'Mimosa tenuiflora extract',
      'Mimosa tenuiflora hydrogel',
      'Mimosa tenuiflora MTC-2G',
    ]));
    expect(getPubMedQueryPhrases('Mimosa hostilis')).toEqual(expect.arrayContaining([
      'Mimosa hostilis',
      'Mimosa tenuiflora',
      'tepezcohuite',
      'tepescohuite',
    ]));
    expect(getPubMedQueryPhrases('Piper auritum')).toEqual(['Piper auritum']);
    expect(getPubMedQueryPhrases('Fadogia agrestis')).toEqual(['Fadogia agrestis']);
    expect(getPubMedQueryPhrases('hoja de aguacate')).toEqual([
      'hoja de aguacate',
      'avocado leaf',
      'Persea americana leaf',
    ]);
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

  it('expands Cannabis sativa to controlled cannabinoid clinical recall aliases', () => {
    expect(getPubMedQueryPhrases('cannabis sativa')).toEqual(expect.arrayContaining([
      'cannabis sativa',
      'cannabis',
      'medical cannabis',
      'medical marijuana',
      'cannabinoids',
    ]));
    expect(getPubMedQueryPhrases('cannabis sativa')).not.toEqual(expect.arrayContaining([
      'cannabidiol',
      'nabiximols',
      'dronabinol',
      'nabilone',
    ]));
    expect(getPubMedQueryPhrases('hemp seed')).toEqual(['hemp seed']);
  });

  it('keeps CBD PubMed query phrases scoped away from THC and synthetic cannabinoid lanes', () => {
    const phrases = getPubMedQueryPhrases('CBD');

    expect(phrases).toEqual(expect.arrayContaining(['CBD', 'cannabidiol']));
    expect(phrases).not.toEqual(expect.arrayContaining([
      'dronabinol',
      'nabilone',
      'nabiximols',
      'Sativex',
      'THC',
      'tetrahydrocannabinol',
    ]));
  });

  it('keeps nabiximols PubMed query phrases scoped away from CBD lanes', () => {
    const phrases = getPubMedQueryPhrases('nabiximols');

    expect(phrases).toEqual(expect.arrayContaining(['nabiximols', 'Sativex']));
    expect(phrases).not.toEqual(expect.arrayContaining(['CBD', 'cannabidiol']));
  });

  it('expands popular botanicals to controlled clinical recall aliases', () => {
    expect(getPubMedQueryPhrases('Bacopa monnieri')).toEqual(expect.arrayContaining([
      'Bacopa monnieri',
      'bacopa',
      'brahmi',
      'bacosides',
    ]));
    expect(getPubMedQueryPhrases('Saw palmetto')).toEqual(expect.arrayContaining([
      'Saw palmetto',
      'Serenoa repens',
      'Permixon',
      'hexanic extract',
    ]));
    expect(getPubMedQueryPhrases('Ginkgo biloba')).toEqual(expect.arrayContaining([
      'Ginkgo biloba',
      'EGb 761',
      'ginkgo extract',
    ]));
    expect(getPubMedQueryPhrases('Milk thistle')).toEqual(expect.arrayContaining([
      'Milk thistle',
      'Silybum marianum',
      'silymarin',
      'silibinin',
    ]));
    expect(getPubMedQueryPhrases('Rhodiola rosea')).toEqual(expect.arrayContaining([
      'Rhodiola rosea',
      'rhodiola',
      'SHR-5',
      'Vitano',
      'rosavins',
      'salidroside',
    ]));
  });

  it('keeps botanical PubMed recall aliases scoped to the requested botanical', () => {
    expect(getPubMedQueryPhrases('Bacopa monnieri')).not.toEqual(expect.arrayContaining([
      'Serenoa repens',
      'EGb 761',
      'silymarin',
      'Rhodiola rosea',
    ]));
    expect(getPubMedQueryPhrases('Saw palmetto')).not.toEqual(expect.arrayContaining([
      'bacopa',
      'EGb 761',
      'silymarin',
      'SHR-5',
    ]));
    expect(getPubMedQueryPhrases('Ginkgo biloba')).not.toEqual(expect.arrayContaining([
      'bacopa',
      'Serenoa repens',
      'silymarin',
      'Vitano',
    ]));
  });

  it('uses Mimosa botanical aliases in PubMed literature profile search without changing clinical classification', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '12', idlist: ['22128789'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          text: async () => `
          <PubmedArticle>
            <PMID>22128789</PMID>
            <ArticleTitle>A randomized comparative trial on the use of a hydrogel with tepescohuite extract in venous leg ulcers.</ArticleTitle>
            <AbstractText>Patients with chronic venous leg ulcers were randomized to hydrogel with Mimosa tenuiflora cortex extract or hydrogel alone.</AbstractText>
            <PubDate><Year>2012</Year></PubDate>
            <PublicationType>Randomized Controlled Trial</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
        } as Response
      ) as jest.Mock;
    global.fetch = fetchMock;

    const profile = await searchPubMedLiteratureProfile('tepezcohuite');
    const searchUrl = fetchMock.mock.calls[0][0] as string;

    expect(searchUrl).toContain(encodeURIComponent('"Mimosa tenuiflora"[Title/Abstract]'));
    expect(searchUrl).toContain(encodeURIComponent('"Mimosa hostilis"[Title/Abstract]'));
    expect(searchUrl).toContain(encodeURIComponent('"tepescohuite"[Title/Abstract]'));
    expect(searchUrl).toContain(encodeURIComponent('"Mimosa tenuiflora cortex"[Title/Abstract]'));
    expect(searchUrl).not.toContain(encodeURIComponent('"burns"[Title/Abstract]'));
    expect(profile?.categories.human_clinical).toBe(1);
    expect(profile?.articles[0]).toMatchObject({
      pmid: '22128789',
      category: 'human_clinical',
    });
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

  it('prioritizes human clinical Cannabis/cannabinoid articles in the PubMed literature sample', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '4079', idlist: ['9001', '9002'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          json: async () => ({ esearchresult: { count: '31837', idlist: ['35982439', '37283486', '31948424'] } }),
        } as Response
      )
      .mockResolvedValueOnce(
        {
          ok: true,
          text: async () => `
          <PubmedArticle>
            <PMID>19961570</PMID>
            <ArticleTitle>Whole plant cannabis extracts in the treatment of spasticity in multiple sclerosis: a systematic review.</ArticleTitle>
            <AbstractText>Randomized controlled trials in patients with multiple sclerosis were reviewed.</AbstractText>
            <PubDate><Year>2009</Year></PubDate>
            <PublicationType>Systematic Review</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>35982439</PMID>
            <ArticleTitle>Medical cannabinoids: a pharmacology-based systematic review and meta-analysis for chronic pain, nausea, vomiting, and spasticity.</ArticleTitle>
            <AbstractText>The review summarizes clinical studies in humans.</AbstractText>
            <PubDate><Year>2022</Year></PubDate>
            <PublicationType>Systematic Review</PublicationType>
            <PublicationType>Meta-Analysis</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>37283486</PMID>
            <ArticleTitle>Cannabis-based medicines and medical cannabis for adults with cancer pain.</ArticleTitle>
            <AbstractText>Randomized controlled trials in adult patients were analyzed.</AbstractText>
            <PubDate><Year>2023</Year></PubDate>
            <PublicationType>Meta-Analysis</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>9001</PMID>
            <ArticleTitle>Cannabis sativa extract in rat models.</ArticleTitle>
            <AbstractText>Animal model in rats.</AbstractText>
            <PubDate><Year>2026</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
            <MeshHeading><DescriptorName>Animals</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
        } as Response
      );
    global.fetch = fetchMock as jest.Mock;

    const profile = await searchPubMedLiteratureProfile('cannabis sativa');
    const broadSearchUrl = String(fetchMock.mock.calls[0][0]);
    const clinicalSearchUrl = String(fetchMock.mock.calls[1][0]);
    const fetchUrl = String(fetchMock.mock.calls[2][0]);

    expect(broadSearchUrl).toContain(encodeURIComponent('"medical cannabis"[Title/Abstract]'));
    expect(broadSearchUrl).toContain(encodeURIComponent('"cannabinoids"[Title/Abstract]'));
    expect(broadSearchUrl).not.toContain(encodeURIComponent('"cannabidiol"[Title/Abstract]'));
    expect(broadSearchUrl).not.toContain(encodeURIComponent('"nabiximols"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"spasticity"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"chronic pain"[Title/Abstract]'));
    expect(clinicalSearchUrl).toContain(encodeURIComponent('"Systematic Review"[Publication Type]'));
    expect(fetchUrl).toContain('19961570,35982439,37283486,31948424,28349316');
    expect(profile?.totalCount).toBe(4079);
    expect(profile?.articles.map((article) => article.pmid)).toEqual([
      '19961570',
      '35982439',
      '37283486',
      '9001',
    ]);
    expect(profile?.categories.human_clinical).toBe(3);
    expect(profile?.categories.preclinical).toBe(1);
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
