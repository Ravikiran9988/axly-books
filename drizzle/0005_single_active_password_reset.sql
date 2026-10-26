-- Keep the newest unused reset token for each account before enforcing the invariant.
WITH ranked_active_tokens AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS token_rank
  FROM password_resets
  WHERE used_at IS NULL
)
UPDATE password_resets AS reset
SET used_at = now()
FROM ranked_active_tokens AS ranked
WHERE reset.id = ranked.id
  AND ranked.token_rank > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_active_user_idx"
  ON "password_resets" ("user_id")
  WHERE "used_at" IS NULL;
