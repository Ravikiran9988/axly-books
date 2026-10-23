# P3 — Integration & launch-readiness checklist

AXLY Books is intended to remain a free reading platform: no advertisements, paywalls, subscriptions, or book sales. This checklist is the final operational gate before enabling the PDF import flow for real manuscripts.

## Automated checks

The CI workflow should pass all of the following on the feature branch / pull request:

- [ ] ESLint
- [ ] TypeScript type-check (`npx tsc --noEmit`)
- [ ] Existing unit, end-to-end, and route integration tests
- [ ] P3 launch-readiness checks (`tests/p3_launch_readiness.test.ts`)
- [ ] Production build (`npm run build`)

The P3 regression test verifies that anonymous requests and forged session cookies cannot invoke the PDF import endpoint.

## Required deployment configuration

- [ ] Configure `DATABASE_URL` for the persistent Neon PostgreSQL database.
- [ ] Configure `BLOB_READ_WRITE_TOKEN` for Vercel Blob.
- [ ] Apply all Drizzle SQL migrations, including `drizzle/0002_add_original_pdf_url.sql`.
- [ ] Promote the intended administrator account using the documented admin promotion script; public registration must never grant the admin role.
- [ ] Confirm production uses HTTPS and the configured security headers.
- [ ] Verify Vercel's production and preview environment variables are set separately and correctly.

## Manual release smoke test

Run this in a preview deployment before production:

1. Open `/admin/books/import` while signed out. It must not permit an import.
2. Sign in as an administrator and import a small, non-confidential, selectable-text PDF.
3. Confirm metadata and detected chapters can be edited and the reader preview renders.
4. Import as a draft; confirm the public library and unauthenticated book API do not expose it.
5. Confirm an administrator can review the draft and publish it only after checking chapter boundaries and formatting.
6. Open the published book in desktop and mobile layouts; test chapter navigation, reader theme controls, progress and bookmarks.
7. Confirm the original PDF download link is hidden by default and appears only when enabled.
8. Try an invalid file type, a file larger than 25 MB, duplicate slug, malformed import payload, anonymous import, and invalid session cookie.
9. Confirm the site still works when Blob storage is not configured and shows an actionable error rather than a crash.
10. Check browser console, server logs, keyboard navigation, visible focus, and form labels before release.

## Storage and content safety

- **Current original-PDF storage is public.** Hiding the download link does not make a Blob private. Anyone who obtains the original Blob URL may access it. Only upload PDFs you are comfortable making accessible by URL until private storage and authorized delivery are implemented.
- OCR is English-only and may be slow on scanned books. Chapter splitting and repeated-header cleanup are heuristic; a human must review the imported text before publication.
- PDF extraction does not reconstruct the original page layout, embedded images, diagrams, tables, or exact code formatting. Keep the original PDF as the visual reference during review.
- Publish only books and documents for which you have the rights to distribute. Do not upload confidential or personally sensitive documents.
- The reader-facing free-access policy must remain intact; do not add ads, subscriptions, paywalls, or book sales.

## Release decision

Do not mark the feature production-ready until CI passes and the manual smoke test is completed on a preview deployment. A passing CI run alone does not verify live database migrations, storage configuration, permissions, or the deployed user experience.
