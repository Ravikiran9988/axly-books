CREATE TABLE IF NOT EXISTS reader_annotations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  quote text NOT NULL,
  note text NOT NULL DEFAULT '',
  anchor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reader_annotations_owner_book_idx ON reader_annotations(user_id, book_id, chapter_id);

CREATE TABLE IF NOT EXISTS correction_submissions (
  id text PRIMARY KEY,
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote text NOT NULL,
  suggestion text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  admin_response text,
  reviewed_at timestamptz,
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS correction_submissions_status_created_idx ON correction_submissions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS reader_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('correction_update', 'edition_update')),
  title text NOT NULL,
  message text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reader_notifications_user_created_idx ON reader_notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS book_editions (
  id text PRIMARY KEY,
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  edition text NOT NULL,
  change_summary text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT book_edition_book_label_idx UNIQUE(book_id, edition)
);
CREATE INDEX IF NOT EXISTS book_editions_book_date_idx ON book_editions(book_id, published_at DESC);
