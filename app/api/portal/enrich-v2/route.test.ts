/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(() => {
    const send = jest.fn();
    (globalThis as any).__mockLambdaSend = send;
    return { send };
  }),
  InvokeCommand: jest.fn((input) => input),
}));

jest.mock('@/lib/services/abbreviation-expander', () => ({
  expandAbbreviation: jest.fn(async (term: string) => ({
    original: term,
    expanded: term,
    alternatives: [term],
    confidence: 1,
    source: 'none',
  })),
}));

describe('/api/portal/enrich-v2 POST', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).__mockLambdaSend?.mockReset();
  });

  it('returns insufficient_data for scientific botanical names when studies fetch is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'piper auritum',
        category: 'piper auritum',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.message).toContain('piper auritum');
  });

  it('returns insufficient_data for scientific botanical names when studies fetch cannot connect', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Fadogia agrestis',
        category: 'Fadogia agrestis',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.message).toContain('Fadogia agrestis');
  });

  it('uses local PubMed Centella recall when studies fetch returns a botanical error', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'No studies found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '1347', idlist: ['9001'] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '2', idlist: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          `
          <PubmedArticle>
            <PMID>3544968</PMID>
            <ArticleTitle>Titrated extract of Centella asiatica (TECA) in the treatment of venous insufficiency of the lower limbs.</ArticleTitle>
            <AbstractText>Ninety-four patients participated in a multicenter, double-blind versus placebo study.</AbstractText>
            <PublicationType>Clinical Trial</PublicationType>
            <PublicationType>Randomized Controlled Trial</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>7936334</PMID>
            <ArticleTitle>The microcirculatory activity of Centella asiatica in venous insufficiency. A double-blind study.</ArticleTitle>
            <AbstractText>In 87 patients the efficacy of oral FTTCA versus placebo was assessed in a double blind study.</AbstractText>
            <PublicationType>Clinical Trial</PublicationType>
            <PublicationType>Randomized Controlled Trial</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              name: 'Centella asiatica',
              worksFor: [
                {
                  condition: 'Chronic venous insufficiency',
                  evidenceGrade: 'B',
                  studyCount: 2,
                },
              ],
              totalStudies: 2,
            },
            metadata: {
              hasRealData: true,
              studiesUsed: 2,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'centella asiatica',
        category: 'centella asiatica',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).not.toBe('insufficient_data');
    expect(body.metadata.humanClinicalStudiesCount).toBe(2);

    const enricherCall = fetchMock.mock.calls[4];
    const enricherBody = JSON.parse(enricherCall[1]?.body as string);
    expect(enricherBody.studies.map((study: any) => study.pmid)).toEqual(['3544968', '7936334']);
  });

  it('includes a broad PubMed literature profile for botanical no-data responses', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '2', idlist: ['1', '2'] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          `
          <PubmedArticle>
            <PMID>1</PMID>
            <ArticleTitle>Chemical composition of Piper auritum essential oil</ArticleTitle>
            <AbstractText>Phytochemical extract analysis.</AbstractText>
            <PubDate><Year>2021</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>2</PMID>
            <ArticleTitle>Piper auritum extract in rats</ArticleTitle>
            <AbstractText>Animal model in rats.</AbstractText>
            <PubDate><Year>2020</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          `,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Piper auritum',
        category: 'Piper auritum',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.message).toContain('Encontramos literatura publicada');
    expect(body.message).toContain('no evidencia clínica humana suficiente');
    expect(body.metadata.literatureProfile.totalCount).toBe(2);
    expect(body.metadata.literatureProfile.categories.phytochemical).toBe(1);
    expect(body.metadata.literatureProfile.categories.preclinical).toBe(1);
  });

  it('returns insufficient_data for common-language botanical plant-part queries when studies fetch is forbidden', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '1', idlist: ['40919293'] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          `
          <PubmedArticle>
            <PMID>40919293</PMID>
            <ArticleTitle>Effectiveness of avocado leaf extract (Persea americana Mill.) as antihypertensive.</ArticleTitle>
            <AbstractText>This study used an experimental in vivo study design involving white male Wistar rats.</AbstractText>
            <PubDate><Year>2022</Year></PubDate>
            <PublicationType>Journal Article</PublicationType>
            <MeshHeading><DescriptorName>Animals</DescriptorName></MeshHeading>
            <MeshHeading><DescriptorName>Rats</DescriptorName></MeshHeading>
            <MeshHeading><DescriptorName>Rats, Wistar</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'hoja de aguacate',
        category: 'hoja de aguacate',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.message).toContain('hoja de aguacate');
    expect(body.message).toContain('no evidencia clínica humana suficiente');
    expect(body.metadata.literatureProfile.categories.preclinical).toBe(1);
    expect(body.metadata.literatureProfile.categories.human_clinical).toBe(0);
    expect(body.metadata.literatureProfile.articles[0]).toMatchObject({
      pmid: '40919293',
      category: 'preclinical',
    });
    expect(JSON.stringify(body)).not.toMatch(/sirve para|treats|cures|beneficio clinico|beneficio clínico/i);
  });

  it('canonicalizes tepezcohuite to Mimosa tenuiflora and falls back to literature profile without products', async () => {
    const { expandAbbreviation } = jest.requireMock('@/lib/services/abbreviation-expander');
    expandAbbreviation.mockResolvedValueOnce({
      original: 'tepezcohuite',
      alternatives: ['Mimosa tenuiflora'],
      confidence: 0.95,
      source: 'heuristic',
    });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Backend error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '1', idlist: ['22128789'] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          `
          <PubmedArticle>
            <PMID>22128789</PMID>
            <ArticleTitle>A randomized comparative trial on the use of a hydrogel with tepescohuite extract in venous leg ulcers.</ArticleTitle>
            <AbstractText>Patients with chronic venous leg ulcers were randomized to hydrogel with Mimosa tenuiflora cortex extract or hydrogel alone.</AbstractText>
            <PubDate><Year>2012</Year></PubDate>
            <PublicationType>Randomized Controlled Trial</PublicationType>
            <MeshHeading><DescriptorName>Humans</DescriptorName></MeshHeading>
          </PubmedArticle>
          `,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'tepezcohuite',
        category: 'tepezcohuite',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    const studiesRequestBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    const pubmedSearchUrl = fetchMock.mock.calls[1][0] as string;

    expect(studiesRequestBody.supplementName).toBe('Mimosa tenuiflora');
    expect(pubmedSearchUrl).toContain(encodeURIComponent('"Mimosa tenuiflora"[Title/Abstract]'));
    expect(pubmedSearchUrl).toContain(encodeURIComponent('"Mimosa hostilis"[Title/Abstract]'));
    expect(pubmedSearchUrl).toContain(encodeURIComponent('"tepescohuite"[Title/Abstract]'));
    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.metadata.literatureProfile.categories.human_clinical).toBe(1);
    expect(body.worksFor || []).toHaveLength(0);
    expect(body.products || []).toHaveLength(0);
    expect(JSON.stringify(body)).not.toMatch(/sirve para quemaduras|treats burns|cures wounds/i);
  });

  it('returns controlled upstream_unavailable when studies fetch is forbidden for a common supplement', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Psyllium',
        category: 'Psyllium',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('upstream_unavailable');
    expect(body.message).toContain('Psyllium');
    expect(body.details).toContain('Forbidden');
  });

  it('returns controlled upstream_unavailable when studies fetch cannot connect for a common supplement', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Psyllium',
        category: 'Psyllium',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('upstream_unavailable');
    expect(body.message).toContain('Psyllium');
    expect(body.details).toContain('fetch failed');
  });

  it('does not send preclinical-only literature to the benefit enricher', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '111',
                  title: 'Piper auritum extract in rats',
                  abstract: 'Animal model in rats evaluated extract activity.',
                  publicationTypes: ['Journal Article'],
                },
                {
                  pmid: '222',
                  title: 'Selective cytotoxic effects in human cancer cell lines',
                  abstract: 'The extract was evaluated in HeLa cells in vitro.',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ esearchresult: { count: '2', idlist: ['111', '222'] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          `
          <PubmedArticle>
            <PMID>111</PMID>
            <ArticleTitle>Piper auritum extract in rats</ArticleTitle>
            <AbstractText>Animal model in rats evaluated extract activity.</AbstractText>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          <PubmedArticle>
            <PMID>222</PMID>
            <ArticleTitle>Selective cytotoxic effects in human cancer cell lines</ArticleTitle>
            <AbstractText>The extract was evaluated in HeLa cells in vitro.</AbstractText>
            <PublicationType>Journal Article</PublicationType>
          </PubmedArticle>
          `,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Piper auritum',
        category: 'Piper auritum',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('insufficient_data');
    expect(body.message).toContain('no evidencia clínica humana suficiente');
    expect(body.metadata.literatureProfile.categories.preclinical).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('lambda-url'),
      expect.anything()
    );
  });

  it('passes only human clinical studies to the benefit enricher', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '111',
                  title: 'Piper auritum extract in rats',
                  abstract: 'Animal model in rats evaluated extract activity.',
                  publicationTypes: ['Journal Article'],
                },
                {
                  pmid: '333',
                  title: 'Randomized clinical trial of magnesium in healthy adults',
                  abstract: 'Participants were randomized to magnesium or placebo.',
                  publicationTypes: ['Randomized Controlled Trial'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              name: 'Magnesium',
              worksFor: [
                {
                  condition: 'Sleep quality',
                  evidenceGrade: 'B',
                  studyCount: 1,
                },
              ],
              totalStudies: 1,
            },
            metadata: {
              hasRealData: true,
              studiesUsed: 1,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Magnesium',
        category: 'Magnesium',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.metadata.studiesCount).toBe(2);
    expect(body.metadata.humanClinicalStudiesCount).toBe(1);

    const enricherCall = fetchMock.mock.calls[1];
    const enricherBody = JSON.parse(enricherCall[1]?.body as string);
    expect(enricherBody.studies).toHaveLength(1);
    expect(enricherBody.studies[0].pmid).toBe('333');
  });

  it('falls back to IAM Lambda invocation when the benefit enricher URL is forbidden', async () => {
    const mockLambdaSend = (globalThis as any).__mockLambdaSend;
    mockLambdaSend.mockResolvedValueOnce({
      StatusCode: 200,
      Payload: Buffer.from(JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            name: 'Centella asiatica',
            worksFor: [
              {
                condition: 'Chronic venous insufficiency',
                evidenceGrade: 'B',
                studyCount: 1,
              },
            ],
            totalStudies: 1,
          },
          metadata: {
            hasRealData: true,
            studiesUsed: 1,
          },
        }),
      })),
    });

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '3544968',
                  title: 'Titrated extract of Centella asiatica in venous insufficiency.',
                  abstract: 'Ninety-four patients participated in a double-blind placebo study.',
                  publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
                  meshHeadings: ['Humans'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'centella asiatica',
        category: 'centella asiatica',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).not.toBe('upstream_unavailable');
    expect(body.metadata.humanClinicalStudiesCount).toBe(1);
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
  });

  it('recovers Centella asiatica human clinical evidence with controlled clinical recall search', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '9001',
                  title: 'Centella asiatica extract in rats',
                  abstract: 'Animal model in rats evaluated extract activity.',
                  publicationTypes: ['Journal Article'],
                  meshHeadings: ['Animals', 'Rats'],
                },
                {
                  pmid: '9002',
                  title: 'Chemical composition of Centella asiatica extract',
                  abstract: 'Phytochemical analysis of triterpenes.',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '11106141',
                  title: 'A double-blind, placebo-controlled study on the effects of Gotu Kola (Centella asiatica) on acoustic startle response in healthy subjects.',
                  abstract: 'Healthy subjects participated in a randomized placebo-controlled study.',
                  publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '35328954',
                  title: 'A Systematic Review of the Effect of Centella asiatica on Wound Healing.',
                  abstract: 'Four clinical trials met the inclusion criteria.',
                  publicationTypes: ['Systematic Review'],
                },
                {
                  pmid: '23533507',
                  title: 'A Systematic Review of the Efficacy of Centella asiatica for Improvement of the Signs and Symptoms of Chronic Venous Insufficiency.',
                  abstract: 'Randomized clinical trials were searched for patients with chronic venous insufficiency.',
                  publicationTypes: ['Journal Article'],
                },
                {
                  pmid: '35204098',
                  title: 'Pharmacokinetics and Pharmacodynamics of Key Components of a Standardized Centella asiatica Product in Cognitively Impaired Older Adults: A Phase 1, Double-Blind, Randomized Clinical Trial.',
                  abstract: 'Older adult participants were randomized in a clinical trial.',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              name: 'Centella asiatica',
              worksFor: [
                {
                  condition: 'Wound healing',
                  evidenceGrade: 'C',
                  studyCount: 1,
                },
              ],
              totalStudies: 4,
            },
            metadata: {
              hasRealData: true,
              studiesUsed: 4,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'centella asiatica',
        category: 'centella asiatica',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).not.toBe('insufficient_data');
    expect(body.metadata.humanClinicalStudiesCount).toBe(4);

    const primaryStudiesCall = fetchMock.mock.calls[0];
    const primaryStudiesBody = JSON.parse(primaryStudiesCall[1]?.body as string);
    expect(primaryStudiesBody).toMatchObject({
      supplementName: 'centella asiatica',
      yearFrom: 2010,
      humanStudiesOnly: true,
    });

    const recallStudiesCall = fetchMock.mock.calls[1];
    const recallStudiesBody = JSON.parse(recallStudiesCall[1]?.body as string);
    expect(recallStudiesBody.supplementName).toBe('Centella asiatica');
    expect(recallStudiesBody.benefitQuery).toContain('venous insufficiency');
    expect(recallStudiesBody.benefitQuery).toContain('wound healing');
    expect(recallStudiesBody.benefitQuery).toContain('randomized controlled trial');
    expect(recallStudiesBody.yearFrom).toBeUndefined();
    expect(recallStudiesBody.humanStudiesOnly).toBe(true);

    const enricherCall = fetchMock.mock.calls[2];
    const enricherBody = JSON.parse(enricherCall[1]?.body as string);
    expect(enricherBody.studies.map((study: any) => study.pmid)).toEqual([
      '11106141',
      '35328954',
      '23533507',
      '35204098',
    ]);
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('9001');
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('9002');
  });

  it('recovers Gotu Kola human clinical evidence with controlled clinical recall search', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '9003',
                  title: 'Gotu Kola extract in mouse model',
                  abstract: 'A mouse model evaluated extract activity.',
                  publicationTypes: ['Journal Article'],
                  meshHeadings: ['Animals', 'Mice'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '3544968',
                  title: 'Titrated extract of Centella asiatica (TECA) in the treatment of venous insufficiency of the lower limbs.',
                  abstract: 'Ninety-four patients participated in a multicenter, double-blind versus placebo study.',
                  publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '7936334',
                  title: 'The microcirculatory activity of Centella asiatica in venous insufficiency. A double-blind study.',
                  abstract: 'In patients with chronic venous hypertensive microangiopathy, oral FTTCA was tested versus placebo.',
                  publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '11106141',
                  title: 'A double-blind, placebo-controlled study on the effects of Gotu Kola (Centella asiatica) on acoustic startle response in healthy subjects.',
                  abstract: 'Healthy subjects participated in a randomized placebo-controlled study.',
                  publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '35204098',
                  title: 'Pharmacokinetics and Pharmacodynamics of Key Components of a Standardized Centella asiatica Product in Cognitively Impaired Older Adults: A Phase 1, Double-Blind, Randomized Clinical Trial.',
                  abstract: 'Older adult participants were randomized in a clinical trial.',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              name: 'Gotu Kola',
              worksFor: [
                {
                  condition: 'Chronic venous insufficiency',
                  evidenceGrade: 'B',
                  studyCount: 2,
                },
              ],
              totalStudies: 2,
            },
            metadata: {
              hasRealData: true,
              studiesUsed: 2,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'gotu kola',
        category: 'gotu kola',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).not.toBe('insufficient_data');
    expect(body.metadata.humanClinicalStudiesCount).toBe(4);

    const recallStudiesCall = fetchMock.mock.calls[1];
    const recallStudiesBody = JSON.parse(recallStudiesCall[1]?.body as string);
    expect(recallStudiesBody.supplementName).toBe('Centella asiatica');
    expect(recallStudiesBody.benefitQuery).toContain('venous insufficiency');
    expect(recallStudiesBody.humanStudiesOnly).toBe(true);

    const enricherCall = fetchMock.mock.calls[2];
    const enricherBody = JSON.parse(enricherCall[1]?.body as string);
    expect(enricherBody.studies.map((study: any) => study.pmid)).toEqual([
      '3544968',
      '7936334',
      '11106141',
      '35204098',
    ]);
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('9003');
  });

  it.each([
    {
      supplementName: 'Bacopa monnieri',
      expectedRecallName: 'Bacopa monnieri',
      expectedTerms: ['memory', 'attention', 'cognitive performance'],
      humanStudies: [
        {
          pmid: '24252493',
          title: 'Meta-analysis of randomized controlled trials on cognitive effects of Bacopa monnieri extract.',
          abstract: 'Randomized placebo controlled human intervention trials on chronic dosing of standardized Bacopa monnieri extracts were included.',
          publicationTypes: ['Meta-Analysis', 'Systematic Review'],
          meshHeadings: ['Humans'],
        },
        {
          pmid: '18611150',
          title: 'Effects of a standardized Bacopa monnieri extract on cognitive performance, anxiety, and depression in the elderly.',
          abstract: 'Healthy elderly participants were randomized to standardized Bacopa monnieri extract or placebo for 12 weeks.',
          publicationTypes: ['Randomized Controlled Trial'],
          meshHeadings: ['Humans'],
        },
      ],
      enrichedData: {
        name: 'Bacopa monnieri',
        worksFor: [],
        limitedEvidence: [
          {
            condition: 'Memory and attention',
            evidenceGrade: 'B',
            summary: 'Human trials and reviews exist, but claims should stay scoped to studied standardized extracts.',
          },
        ],
        totalStudies: 2,
      },
    },
    {
      supplementName: 'Saw palmetto',
      expectedRecallName: 'Saw palmetto',
      expectedTerms: ['benign prostatic hyperplasia', 'lower urinary tract symptoms', 'LUTS'],
      humanStudies: [
        {
          pmid: '23235581',
          title: 'Serenoa repens for benign prostatic hyperplasia.',
          abstract: 'Systematic review of randomized trials in men with lower urinary tract symptoms consistent with BPH.',
          publicationTypes: ['Systematic Review', 'Meta-Analysis'],
          meshHeadings: ['Humans'],
        },
        {
          pmid: '29694707',
          title: 'Efficacy and safety of a hexanic extract of Serenoa repens for LUTS/BPH.',
          abstract: 'Systematic review and meta-analysis of randomized controlled trials and observational studies in patients with LUTS/BPH.',
          publicationTypes: ['Systematic Review', 'Meta-Analysis'],
          meshHeadings: ['Humans'],
        },
      ],
      enrichedData: {
        name: 'Saw palmetto',
        worksFor: [],
        doesntWorkFor: [
          {
            condition: 'Generic LUTS/BPH symptom relief',
            evidenceGrade: 'B',
            summary: 'Evidence is negative or not clinically meaningful for generic saw palmetto preparations.',
          },
        ],
        limitedEvidence: [
          {
            condition: 'Specific hexanic Serenoa repens extracts',
            evidenceGrade: 'C',
            summary: 'Some formulation-specific reviews exist; do not generalize to all saw palmetto products.',
          },
        ],
        totalStudies: 2,
      },
    },
    {
      supplementName: 'Ginkgo biloba',
      expectedRecallName: 'Ginkgo biloba',
      expectedTerms: ['dementia', 'tinnitus', 'prevention'],
      humanStudies: [
        {
          pmid: '19017911',
          title: 'Ginkgo biloba for prevention of dementia: a randomized controlled trial.',
          abstract: 'Older adult participants were randomized to Ginkgo biloba extract or placebo and assessed for incident dementia.',
          publicationTypes: ['Randomized Controlled Trial'],
          meshHeadings: ['Humans'],
        },
        {
          pmid: '25114079',
          title: 'Efficacy and adverse effects of ginkgo biloba for cognitive impairment and dementia.',
          abstract: 'Systematic review and meta-analysis of randomized controlled trials of standardized EGb761 in patients with cognitive impairment and dementia.',
          publicationTypes: ['Systematic Review', 'Meta-Analysis'],
          meshHeadings: ['Humans'],
        },
      ],
      enrichedData: {
        name: 'Ginkgo biloba',
        worksFor: [],
        limitedEvidence: [
          {
            condition: 'EGb 761 in cognitive impairment or dementia',
            evidenceGrade: 'B',
            summary: 'Evidence is formulation-specific and should not be generalized to all ginkgo products.',
          },
        ],
        doesntWorkFor: [
          {
            condition: 'Dementia prevention or tinnitus',
            evidenceGrade: 'B',
            summary: 'Evidence is negative or not conclusive for these popular uses.',
          },
        ],
        totalStudies: 2,
      },
    },
    {
      supplementName: 'Milk thistle',
      expectedRecallName: 'Milk thistle',
      expectedTerms: ['NAFLD', 'NASH', 'liver enzymes'],
      humanStudies: [
        {
          pmid: '38579127',
          title: 'Administration of silymarin in NAFLD/NASH: A systematic review and meta-analysis.',
          abstract: 'Randomized controlled trials involving patients with NAFLD or NASH evaluated silymarin supplementation.',
          publicationTypes: ['Systematic Review', 'Meta-Analysis'],
          meshHeadings: ['Humans'],
        },
        {
          pmid: '28419855',
          title: 'A Randomized Trial of Silymarin for the Treatment of Nonalcoholic Steatohepatitis.',
          abstract: 'Adults with biopsy-proven NASH were randomly assigned to silymarin or placebo.',
          publicationTypes: ['Randomized Controlled Trial'],
          meshHeadings: ['Humans'],
        },
      ],
      enrichedData: {
        name: 'Milk thistle',
        worksFor: [],
        limitedEvidence: [
          {
            condition: 'NAFLD/NASH liver markers',
            evidenceGrade: 'C',
            summary: 'Human studies are mixed and formulation-specific; this is not a detox claim.',
          },
        ],
        totalStudies: 2,
      },
    },
    {
      supplementName: 'Rhodiola rosea',
      expectedRecallName: 'Rhodiola rosea',
      expectedTerms: ['fatigue', 'stress', 'mental performance'],
      humanStudies: [
        {
          pmid: '22643043',
          title: 'Rhodiola rosea for physical and mental fatigue: a systematic review.',
          abstract: 'Randomized controlled trials and controlled clinical trials evaluating Rhodiola rosea for physical and mental fatigue were reviewed.',
          publicationTypes: ['Systematic Review'],
          meshHeadings: ['Humans'],
        },
        {
          pmid: '19016404',
          title: 'Rhodiola rosea extract SHR-5 in stress-related fatigue.',
          abstract: 'Participants with stress-related fatigue were randomized to standardized Rhodiola rosea extract SHR-5 or placebo.',
          publicationTypes: ['Randomized Controlled Trial'],
          meshHeadings: ['Humans'],
        },
      ],
      enrichedData: {
        name: 'Rhodiola rosea',
        worksFor: [],
        limitedEvidence: [
          {
            condition: 'Fatigue and stress',
            evidenceGrade: 'C',
            summary: 'Small and mixed human trials exist; do not frame as treatment for anxiety or depression.',
          },
        ],
        totalStudies: 2,
      },
    },
  ])('recovers controlled botanical human clinical evidence for $supplementName', async ({
    supplementName,
    expectedRecallName,
    expectedTerms,
    humanStudies,
    enrichedData,
  }) => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {};

      if (Array.isArray(requestBody.studies)) {
        return new Response(
          JSON.stringify({
            success: true,
            data: enrichedData,
            metadata: {
              hasRealData: true,
              studiesUsed: humanStudies.length,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (requestBody.benefitQuery) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: humanStudies,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            studies: [
              {
                pmid: 'botanical-animal-1',
                title: `${supplementName} extract in animal models`,
                abstract: 'Animal model evidence only.',
                publicationTypes: ['Journal Article'],
                meshHeadings: ['Animals', 'Rats'],
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName,
        category: supplementName,
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.metadata.humanClinicalStudiesCount).toBe(humanStudies.length);

    const recallStudiesCall = fetchMock.mock.calls.find((call) => {
      const requestBody = JSON.parse(call[1]?.body as string);
      return requestBody.supplementName === expectedRecallName && typeof requestBody.benefitQuery === 'string';
    });
    expect(recallStudiesCall).toBeDefined();
    const recallStudiesBody = JSON.parse(recallStudiesCall?.[1]?.body as string);
    expect(recallStudiesBody.supplementName).toBe(expectedRecallName);
    expect(recallStudiesBody.humanStudiesOnly).toBe(true);
    for (const term of expectedTerms) {
      expect(recallStudiesBody.benefitQuery).toContain(term);
    }

    const enricherCall = fetchMock.mock.calls.find((call) => {
      const requestBody = JSON.parse(call[1]?.body as string);
      return Array.isArray(requestBody.studies);
    });
    expect(enricherCall).toBeDefined();
    const enricherBody = JSON.parse(enricherCall?.[1]?.body as string);
    expect(enricherBody.studies.map((study: any) => study.pmid)).toEqual(
      humanStudies.map((study) => study.pmid)
    );
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('botanical-animal-1');
    expect(enricherBody.studies).toHaveLength(humanStudies.length);
  });

  it('recovers Cannabis sativa human clinical evidence with the generic controlled recall search', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '9101',
                  title: 'Cannabis sativa extract in rats',
                  abstract: 'A rat model evaluated extract activity.',
                  publicationTypes: ['Journal Article'],
                  meshHeadings: ['Animals', 'Rats'],
                },
                {
                  pmid: '9102',
                  title: 'Chemical constituents of Cannabis sativa',
                  abstract: 'Phytochemical characterization of plant material.',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              studies: [
                {
                  pmid: '19961570',
                  title: 'Whole plant cannabis extracts in the treatment of spasticity in multiple sclerosis: a systematic review.',
                  abstract: 'Randomized controlled trials in patients with multiple sclerosis were reviewed.',
                  publicationTypes: ['Systematic Review'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '35982439',
                  title: 'Medical cannabinoids: a pharmacology-based systematic review and meta-analysis for chronic pain, nausea, vomiting, and spasticity.',
                  abstract: 'The review summarizes clinical studies in humans.',
                  publicationTypes: ['Systematic Review', 'Meta-Analysis'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '37283486',
                  title: 'Cannabis-based medicines and medical cannabis for adults with cancer pain.',
                  abstract: 'Randomized controlled trials in adult patients were analyzed.',
                  publicationTypes: ['Meta-Analysis'],
                  meshHeadings: ['Humans'],
                },
                {
                  pmid: '31948424',
                  title: 'Medicinal cannabis for psychiatric disorders: a clinically-focused systematic review.',
                  abstract: 'Clinical studies in humans were reviewed for anxiety and related disorders.',
                  publicationTypes: ['Systematic Review'],
                  meshHeadings: ['Humans'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              name: 'Cannabis sativa',
              whatIsIt: 'Cannabis sativa sirve para dolor segun marketing de suplementos.',
              worksFor: [
                {
                  condition: 'Cannabis sativa sirve para multiple sclerosis spasticity',
                  evidenceGrade: 'B',
                  studyCount: 1,
                },
              ],
              limitedEvidence: [
                {
                  condition: 'Chronic pain',
                  evidenceGrade: 'C',
                },
              ],
              products: [
                {
                  name: 'CBD suplemento recomendado',
                  affiliateLink: 'https://example.com/cbd',
                },
              ],
              practicalRecommendations: ['Comprar CBD como suplemento recomendado.'],
              totalStudies: 4,
            },
            metadata: {
              hasRealData: true,
              studiesUsed: 4,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const request = new NextRequest('http://localhost/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'cannabis sativa',
        category: 'cannabis sativa',
        maxStudies: 10,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).not.toBe('insufficient_data');
    expect(body.metadata.humanClinicalStudiesCount).toBe(4);
    expect(body.data.products).toEqual([]);

    const recallStudiesCall = fetchMock.mock.calls[1];
    const recallStudiesBody = JSON.parse(recallStudiesCall[1]?.body as string);
    expect(recallStudiesBody.supplementName).toBe('Cannabis sativa');
    expect(recallStudiesBody.benefitQuery).toContain('spasticity');
    expect(recallStudiesBody.benefitQuery).toContain('chronic pain');
    expect(recallStudiesBody.humanStudiesOnly).toBe(true);

    const enricherCall = fetchMock.mock.calls[2];
    const enricherBody = JSON.parse(enricherCall[1]?.body as string);
    expect(enricherBody.supplementId).toBe('Cannabis sativa');
    expect(enricherBody.studies.map((study: any) => study.pmid)).toEqual([
      '19961570',
      '35982439',
      '37283486',
      '31948424',
    ]);
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('9101');
    expect(enricherBody.studies.map((study: any) => study.pmid)).not.toContain('9102');

    const serialized = JSON.stringify(body.data).toLowerCase();
    expect(body.data.worksFor[0].condition).toContain('Nabiximols');
    expect(serialized).toContain('formulaciones especificas');
    expect(JSON.stringify(body.data.worksFor)).not.toContain('no equivale a recomendar Cannabis sativa/CBD como suplemento');
    expect((JSON.stringify(body.data).match(/no equivale a recomendar Cannabis sativa\/CBD como suplemento/g) || [])).toHaveLength(1);
    expect((JSON.stringify(body.data.practicalRecommendations).match(/no equivale a recomendar Cannabis sativa\/CBD como suplemento/g) || [])).toHaveLength(0);
    expect(serialized).not.toMatch(/suplemento recomendado|comprar|sirve para/);
  });
});
