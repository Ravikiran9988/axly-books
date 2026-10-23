# AXLY Books

> **A World of Ideas, One Page at a Time.**  
> A free digital reading platform and author CMS by **Slayer** (Medicharla Ravi Kiran).  
> **Website:** [books.axly.in](https://books.axly.in/) · **Source:** [GitHub](https://github.com/Ravikiran9988/axly-books)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-green?style=flat&logo=postgresql)](https://neon.tech/)
[![ORM](https://img.shields.io/badge/ORM-Drizzle-orange?style=flat)](https://orm.drizzle.team/)
[![Storage](https://img.shields.io/badge/Storage-Vercel%20Blob-black?style=flat)](https://vercel.com/storage/blob)
[![Access](https://img.shields.io/badge/Access-Free%20to%20Read-brightgreen?style=flat)](#project-principles)

---

## About

**AXLY Books** is a web-based library for publishing and reading books online. It combines a reader-friendly chapter experience with an administrator content management system (CMS), so an author can manage books and chapters without editing application code.

### Project principles

- **Free access:** no advertisements, paywalls, subscriptions, or book sales.
- **Reader privacy:** personal reading progress and bookmarks are associated with the signed-in reader.
- **Safe publishing workflow:** draft content can be reviewed before it is made public.
- **Original content:** publish only content you own or have permission to distribute.

## Features on `main`

### Reading experience
- Public catalogue and book detail pages for published books.
- Chapter-based interactive reader with a chapter drawer, keyboard navigation, reading themes (dark, light, and sepia), and typography controls.
- Reader dashboard with saved reading progress and bookmarks.
- Original PDF link on book pages when the author enables it and configures a PDF URL.

### Book management and PDF import
- Administrator-only CMS for creating and editing book metadata, covers, chapters, and chapter order.
- Draft and publication status controls to keep unfinished content out of the public catalogue.
- Import an existing searchable PDF instead of retyping the manuscript.
- Extract PDF text in the browser, review and edit detected chapter boundaries, preview the result, and import editable chapters along with the original PDF URL.
- English OCR fallback for scanned pages. PDF extraction and chapter detection are heuristic, so manually review the imported book before publication.

### Chapter discussions
- Chapter-specific comments and one-level replies.
- Edit or delete your own comments.
- Helpful votes, report submission, newest/most-helpful sorting, and load-more pagination.
- Administrator moderation to review reports and hide, restore, or delete comments.
- Author/admin replies display the Slayer author badge.

### Accounts and platform security
- Reader and administrator roles enforced on the server.
- Password hashing, hashed session tokens, HTTP-only SameSite session cookies, input validation, and shared database-backed rate limiting.
- Password-reset email delivery through Resend when configured.
- Admin promotion through a CLI command rather than public registration.

> **Feature scope:** This section describes the code and migrations currently represented by `main`. Ratings and reviews, private passage annotations/highlights, reader correction requests, author questions, and in-app notifications should not be considered available on `main` unless their implementation and migrations have been merged into it.

---

## Tech stack

| Area | Technology |
|---|---|
| Application | Next.js App Router, React |
| Language | TypeScript |
| Database | Neon Serverless PostgreSQL |
| ORM and migrations | Drizzle ORM / Drizzle Kit |
| File storage | Vercel Blob |
| Authentication | bcryptjs, server-side sessions, HTTP-only cookies |
| Validation | Zod |
| Email | Resend (optional; for password recovery) |
| Tests and quality | ESLint, TypeScript, Node-based automated tests, Next.js production build |

### Architecture

```mermaid
flowchart TD
    Browser[Reader / Admin Browser] --> App[Next.js Application]
    App --> Public[Public Catalogue and Reader]
    App --> CMS[Admin CMS]
    Public --> API[API Routes]
    CMS --> AdminAPI[Admin API Routes]
    API --> Guards[Authentication and Authorization]
    AdminAPI --> Guards
    Guards --> ORM[Drizzle ORM]
    ORM --> DB[(Neon PostgreSQL)]
    CMS --> Blob[Vercel Blob Storage]
```

## Local development

### Requirements
- Node.js 22 (matches the CI workflow)
- npm
- A PostgreSQL database such as Neon for persistent account, reader, and CMS data
- A Vercel Blob token if you want to test cover uploads or PDF import
- Resend credentials if you want to test production-style password recovery emails

### 1. Get the code and install dependencies

```bash
git clone https://github.com/Ravikiran9988/axly-books.git
cd axly-books
npm ci
```

### 2. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

At minimum, configure a valid database connection and the local application URL in `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional integrations:

```env
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="AXLY Books <noreply@books.axly.in>"
```

Use real credentials only in your local environment or hosting provider's secret store. **Never commit production credentials to Git.**

### 3. Apply migrations and start the app

```bash
npm run db:migrate
npm run db:verify
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To seed the initial publication data, run:

```bash
npm run db:seed
```

### 4. Create an administrator

Register an account through the application, then promote that existing account against the configured database:

```bash
npm run admin:promote -- your-account@example.com
```

Run the command only with the intended database configured. Public registration must not grant administrator privileges.

---

## PDF import: workflow and limitations

1. Configure `BLOB_READ_WRITE_TOKEN` and apply the database migrations.
2. Sign in as an administrator and open **Admin → Book Management → Import from PDF** (or `/admin/books/import`).
3. Select a PDF, review the extracted text and suggested chapters, and edit titles or content where needed.
4. Preview the imported reader view and keep the book unpublished until you have checked it thoroughly.
5. Publish only when the chapter order, formatting, and content are correct.

### Important storage warning

The current PDF import flow stores the original PDF in a **public Vercel Blob store**. Anyone who obtains the Blob URL may be able to access the file, even when the reader-facing download link is disabled. Disabling that link is not storage-level access control. Do not upload confidential, restricted, or personally sensitive PDFs.

### Import limitations
- Text extraction and chapter splitting depend on the PDF's text and layout. Always review the result.
- OCR fallback currently targets English (`eng`) and may take time on scanned documents.
- The reader preview is based on extracted text; it does not faithfully reconstruct the original PDF layout.
- Embedded images, diagrams, tables, page layout, and code formatting may not be reconstructed automatically.
- PDF import creates editable web chapters, but it is not a substitute for editorial review.

---

## Database commands

The repository uses versioned SQL migrations in `drizzle/`.

```bash
# Generate a migration from schema changes
npm run db:generate

# Apply checked-in migrations
npm run db:migrate

# Verify database connectivity and expected setup
npm run db:verify

# Seed publication and chapter data
npm run db:seed
```

Avoid using schema push against a production database as a replacement for reviewing and applying versioned migrations.

## Quality checks

Run the same core checks locally before submitting changes:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The automated test suite covers validation and security behavior, reader journeys, route integration, PDF-import access controls, and chapter-comment protections. A passing test suite does not verify production environment variables, applied live migrations, Blob permissions, or the deployed user experience; perform a preview smoke test before release.

---

## Deployment overview (Vercel + Neon)

1. Create a Neon PostgreSQL project and copy its pooled connection string.
2. Apply migrations and verify the target database before switching traffic.
3. Import `Ravikiran9988/axly-books` into Vercel.
4. Configure environment variables in the appropriate Vercel environments:
   - `DATABASE_URL` — required.
   - `NEXT_PUBLIC_APP_URL` — use `https://books.axly.in` for production.
   - `BLOB_READ_WRITE_TOKEN` — required for Blob-backed uploads and PDF import.
   - `RESEND_API_KEY` and `EMAIL_FROM` — required for password-reset email delivery.
5. Register the intended administrator and run `npm run admin:promote -- email@example.com` against the production database.
6. Configure `books.axly.in` in Vercel Domains and follow the DNS values Vercel provides.

Do not assume a deployment is ready solely because a build succeeds. Confirm migrations, environment variables, authentication, uploads, permissions, and the main reading flows in a preview or staging environment.

## Publication and content licence

The currently documented publication is:

- **Title:** *ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition*
- **Author / pen name:** Slayer
- **Copyright holder:** Medicharla Ravi Kiran
- **Book content licence:** [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)
- **Topics:** classical machine learning, linear algebra, optimization, deep neural networks, CNNs, sequence modeling, transformers, and Generative AI.

The book-content licence applies to the relevant published content; it does not automatically license the AXLY Books software codebase.

## Author

- **Pen name:** Slayer
- **Full name:** Medicharla Ravi Kiran
- **Contact:** `ravikiran@axly.in`
- **Website:** [books.axly.in](https://books.axly.in/)
- **GitHub:** [Ravikiran9988](https://github.com/Ravikiran9988)
- **LinkedIn:** [Medicharla Ravi Kiran](https://www.linkedin.com/in/medicharla-ravi-kiran/)

---

AXLY Books is intended to remain a free reading platform: no advertisements, paywalls, subscriptions, or book sales.
