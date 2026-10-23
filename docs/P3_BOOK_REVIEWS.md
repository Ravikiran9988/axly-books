# P3 — Book ratings and reviews

P3 adds reader feedback to each published book detail page.

## Features

- Public aggregate rating, review count, and 1–5-star distribution.
- Signed-in readers can submit one review per book, choose 1–5 stars, optionally add a title, and write 10–2,000 characters.
- Readers can edit or delete their own review; saving again updates the existing review instead of creating duplicates.
- Public review list with reader display names, author badge, dates, and pagination.
- Administrator-only review visibility moderation (hide/restore) and administrator deletion.
- Validation and security regression tests for anonymous submissions and forged sessions.
- Responsive review composer and review list.

## Database migration

Run `npm run db:migrate` after pulling the branch. Migration `0004_add_book_reviews.sql` creates `book_reviews`, enforces one review per reader per book, constrains ratings to 1–5, and adds a listing index.

## Review rules

- Reviews are public once published.
- One account can have one review per book and can update that review.
- Ratings must be whole numbers from 1 through 5.
- Review title is optional and limited to 120 characters.
- Review body must be 10–2,000 characters.
- Only authenticated readers can create reviews.
- Administrators can hide/restore or delete reviews. Hidden reviews are excluded from public lists and rating aggregates.
- Reviews are for feedback, not for selling books. AXLY Books remains free of ads, paywalls, subscriptions, and book sales.

## Manual smoke test

1. Apply the migration and open a published book detail page.
2. Confirm the rating summary, star distribution, empty state, and reviews load.
3. As a guest, open the review form and verify the login prompt; posting must be rejected by the API.
4. Sign in and submit a valid review. Confirm the average and count update.
5. Submit a second review for the same book; confirm it updates the existing review.
6. Try ratings outside 1–5 and review text under 10 or over 2,000 characters; the API must reject invalid payloads.
7. Delete your own review and confirm the summary updates.
8. Verify a regular reader cannot hide another user's review and an administrator can hide/restore reviews.
9. Test layout and keyboard-accessible star selection at desktop and mobile widths.
