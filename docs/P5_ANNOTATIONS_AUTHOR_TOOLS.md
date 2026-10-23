# Phase 5 — Private annotations and author tools

## Reader features
- Save a selected passage with a private note for the signed-in reader; edit or delete notes later.
- Notes are scoped to the authenticated user, book, and chapter. They are not public comments and are never returned by the public chapter-discussion endpoint.
- Suggest a correction for a passage with an optional explanation. Submissions enter the administrator review queue and do not directly modify published book text.
- Browse published edition history for a book.
- View notifications for correction decisions and new edition announcements at `/dashboard/notifications`.

## Author/admin features
- Review correction suggestions at `/admin/corrections`.
- Accept, decline, or return submissions to pending, with an optional private response. A decision generates a reader notification.
- Publish an edition-history entry through `POST /api/admin/books/:bookId/editions` with `{ "edition": "1.1", "changeSummary": "Fixed typos and clarified examples." }`. This creates a notification for registered reader accounts. Edition entries are informational; they do not automatically edit chapter content.

## API and privacy
- `GET/POST /api/reader/annotations` — list/create private annotations for a book and chapter.
- `PATCH/DELETE /api/reader/annotations/:annotationId` — update/delete only an annotation owned by the current account.
- `POST /api/books/:slug/corrections` — submit a correction for a published chapter.
- `GET/PATCH /api/admin/corrections` — admin-only review queue and decisions.
- `GET/PATCH /api/reader/notifications` — read only the current account's notifications and mark them read.
- `GET /api/books/:slug/editions` — public edition history for published books.
- `GET/POST /api/admin/books/:bookId/editions` — admin-only edition history management.

## Migration and verification
Run `npm run db:migrate` to apply `drizzle/0005_annotations_author_tools.sql`. Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Then manually verify cross-account privacy, correction submission/moderation, notification links, and edition history in a preview deployment.

## Current scope / limitations
- Notes are stored in the database and available across devices after sign-in; this initial version stores a passage quote and optional note rather than browser DOM range offsets, so exact in-text highlight restoration/navigation is not yet implemented.
- Notifications are an in-app inbox, not email or push notifications.
- Accepting a correction records the review decision and notifies the reader; the author must still update chapter content separately in the CMS.
- Edition announcements notify up to 5,000 reader-role accounts in one operation. The publishing endpoint should be upgraded to a queued notification job if the platform grows beyond this scale.
