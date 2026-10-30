# Integration and launch-readiness checklist

AXLY Books is intended to remain a free reading platform: no advertisements, paywalls, subscriptions, or book sales. This checklist describes the currently implemented flows and the operational checks required before release.

## Automated checks

The CI workflow runs:

- ESLint.
- TypeScript type-check (`npx tsc --noEmit`).
- The unit and route integration test suite.
- SQL migration smoke tests against a disposable PostgreSQL instance.
- Database schema invariant checks after all migrations.
- Production build (`npm run build`).

The route integration tests use the application's in-memory development/test fallback. PostgreSQL CI checks independently verify that the checked-in migrations apply and create the expected indexes and columns; they do not exercise the application's Neon-backed routes against a live Neon database.

## Required deployment configuration

- [ ] Configure `DATABASE_URL` for the persistent Neon PostgreSQL database.
- [ ] Configure `BLOB_READ_WRITE_TOKEN` for public cover/image uploads, if enabled.
- [ ] Configure `PDF_BLOB_READ_WRITE_TOKEN` for the separate private Blob store used by original PDF uploads.
- [ ] Apply every migration listed in `drizzle/meta/_journal.json` in order.
- [ ] Promote the intended administrator account using the documented admin promotion script; public registration must never grant the admin role.
- [ ] Confirm production uses HTTPS and the configured security headers.
- [ ] Verify production and preview environment variables are set separately and correctly.

## Manual release smoke test

Run this in a preview deployment before production:

1. Open `/admin/books/import` while signed out. It must not permit an import.
2. Sign in as an administrator and import a small, non-confidential PDF under the 4 MB limit.
3. Confirm the PDF import creates a draft containing metadata and the original private PDF only. It does not extract text, create chapters, or run OCR.
4. Confirm the public library and unauthenticated book API do not expose the draft.
5. Attach or create Markdown chapters when online reading is required, review the imported content, and publish only after checking chapter boundaries and formatting.
6. Open a published book on desktop and mobile; test chapter navigation, reader theme controls, progress, bookmarks, and guest-to-account migration.
7. Confirm the original PDF download link is hidden by default and appears only when downloads are enabled. Verify the private download route enforces publication and download permissions.
8. Try an invalid file type, a PDF larger than 4 MB, a duplicate slug, malformed import payload, anonymous import, and invalid session cookie.
9. Confirm the site shows an actionable error when the required database or private PDF storage is unavailable.
10. Check browser console, server logs, keyboard navigation, visible focus, and form labels before release.

## Storage and content safety

- **New original PDFs are stored in a private Vercel Blob store.** The application stores the private pathname and streams downloads through a permission-checked route. The pathname is not included in public book API responses.
- **Legacy PDFs may still use public Blob URLs.** Those old files remain public until migrated with `npm run db:migrate-legacy-pdfs`; review the dry-run output and back up both stores and the database before applying the migration.
- PDF text extraction and OCR are not part of the current PDF download-only import flow. Markdown is the supported route for editable online-reading chapters.
- Publish only books and documents for which you have the rights to distribute. Do not upload confidential or personally sensitive documents.
- The reader-facing free-access policy must remain intact; do not add ads, subscriptions, paywalls, or book sales.

## Release decision

Do not mark the feature production-ready until CI passes and the manual smoke test is completed on a preview deployment. A passing CI result does not verify production environment variables, live database migrations, Blob permissions, account migration, or the deployed user experience.
