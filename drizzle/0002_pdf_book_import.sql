ALTER TABLE "books" ADD COLUMN "original_pdf_path" text;
ALTER TABLE "books" ADD COLUMN "license" text DEFAULT 'All Rights Reserved' NOT NULL;
ALTER TABLE "books" ADD COLUMN "license_url" text;
