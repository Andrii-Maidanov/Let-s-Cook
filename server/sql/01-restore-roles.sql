-- Compatibility roles referenced by the original pg_dump ownership and ACL statements.
-- They do not have login access and are not application authentication accounts.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
    CREATE ROLE neondb_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloud_admin') THEN
    CREATE ROLE cloud_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neon_superuser') THEN
    CREATE ROLE neon_superuser NOLOGIN;
  END IF;
END;
$$;
