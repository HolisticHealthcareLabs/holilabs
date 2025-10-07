-- Verify Database Indexes
-- Run this in Supabase SQL Editor to check all indexes were created

-- Show all indexes on our tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'patients', 'users', 'appointments', 'prescriptions',
    'documents', 'clinical_notes', 'consents', 'medications',
    'audit_logs', 'blockchain_transactions', 'calendar_integrations', 'token_maps'
  )
ORDER BY tablename, indexname;

-- Count indexes per table
SELECT
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'patients', 'users', 'appointments', 'prescriptions',
    'documents', 'clinical_notes', 'consents', 'medications',
    'audit_logs', 'blockchain_transactions', 'calendar_integrations', 'token_maps'
  )
GROUP BY tablename
ORDER BY index_count DESC;

-- Show index sizes (helps identify largest indexes)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
