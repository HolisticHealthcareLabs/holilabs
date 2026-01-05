-- ============================================================================
-- pgvector Setup Script for HoliLabs
-- ============================================================================
-- This script installs and configures the pgvector extension for semantic search
--
-- Run this script as a PostgreSQL superuser:
--   psql -U postgres -d holi_labs -f scripts/setup-pgvector.sql
--
-- Or from within psql:
--   \i scripts/setup-pgvector.sql

-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Create indexes for vector similarity search (after data is populated)
-- Uncomment these after you have embeddings in the database

-- IVFFlat index for clinical embeddings (faster but approximate)
-- CREATE INDEX IF NOT EXISTS clinical_embeddings_embedding_idx
--   ON clinical_embeddings
--   USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

-- IVFFlat index for patient summary embeddings
-- CREATE INDEX IF NOT EXISTS patient_summary_embeddings_embedding_idx
--   ON patient_summary_embeddings
--   USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

-- IVFFlat index for diagnosis embeddings
-- CREATE INDEX IF NOT EXISTS diagnosis_embeddings_embedding_idx
--   ON diagnosis_embeddings
--   USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

-- Grant permissions (adjust for your user)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;

-- Display pgvector version
SELECT extversion FROM pg_extension WHERE extname = 'vector';

\echo ''
\echo '✅ pgvector installation complete!'
\echo ''
\echo 'Next steps:'
\echo '1. Update your Prisma schema: pnpm exec prisma db push'
\echo '2. Generate embeddings for existing data'
\echo '3. Uncomment and run index creation commands above (after data is populated)'
\echo '4. Test semantic search: POST /api/search/semantic'
