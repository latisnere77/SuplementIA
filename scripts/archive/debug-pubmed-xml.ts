/**
 * DEBUG: PubMed XML Parser
 * Investigate why "collagen" returns 20 IDs but parses 0 articles
 */

async function debugPubMedXML() {
  const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const query = 'collagen[Title/Abstract] AND (randomized controlled trial[Publication Type] OR meta-analysis[Publication Type] OR systematic review[Publication Type]) AND 2010:3000[Publication Date]';

  console.log('🔍 DEBUG: PubMed XML Parser\n');
  console.log('='.repeat(70));

  // Step 1: Search
  console.log('\n📊 STEP 1: Search for article IDs');
  console.log('-'.repeat(70));

  const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`; // Only 5 for debugging

  console.log(`Query: ${query}`);
  console.log(`URL: ${searchUrl}\n`);

  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();
  const idList = searchData.esearchresult?.idlist || [];

  console.log(`✅ Found ${idList.length} article IDs:`);
  console.log(idList.join(', '));

  if (idList.length === 0) {
    console.log('❌ No IDs found, stopping.');
    return;
  }

  // Step 2: Fetch details
  console.log('\n\n📊 STEP 2: Fetch article details');
  console.log('-'.repeat(70));

  const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml`;

  console.log(`Fetching: ${idList.length} articles`);
  console.log(`URL: ${fetchUrl}\n`);

  const fetchResponse = await fetch(fetchUrl);
  const xmlText = await fetchResponse.text();

  console.log(`✅ XML Response received (${xmlText.length} characters)\n`);

  // Step 3: Analyze XML structure
  console.log('\n📊 STEP 3: Analyze XML Structure');
  console.log('-'.repeat(70));

  // Check for PubmedArticle tags
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g);
  console.log(`PubmedArticle tags found: ${articleMatches?.length || 0}`);

  if (!articleMatches || articleMatches.length === 0) {
    console.log('\n❌ PROBLEM: No <PubmedArticle> tags found!');
    console.log('\nChecking for alternative structures...\n');

    // Check for PubmedArticleSet
    const hasArticleSet = xmlText.includes('<PubmedArticleSet>');
    console.log(`Has <PubmedArticleSet>: ${hasArticleSet}`);

    // Check for PubmedBookArticle (different structure)
    const bookArticleMatches = xmlText.match(/<PubmedBookArticle>[\s\S]*?<\/PubmedBookArticle>/g);
    console.log(`PubmedBookArticle tags found: ${bookArticleMatches?.length || 0}`);

    // Show first 1000 characters of XML
    console.log('\nFirst 1000 characters of XML:');
    console.log('-'.repeat(70));
    console.log(xmlText.substring(0, 1000));
    console.log('\n...');
  } else {
    console.log('✅ Found PubmedArticle tags\n');

    // Try to parse first article
    console.log('📄 PARSING FIRST ARTICLE:');
    console.log('-'.repeat(70));

    const firstArticle = articleMatches[0];

    // Extract key fields
    const pmidMatch = firstArticle.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = firstArticle.match(/<ArticleTitle[^>]*>([^<]+)<\/ArticleTitle>/);
    const abstractMatch = firstArticle.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
    const yearMatch = firstArticle.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);

    console.log(`PMID: ${pmidMatch?.[1] || 'NOT FOUND'}`);
    console.log(`Title: ${titleMatch?.[1] || 'NOT FOUND'}`);
    console.log(`Abstract: ${abstractMatch ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`Year: ${yearMatch?.[1] || 'NOT FOUND'}`);

    // Show first 500 chars of article
    console.log('\nFirst 500 characters of article XML:');
    console.log('-'.repeat(70));
    console.log(firstArticle.substring(0, 500));
    console.log('\n...');
  }

  console.log('\n' + '='.repeat(70));
}

debugPubMedXML().catch(console.error);
