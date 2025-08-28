-- Custom SQL migration file, put your code below! --
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'realtime'
        AND tablename = 'messages'
        AND policyname = 'Allow listening for presences on all channels for authenticated users only'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow listening for presences on all channels for authenticated users only" ON "realtime"."messages" AS PERMISSIVE FOR SELECT TO authenticated USING (realtime.messages.extension = ''presence'')';
    ELSE
      EXECUTE 'ALTER POLICY "Allow listening for presences on all channels for authenticated users only" ON "realtime"."messages" TO authenticated USING (realtime.messages.extension = ''presence'')';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'realtime'
        AND tablename = 'messages'
        AND policyname = 'Allow broadcasting presences on all channels for authenticated users only'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow broadcasting presences on all channels for authenticated users only" ON "realtime"."messages" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (realtime.messages.extension = ''presence'')';
    ELSE
      EXECUTE 'ALTER POLICY "Allow broadcasting presences on all channels for authenticated users only" ON "realtime"."messages" TO authenticated WITH CHECK (realtime.messages.extension = ''presence'')';
    END IF;
  END IF;
END$$;