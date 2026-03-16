-- Enable Realtime for key tables safely
DO $$
BEGIN
  -- Check and add tickets
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
  END IF;

  -- Check and add hospitals
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'hospitals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
  END IF;
END $$;
