-- ====================================
-- Vercel Postgres Schema with pgvector
-- ====================================

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
CREATE INDEX IF NOT EXISTS supplements_embedding_idx 
ON supplements 
USING hnsw (embedding vector_cosine_ops);

-- Index for frequently searched supplements
CREATE INDEX IF NOT EXISTS supplements_search_count_idx 
ON supplements (search_count DESC);

-- Index for recent searches
CREATE INDEX IF NOT EXISTS supplements_last_searched_idx 
ON supplements (last_searched_at DESC);

-- Index for name lookups
CREATE INDEX IF NOT EXISTS supplements_name_idx 
ON supplements (name);

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

-- View for popular supplements
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
-- SAMPLE QUERIES
-- ====================================

-- Vector similarity search (example)
-- SELECT 
--   name,
--   scientific_name,
--   common_names,
--   metadata,
--   1 - (embedding <=> $1::vector) as similarity
-- FROM supplements
-- WHERE 1 - (embedding <=> $1::vector) > 0.85
-- ORDER BY similarity DESC
-- LIMIT 5;

-- Insert supplement with embedding
-- INSERT INTO supplements (name, scientific_name, common_names, embedding, metadata)
-- VALUES (
--   'vitamin-d',
--   'Cholecalciferol',
--   ARRAY['vitamin d3', 'cholecalciferol'],
--   $1::vector,
--   '{"category": "vitamin", "popularity": "high"}'::jsonb
-- );
