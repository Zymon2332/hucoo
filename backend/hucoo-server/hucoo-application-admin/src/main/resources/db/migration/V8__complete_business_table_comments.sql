DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname LIKE 'ap_%'
    LOOP
        EXECUTE format('COMMENT ON TABLE %I IS %L', table_name, '管理端业务表：' || replace(table_name, 'ap_', ''));
    END LOOP;
END $$;
