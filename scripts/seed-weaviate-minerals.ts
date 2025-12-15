
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getWeaviateClient, WEAVIATE_CLASS_NAME } from '../lib/weaviate-client';
import { XMLParser } from 'fast-xml-parser';

// Minimal PubMed Fetcher (avoiding heavy deps)
async function fetchPubMedPapers(term: string, max: number = 5) {
    console.log(`[PubMed] Fetching ${max} papers for "${term}"...`);

    // 1. Search IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=${max}`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    const ids = searchJson.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    // 2. Fetch Details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    const xmlData = await fetchRes.text();

    // 3. Parse XML
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xmlData);

    if (!parsed?.PubmedArticleSet?.PubmedArticle) {
        console.warn(`   ⚠️ No articles found in XML for "${term}"`);
        return [];
    }

    const articles = Array.isArray(parsed.PubmedArticleSet.PubmedArticle)
        ? parsed.PubmedArticleSet.PubmedArticle
        : [parsed.PubmedArticleSet.PubmedArticle];

    return articles.map((article: any) => {
        const medline = article.MedlineCitation;
        const title = medline.Article.ArticleTitle;
        const abstractText = medline.Article.Abstract?.AbstractText;
        const abstract = Array.isArray(abstractText)
            ? abstractText.map((t: any) => t['#text'] || t).join(' ')
            : (typeof abstractText === 'object' ? abstractText['#text'] : abstractText) || '';

        return {
            title: String(title),
            abstract: String(abstract),
            year: parseInt(medline.Article.Journal.JournalIssue.PubDate.Year) || 2024,
            pmid: String(medline.PMID['#text']),
            url: `https://pubmed.ncbi.nlm.nih.gov/${medline.PMID['#text']}/`
        };
    }).filter((p: any) => p.title && p.abstract);
}

async function seedMinerals() {
    const client = getWeaviateClient();
    if (!client) {
        console.error('❌ Weaviate client not configured (chk .env.local)');
        return;
    }

    const minerals = [
        { name: 'Copper', query: '(copper OR copper gluconate) AND (anemia OR skin OR collagen)' },
        { name: 'Potassium', query: '(potassium) AND (blood pressure OR muscle)' },
        { name: 'Manganese', query: '(manganese) AND (bone OR metabolism)' },
        { name: 'Iodine', query: '(iodine) AND (thyroid OR cognition)' }
    ];

    for (const min of minerals) {
        console.log(`\n🌱 Seeding ${min.name}...`);
        try {
            const papers = await fetchPubMedPapers(min.query, 10);
            console.log(`   Found ${papers.length} papers.`);

            for (const paper of papers) {
                // Simple embedding via Weaviate (assuming text2vec configured)
                await client.data
                    .creator()
                    .withClassName(WEAVIATE_CLASS_NAME)
                    .withProperties({
                        title: paper.title,
                        abstract: paper.abstract,
                        ingredients: [min.name].join(', '), // Fix: Join array to string for 'text' property
                        supplementName: min.name,
                        conditions: 'general health', // Add missing field
                        summary: paper.abstract.substring(0, 200) + '...',
                        category: 'mineral',
                        year: paper.year,
                        url: paper.url,
                        type: 'study'
                    })
                    .do();
            }
            console.log(`   ✅ Indexed ${min.name} successfully.`);
        } catch (e) {
            console.error(`   ❌ Failed to seed ${min.name}:`, e);
        }
    }
}

seedMinerals();
