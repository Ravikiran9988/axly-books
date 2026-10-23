ALTER TABLE "books" ADD COLUMN "original_pdf_path" text;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license" text DEFAULT 'All Rights Reserved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "license_url" text;
