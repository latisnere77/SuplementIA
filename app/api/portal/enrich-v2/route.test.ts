/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

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
});
