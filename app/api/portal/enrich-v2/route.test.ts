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
});
