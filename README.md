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
- Download-only PDF publications served through a permission-checked private download route when downloads are enabled.

### Book management and PDF import
- Administrator-only CMS for creating and editing book metadata, covers, chapters, and chapter order.
- Draft and publication status controls to keep unfinished content out of the public catalogue.
- Exactly two import options: **PDF — download only** and **Markdown — read online**.
- PDF uploads are stored in private Vercel Blob storage and create a draft with no reader chapters.
- A single Markdown (`.md`) manuscript is split by H1 headings; H2 headings are used when H1 headings are absent or the only H1 repeats the book title. If there are no section headings, the manuscript remains one Full Book entry.
- Markdown source text is preserved and rendered with a safe React Markdown renderer that does not execute embedded HTML. Review the generated chapter titles and rendered content before publication.

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
- Resend credentials and a configured sender if you want to test password recovery emails

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
RESEND_API_KEY="your-resend-api-key" # or AXLY_BOOKS_RESEND_API_KEY
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

## Book import: supported formats

1. Configure `DATABASE_URL` and a separate **private** Vercel Blob store using `PDF_BLOB_READ_WRITE_TOKEN`. The public `BLOB_READ_WRITE_TOKEN` remains for existing cover/image uploads.
2. Apply checked-in migrations with `npm run db:migrate`.
3. Sign in as an administrator and open `/admin/books/import` to choose one of exactly two options.
4. **PDF — download only:** Upload a PDF of at most **4 MB**. The original is stored privately, downloads are enabled automatically, and no online-reader chapters are extracted. Publish the draft when ready.
5. **Markdown — read online:** Upload one `.md` file of at most **2 MB**. H1 headings become chapters; H2 headings are used when H1 headings are absent or the only H1 matches the book title. A manuscript without section headings stays as one Full Book entry. Review the imported draft before publishing.

### Original PDF storage and access

New imports store the original PDF in a **private Vercel Blob store**. The database holds its private pathname; public APIs do not expose that pathname. Original PDF downloads go through `/api/books/[slug]/pdf`, which checks publication status and the download permission before reading private storage. Set `PDF_BLOB_READ_WRITE_TOKEN` to the token for that separate private Blob store.

Previously imported PDFs that use `original_pdf_url` in a public Blob store remain public until you migrate them. Back up the database and both Blob stores first, then configure `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` for the old public store, and `PDF_BLOB_READ_WRITE_TOKEN` for the private store. Run `npm run db:migrate-legacy-pdfs` for a dry run; inspect its count and ensure every listed file is safe to migrate. Then run `npm run db:migrate-legacy-pdfs -- --apply`. The script copies PDFs to private storage, updates their database path, and attempts to delete the old public blob. If deletion fails, the script reports the affected book for manual cleanup. This command is opt-in and does not run automatically during deployment.

### Import limitations
- PDF uploads are stored as original files; PDF text extraction and OCR are not part of the current download-only flow.
- PDF uploads are limited to 4 MB. Compress the file if it exceeds this cap.
- Markdown uploads are limited to 2 MB and 100 generated chapters/sections.
- The reader supports Markdown headings, paragraphs, emphasis, links, lists, blockquotes, fenced code blocks, horizontal rules, and basic pipe tables. Advanced Markdown extensions and raw HTML rendering are intentionally not supported; preview the manuscript before publishing.
- The Markdown splitter is heading-based rather than AI-generated. It preserves original manuscript text and does not invent chapter titles when no headings exist.

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

The automated test suite covers validation and security behavior, reader journeys, route integration, publication eligibility, Markdown parsing, client-IP handling, PDF-import access controls, and chapter-comment protections. CI also applies every checked-in SQL migration to a disposable PostgreSQL database before running the tests. A passing test suite does not verify production environment variables, applied live migrations, Blob permissions, or the deployed user experience; perform a preview smoke test before release.

---

## Deployment overview (Vercel + Neon)

1. Create a Neon PostgreSQL project and copy its pooled connection string.
2. Apply migrations and verify the target database before switching traffic.
3. Import `Ravikiran9988/axly-books` into Vercel.
4. Configure environment variables in the appropriate Vercel environments:
   - `DATABASE_URL` — required.
   - `NEXT_PUBLIC_APP_URL` — use `https://books.axly.in` for production.
   - `BLOB_READ_WRITE_TOKEN` — used for the existing public Blob uploads and cover assets.
   - `PDF_BLOB_READ_WRITE_TOKEN` — required for the separate private Blob store used by newly imported original PDFs.
   - `RESEND_API_KEY` (or `AXLY_BOOKS_RESEND_API_KEY`), `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` — required for password-reset email delivery in production.
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

The book-content licence applies only to the relevant published content. The AXLY Books software codebase is separately marked All Rights Reserved in `LICENSE`.

## Author

- **Pen name:** Slayer
- **Full name:** Medicharla Ravi Kiran
- **Contact:** `ravikiran@axly.in`
- **Website:** [books.axly.in](https://books.axly.in/)
- **GitHub:** [Ravikiran9988](https://github.com/Ravikiran9988)
- **LinkedIn:** [Medicharla Ravi Kiran](https://www.linkedin.com/in/medicharla-ravi-kiran/)

---

Password-reset requests return a uniform response before account lookup and email delivery. Email sending runs after the response; reset tokens are not written to application logs. Configure Resend and `EMAIL_FROM` in production.\n\nAXLY Books is intended to remain a free reading platform: no advertisements, paywalls, subscriptions, or book sales.
