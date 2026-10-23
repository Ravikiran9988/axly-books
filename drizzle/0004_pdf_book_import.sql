ALTER TABLE "books" ADD COLUMN "original_pdf_path" text;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license" text DEFAULT 'All Rights Reserved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license_url" text;
--> statement-breakpoint
-- The previous public book detail service presented existing database-backed titles as CC BY-NC 4.0.
-- Preserve that existing presentation for rows present before this migration; newly created books still default to All Rights Reserved.
UPDATE "books"
SET "license" = 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)',
    "license_url" = 'https://creativecommons.org/licenses/by-nc/4.0/'
WHERE "original_pdf_path" IS NULL
  AND "license" = 'All Rights Reserved';
