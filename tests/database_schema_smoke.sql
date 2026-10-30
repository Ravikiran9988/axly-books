DO $$
DECLARE
  missing_indexes text[];
BEGIN
  SELECT array_agg(required.index_name)
    INTO missing_indexes
    FROM (VALUES
      ('user_book_chapter_bookmark_idx'),
      ('book_chapter_num_idx'),
      ('book_chapter_slug_idx'),
      ('user_book_progress_idx'),
      ('comment_vote_user_idx'),
      ('password_resets_active_user_idx')
    ) AS required(index_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = required.index_name
    );

  IF missing_indexes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing expected indexes after migrations: %', missing_indexes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'original_pdf_path'
  ) THEN
    RAISE EXCEPTION 'Missing books.original_pdf_path column.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'allow_online_reading'
  ) THEN
    RAISE EXCEPTION 'Missing books.allow_online_reading column.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    RAISE EXCEPTION 'Missing chapter comments table.';
  END IF;
END $$;
