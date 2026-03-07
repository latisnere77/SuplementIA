/**
 * @jest-environment node
 */
import { POST } from './route';
import * as pubmedSearch from '@/lib/services/pubmed-search';
import * as abbreviationExpander from '@/lib/services/abbreviation-expander';
import * as bedrockAnalyzer from '@/lib/services/bedrock-analyzer';
import { NextRequest } from 'next/server';
import { searchSupplements } from '@/lib/search-service';

// Mock the pubmed-search service
jest.mock('@/lib/services/pubmed-search');
// Mock the abbreviation expander (used in condition branch)
jest.mock('@/lib/services/abbreviation-expander');
// Mock the bedrock analyzer (used in condition branch)
jest.mock('@/lib/services/bedrock-analyzer');
// Mock the supplements database to control intent detection
jest.mock('@/lib/portal/supplements-database', () => ({
  SUPPLEMENTS_DATABASE: [
    { id: 'magnesium-es', name: 'Magnesium', aliases: [], category: 'ingredient', language: 'es' },
  ],
}));

// Mock the search service
jest.mock('@/lib/search-service', () => ({
  searchSupplements: jest.fn().mockResolvedValue([]),
}));

const mockedSearchPubMed = pubmedSearch.searchPubMed as jest.Mock;
const mockedSearchPubMedForSupplement = pubmedSearch.searchPubMedForSupplement as jest.Mock;
const mockedExpandAbbreviation = abbreviationExpander.expandAbbreviation as jest.Mock;
const mockedAnalyzeStudiesWithBedrock = bedrockAnalyzer.analyzeStudiesWithBedrock as jest.Mock;
const mockedSearchSupplements = searchSupplements as jest.Mock;

