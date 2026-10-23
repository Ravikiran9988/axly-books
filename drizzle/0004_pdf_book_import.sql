ALTER TABLE "books" ADD COLUMN "original_pdf_path" text;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license" text DEFAULT 'All Rights Reserved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license_url" text;

--> statement-breakpoint
-- Preserve the existing licence presentation for rows that predate PDF import.
UPDATE "books"
SET "license" = 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)',
    "license_url" = 'https://creativecommons.org/licenses/by-nc/4.0/'
WHERE "original_pdf_path" IS NULL
  AND "license" = 'All Rights Reserved';
