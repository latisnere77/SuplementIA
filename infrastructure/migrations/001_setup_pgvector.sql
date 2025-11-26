-- Migration: Setup pgvector extension and supplements table
-- Description: Creates the vector search infrastructure for supplement knowledge base
-- Author: SuplementIA Team
-- Date: 2025-01-18

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create supplements table with vector embeddings
CREATE TABLE IF NOT EXISTS supplements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    common_names TEXT[],
    embedding vector(384), -- 384-dimensional embeddings from all-MiniLM-L6-v2
    metadata JSONB DEFAULT '{}',
    search_count INTEGER DEFAULT 0,
    last_searched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index for fast similarity search
-- m = 16: number of connections per layer (balance between speed and recall)
-- ef_construction = 64: size of dynamic candidate list (higher = better recall, slower build)
CREATE INDEX IF NOT EXISTS idx_supplements_embedding 
ON supplements 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_supplements_name ON supplements (name);
CREATE INDEX IF NOT EXISTS idx_supplements_scientific_name ON supplements (scientific_name);
CREATE INDEX IF NOT EXISTS idx_supplements_search_count ON supplements (search_count DESC);
CREATE INDEX IF NOT EXISTS idx_supplements_last_searched ON supplements (last_searched_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_supplements_updated_at 
BEFORE UPDATE ON supplements 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_supplements(
    query_embedding vector(384),
    similarity_threshold FLOAT DEFAULT 0.7,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    scientific_name VARCHAR(255),
    common_names TEXT[],
    similarity FLOAT,
    search_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.scientific_name,
        s.common_names,
        1 - (s.embedding <=> query_embedding) AS similarity,
        s.search_count
    FROM supplements s
    WHERE 1 - (s.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY s.embedding <=> query_embedding
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment search count
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

-- Grant permissions (adjust role name as needed)
-- GRANT ALL PRIVILEGES ON TABLE supplements TO lambda_role;
-- GRANT USAGE, SELECT ON SEQUENCE supplements_id_seq TO lambda_role;

-- Verify pgvector installation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension not installed';
    END IF;
    
    RAISE NOTICE 'pgvector extension successfully installed';
    RAISE NOTICE 'supplements table created with vector(384) column';
    RAISE NOTICE 'HNSW index created for fast similarity search';
END $$;
