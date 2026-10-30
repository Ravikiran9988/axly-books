# Book ratings and reviews — implementation status

Book-level ratings and reviews are **not implemented** in the current application.

The current discussion feature is chapter-specific comments and one-level replies. It supports authenticated posting, editing and deletion by the comment owner, votes, reports, and administrator moderation. It does not provide book-level star ratings, review titles, aggregate rating summaries, or review pagination.

There is no `book_reviews` table or book-review API in the current migration set. The older P3 review checklist was retained from a proposed feature and should not be used as a release checklist.

For the implemented discussion feature, see the chapter comments routes under `src/app/api/books/[slug]/chapters/[chapterSlug]/comments` and migration `drizzle/0003_add_chapter_comments.sql`.

AXLY Books remains a free reading platform without ads, paywalls, subscriptions, or book sales.
