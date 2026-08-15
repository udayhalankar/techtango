BEGIN;

CREATE SCHEMA IF NOT EXISTS app_security;

CREATE OR REPLACE FUNCTION app_security.current_tenant_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::bigint
$$;

CREATE OR REPLACE FUNCTION app_security.current_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::bigint
$$;

CREATE OR REPLACE FUNCTION app_security.current_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_role', true), ''), '')
$$;

CREATE OR REPLACE FUNCTION app_security.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_admin', true), ''), 'false')::boolean
$$;

CREATE OR REPLACE FUNCTION app_security.can_access_tenant(row_tenant_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    app_security.is_admin()
    OR (
      app_security.current_tenant_id() IS NOT NULL
      AND row_tenant_id = app_security.current_tenant_id()
    )
$$;

DO $$
DECLARE
  r record;
  policy_name text := 'tenant_isolation';
BEGIN
  FOR r IN
    SELECT
      c.table_schema,
      c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'tenant_id'
      AND c.data_type IN ('smallint', 'integer', 'bigint')
    GROUP BY c.table_schema, c.table_name
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.table_schema, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.table_schema, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_name, r.table_schema, r.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO PUBLIC USING (app_security.can_access_tenant(tenant_id)) WITH CHECK (app_security.can_access_tenant(tenant_id))',
      policy_name,
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;

COMMIT;

-- Notes:
-- 1) This script intentionally applies policies only to tenant_id columns with numeric types.
-- 2) Legacy tables with non-numeric tenant_id definitions must be migrated to bigint/integer first.
-- 3) The application must set app.tenant_id / app.current_user_id / app.is_admin on the DB session
--    before running tenant-scoped queries for RLS to work as intended.