describe('/api/portal/quiz POST', () => {
  beforeEach(() => {
    // Default: expandAbbreviation returns input unchanged
    mockedExpandAbbreviation.mockResolvedValue({
      original: 'any condition',
      isAbbreviation: false,
      alternatives: ['any condition'],
      confidence: 0,
      source: 'none' as const,
    });
    // Default: searchPubMedForSupplement returns empty array (noData path)
    mockedSearchPubMedForSupplement.mockResolvedValue([]);
    // Default: analyzeStudiesWithBedrock returns empty object
    mockedAnalyzeStudiesWithBedrock.mockResolvedValue({});
    // Default: searchSupplements (LanceDB) returns empty array (falls through to condition branch)
    mockedSearchSupplements.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should translate, search PubMed, analyze with Bedrock, and return evidence for an unknown supplement', async () => {
    const mockExpansion = {
      original: 'joint pain',
      isAbbreviation: false,
      alternatives: ['joint pain supplement'],
      confidence: 0.5,
      source: 'heuristic' as const,
    };
    const mockAnalysis = {
      overallGrade: 'B' as const,
      whatIsItFor: 'Joint health',
      worksFor: [],
      doesntWorkFor: [],
      limitedEvidence: [],
      keyFindings: ['Moderate evidence for joint support'],
      studyCount: { total: 5, rct: 2, metaAnalysis: 1 },
    };
    const mockArticles = [{
      pmid: '12345',
      title: 'Glucosamine and Joint Pain RCT',
      abstract: 'No abstract available',
      authors: ['Smith J'],
      journal: 'JAMA',
      year: 2022,
      publicationTypes: [],
    }];

    mockedExpandAbbreviation.mockResolvedValue(mockExpansion);
    mockedSearchPubMedForSupplement.mockResolvedValue(mockArticles);
    mockedAnalyzeStudiesWithBedrock.mockResolvedValue(mockAnalysis);

    const request = new NextRequest('http://localhost/api/portal/quiz', {
      method: 'POST',
      body: JSON.stringify({ category: 'joint pain' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.evidence).toEqual(mockAnalysis);
    expect(mockedExpandAbbreviation).toHaveBeenCalledWith('joint pain');
    expect(mockedSearchPubMedForSupplement).toHaveBeenCalledWith('joint pain supplement');
    expect(mockedAnalyzeStudiesWithBedrock).toHaveBeenCalledWith('joint pain supplement', mockArticles);
    expect(mockedSearchPubMed).not.toHaveBeenCalled();
  });

  it('should return a 400 Bad Request if the category field is missing', async () => {
    const request = new NextRequest('http://localhost/api/portal/quiz', {
      method: 'POST',
      body: JSON.stringify({}), // Missing category
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ success: false, error: 'Missing required field: category' });
    expect(mockedSearchPubMed).not.toHaveBeenCalled();
  });

  it('should return a 500 Internal Server Error if the Bedrock analyzer throws unexpectedly', async () => {
    const errorMessage = 'Bedrock service is down';

    const mockArticles = [{
      pmid: '99999',
      title: 'Test Study',
      abstract: 'No abstract available',
      authors: ['Author A'],
      journal: 'Test Journal',
      year: 2023,
      publicationTypes: [],
    }];

    mockedSearchPubMedForSupplement.mockResolvedValue(mockArticles);
    mockedAnalyzeStudiesWithBedrock.mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest('http://localhost/api/portal/quiz', {
      method: 'POST',
      body: JSON.stringify({ category: 'any condition' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toEqual('Internal server error');
    expect(body.message).toContain(errorMessage);
  });

  it('should fall through to PubMed when LanceDB throws — does not return 500 (PUB-05)', async () => {
    // searchSupplements is the LanceDB wrapper — make it throw
    mockedSearchSupplements.mockRejectedValue(new Error('LanceDB unavailable'));

    // Set up successful PubMed + Bedrock mocks for the condition branch
    const mockExpansion = {
      original: 'tejocote',
      isAbbreviation: false,
      alternatives: ['tejocote'],
      confidence: 0.5,
      source: 'heuristic' as const,
    };
    const mockAnalysis = {
      overallGrade: 'C' as const,
      whatIsItFor: 'Unknown supplement',
      worksFor: [],
      doesntWorkFor: [],
      limitedEvidence: [],
      keyFindings: [],
      studyCount: { total: 2, rct: 0, metaAnalysis: 0 },
    };
    const mockArticles = [{
      pmid: '99999',
      title: 'Tejocote fruit study',
      abstract: 'No abstract available',
      authors: ['Garcia M'],
      journal: 'Phytomedicine',
      year: 2021,
      publicationTypes: [],
    }];

    mockedExpandAbbreviation.mockResolvedValue(mockExpansion);
    mockedSearchPubMedForSupplement.mockResolvedValue(mockArticles);
    mockedAnalyzeStudiesWithBedrock.mockResolvedValue(mockAnalysis);

    const request = new NextRequest('http://localhost/api/portal/quiz', {
      method: 'POST',
      body: JSON.stringify({ category: 'tejocote' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockedSearchPubMedForSupplement).toHaveBeenCalled();
    // Key assertion: the catch block did NOT short-circuit — we got a 200, not a 500
  });

  it('should return 200 with noData:true when PubMed finds no articles (PUB-04)', async () => {
    const mockExpansion = {
      original: 'xyzunknownxyz',
      isAbbreviation: false,
      alternatives: ['xyzunknownxyz'],
      confidence: 0.5,
      source: 'heuristic' as const,
    };

    mockedExpandAbbreviation.mockResolvedValue(mockExpansion);
    mockedSearchPubMedForSupplement.mockResolvedValue([]); // zero results

    const request = new NextRequest('http://localhost/api/portal/quiz', {
      method: 'POST',
      body: JSON.stringify({ category: 'xyzunknownxyz' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.noData).toBe(true);
    expect(body.message).toContain('no encontramos datos científicos');
    // Bedrock must NOT be called when there are no articles
    expect(mockedAnalyzeStudiesWithBedrock).not.toHaveBeenCalled();
  });
});
