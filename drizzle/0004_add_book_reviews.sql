CREATE TABLE IF NOT EXISTS book_reviews (
  id text PRIMARY KEY,
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT book_review_user_idx UNIQUE (book_id, user_id)
);

CREATE INDEX IF NOT EXISTS book_reviews_book_status_created_idx
  ON book_reviews (book_id, status, created_at DESC);
