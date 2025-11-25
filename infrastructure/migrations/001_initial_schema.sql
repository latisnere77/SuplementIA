-- Migration: 001_initial_schema
-- Description: Create supplements table with pgvector support
-- Date: 2024-11-24

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ====================================
-- SUPPLEMENTS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS supplements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  scientific_name TEXT,
  common_names TEXT[],
  embedding vector(384),
  metadata JSONB DEFAULT '{}',
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- INDEXES
-- ====================================

-- HNSW index for fast vector similarity search
-- Using cosine distance for semantic similarity
-- HNSW provides O(log n) search time vs O(n) for brute force
CREATE INDEX IF NOT EXISTS supplements_embedding_idx 
ON supplements 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for frequently searched supplements
-- Supports queries like: SELECT * FROM supplements ORDER BY search_count DESC
CREATE INDEX IF NOT EXISTS supplements_search_count_idx 
ON supplements (search_count DESC);

-- Index for recent searches
-- Supports queries like: SELECT * FROM supplements ORDER BY last_searched_at DESC
CREATE INDEX IF NOT EXISTS supplements_last_searched_idx 
ON supplements (last_searched_at DESC);

-- Index for name lookups
-- Supports exact name matching
CREATE INDEX IF NOT EXISTS supplements_name_idx 
ON supplements (name);

-- Composite index for popular recent supplements
CREATE INDEX IF NOT EXISTS supplements_popular_recent_idx
ON supplements (search_count DESC, last_searched_at DESC)
WHERE search_count > 10;

-- ====================================
-- FUNCTIONS
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_supplements_updated_at ON supplements;
CREATE TRIGGER update_supplements_updated_at
BEFORE UPDATE ON supplements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to increment search count
CREATE OR REPLACE FUNCTION increment_search_count(supplement_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE supplements
  SET 
    search_count = search_count + 1,
    last_searched_at = NOW()
  WHERE id = supplement_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- HELPER VIEWS
-- ====================================

-- View for popular supplements (searched > 10 times)
CREATE OR REPLACE VIEW popular_supplements AS
SELECT 
  id,
  name,
  scientific_name,
  search_count,
  last_searched_at
FROM supplements
WHERE search_count > 10
ORDER BY search_count DESC;

-- View for recently searched supplements
CREATE OR REPLACE VIEW recent_supplements AS
SELECT 
  id,
  name,
  scientific_name,
  search_count,
  last_searched_at
FROM supplements
WHERE last_searched_at IS NOT NULL
ORDER BY last_searched_at DESC
LIMIT 100;

-- ====================================
-- COMMENTS
-- ====================================

COMMENT ON TABLE supplements IS 'Stores supplement information with vector embeddings for semantic search';
COMMENT ON COLUMN supplements.embedding IS '384-dimensional vector from all-MiniLM-L6-v2 model';
COMMENT ON COLUMN supplements.search_count IS 'Number of times this supplement has been searched';
COMMENT ON COLUMN supplements.metadata IS 'JSON metadata including category, popularity, evidence grade, etc.';
COMMENT ON INDEX supplements_embedding_idx IS 'HNSW index for fast cosine similarity search on embeddings';
