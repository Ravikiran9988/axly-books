CREATE TABLE IF NOT EXISTS "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "chapter_id" text NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_comment_id" text,
  "content" text NOT NULL,
  "status" text DEFAULT 'published' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "comments_chapter_created_idx" ON "comments" ("chapter_id", "created_at");
CREATE INDEX IF NOT EXISTS "comments_parent_idx" ON "comments" ("parent_comment_id");
CREATE TABLE IF NOT EXISTS "comment_votes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "comment_vote_user_idx" ON "comment_votes" ("comment_id", "user_id");
CREATE TABLE IF NOT EXISTS "comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "details" text,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "comment_report_user_idx" ON "comment_reports" ("comment_id", "user_id");
