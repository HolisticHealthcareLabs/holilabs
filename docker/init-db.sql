-- Initialize database for Prisma
-- This script is run automatically by PostgreSQL on first startup

-- Ensure holi user has full permissions
ALTER USER holi WITH SUPERUSER;

-- Grant all permissions on public schema
GRANT ALL ON SCHEMA public TO holi;
GRANT ALL PRIVILEGES ON DATABASE holi_protocol TO holi;
ALTER SCHEMA public OWNER TO holi;
