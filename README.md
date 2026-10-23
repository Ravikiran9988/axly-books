# AXLY Books

> **A World of Ideas, One Page at a Time.**  
> An independent digital book-reading platform and author CMS by **Slayer** (Medicharla Ravi Kiran).  
> Canonical Domain: **[https://books.axly.in](https://books.axly.in/)**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat&logo=postgresql)](https://neon.tech/)
[![ORM](https://img.shields.io/badge/Drizzle-ORM-orange?style=flat)](https://orm.drizzle.team/)
[![Storage](https://img.shields.io/badge/Storage-Vercel%20Blob-black?style=flat)](https://vercel.com/storage/blob)
[![Security](https://img.shields.io/badge/RBAC-Admin%20%7C%20Reader-emerald?style=flat)](#)
[![License](https://img.shields.io/badge/Content-CC%20BY--NC%204.0-brightgreen)](#)

---

## 1. Overview

**AXLY Books** is a production-grade digital reading platform and content management system designed to publish original technical books freely online. It features:
- An editorial, distraction-free reading interface with 3 reading themes (**Dark**, **Light**, **Sepia**), custom typography, instant chapter drawer, and full keyboard navigation.
- Persistent cross-device reading progress, chapter bookmarks, and reader dashboard.
- A fully isolated **Administrator Content Management System (CMS)** with draft segregation, chapter reordering, and technical code snippet/callout management.
- **PDF book import:** upload an existing searchable PDF, extract text in the browser, review/edit detected chapter splits, run browser OCR on scanned pages, preview the extracted text in a reader-like layout, and import the original PDF plus interactive chapters without retyping.
- Robust Role-Based Access Control (**RBAC**) separating general readers from platform administrators.
- **100% Free Access Policy:** The platform strictly prohibits advertisements, paywalls, subscriptions, or book sales.

---

## P3 ratings and reviews

Published book pages now include a public rating summary, star distribution, paginated reviews, and a review composer for signed-in readers. Each reader can maintain one 1–5-star review per book, optionally title it, and edit or delete their review. Administrators can moderate reviews from **Admin → Book Reviews**, including hiding/restoring or deleting them. Apply migration `0004_add_book_reviews.sql` with `npm run db:migrate`. See [`docs/P3_BOOK_REVIEWS.md`](docs/P3_BOOK_REVIEWS.md) for validation rules and manual smoke tests.

## P2 reader experience

The reader restores the last scroll position for each book chapter on the current browser, shows estimated chapter reading time and approximate remaining time, and keeps the existing theme, typography, bookmark, chapter navigation, and distraction-free controls. Position persistence is device-local and does not sync across devices. See [`docs/P2_READER_EXPERIENCE.md`](docs/P2_READER_EXPERIENCE.md) for manual smoke tests and limitations.

## P4 chapter discussions

P4 adds chapter-specific discussions with threaded replies (one reply level), reader names, a Slayer author badge for administrator replies, editing/deleting your own comments, helpful votes, abuse reports, comment sorting and load-more pagination. Administrators can review the moderation queue at **Admin → Reader Comments**, hide/restore content, inspect reports, and delete comments.

Apply the new migration with `npm run db:migrate` after pulling the branch. The migration creates `comments`, `comment_votes`, and `comment_reports`. Comments require a persistent database and signed-in readers; reading published discussions remains public. Each account can cast one helpful vote and submit one report per comment. Comment text is limited to 2,000 characters.

Moderation is intentionally conservative: reports are queued for an administrator, not auto-hidden based on untrusted report counts. The reader-facing platform remains free, without ads, subscriptions, paywalls, or book sales.

## P3 launch readiness

See [`docs/P3_LAUNCH_READINESS.md`](docs/P3_LAUNCH_READINESS.md) for the deployment configuration checklist, security/storage caveats, and the required preview smoke test. CI now includes regression checks that anonymous requests and forged session cookies cannot invoke the PDF import endpoint.

## PDF book import setup

1. Configure `BLOB_READ_WRITE_TOKEN` in the deployment environment for Vercel Blob storage.
2. Apply the new database migration with `npm run db:migrate` (or run `ALTER TABLE books ADD COLUMN original_pdf_url text;` once if you manage migrations manually).
3. Open **Admin → Book Management → Import from PDF** or visit `/admin/books/import` as an administrator.
4. Choose a PDF (maximum 25 MB). Text extraction runs in the browser using PDF.js; when you submit, the PDF uploads directly from the browser to Vercel Blob with an admin-authorized, short-lived upload token and visible progress. This avoids sending the file through a serverless function request body.
5. Review the extracted chapter split and edit titles/content before importing. Keep the book unpublished until you have checked formatting and page headers/footers.

**Storage security:** the current direct-upload flow targets a **public** Vercel Blob store. Original PDFs are therefore accessible to anyone who obtains the Blob URL, even when the reader download link is disabled. Use this only for manuscripts you are comfortable storing publicly; use a separate private-storage design for restricted originals. Do not upload confidential manuscripts.

**Current limitations:** OCR fallback currently uses Tesseract.js in the browser and recognizes English (`eng`) only; quality and processing time depend on the PDF and device. Chapter splitting and repeated header/footer cleanup are heuristic, so review every chapter. The reader preview shows extracted text, not the original PDF layout. Embedded images/diagrams, tables, rich layout, and code formatting are not automatically reconstructed yet. The reader download link is shown only when `Allow readers to download the original PDF` is enabled; this is a UI control, not storage-level access control.

## 2. Official Publication

- **Title:** *ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition*
- **Author:** Slayer (Medicharla Ravi Kiran)
- **License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)
- **Topics:** Classical Machine Learning, Linear Algebra, Optimization, Deep Neural Networks, CNNs, Sequence Modeling, Transformers, and modern Generative AI.

---

## 3. Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Browser (React 19 / App Router)"] --> AppShell["AppShell & Next.js Router"]
    AppShell --> PublicRoutes["Public / Reader Routes (/books, /read, /dashboard)"]
    AppShell --> AdminRoutes["Admin CMS Routes (/admin, /admin/books)"]
    
    PublicRoutes --> API["API Layer (/api/*)"]
    AdminRoutes --> AdminAPI["Admin API Layer (/api/admin/*)"]
    
    API --> RateLimit["Atomic PostgreSQL Rate Limiting"]
    AdminAPI --> RateLimit
    
    RateLimit --> AuthGuard["Server Security Guards (requireAuth, requireAdmin)"]
    AuthGuard --> DrizzleORM["Drizzle ORM Schema & Queries"]
    DrizzleORM --> NeonDB["Neon Serverless PostgreSQL"]
    AdminAPI --> ObjectStorage["Vercel Blob Persistent Storage"]
```

- **Framework:** Next.js 16.4.2 (App Router with Cache Components & Partial Prerendering)
- **Frontend:** React 19, Vanilla CSS Design System with curated design tokens, glassmorphism, responsive drawers
- **Language:** TypeScript 5.0 (Strict mode enabled)
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`) with versioned migrations
- **Object Storage:** Vercel Blob (`@vercel/blob`) with deep content magic-bytes verification
- **Authentication & Security:** bcrypt password hashing (12 salt rounds), SHA-256 session token hashing, HTTP-only SameSite cookies, atomic sliding-window distributed rate limiting, Zod schema validations

---

## 4. Role-Based Access Control (RBAC)

The application strictly differentiates permissions between **`reader`** and **`admin`** users:

| Permission / Surface | Reader (`reader`) | Administrator (`admin`) |
| :--- | :---: | :---: |
| Browse published book catalogue (`/books`) | ✅ | ✅ |
| Read published chapters (`/read/[bookSlug]`) | ✅ | ✅ |
| Preview unpublished / draft books | ❌ (404 Not Found) | ✅ |
| Personal Reader Dashboard (`/dashboard`) | ✅ | ✅ |
| Save personal reading progress & bookmarks | ✅ | ✅ |
| Access Admin CMS Dashboard (`/admin`) | ❌ (Redirected to `/dashboard`) | ✅ |
| Manage Books (Create, Edit, Delete) (`/admin/books`) | ❌ (403 Forbidden) | ✅ |
| Upload Cover Images (`/api/admin/upload`) | ❌ (403 Forbidden) | ✅ |
| Manage Chapters & Sections (`/admin/books/[id]/chapters`) | ❌ (403 Forbidden) | ✅ |
| Toggle Book Publication Status (Draft vs Published) | ❌ (403 Forbidden) | ✅ |
| Reorder Chapter Indexing | ❌ (403 Forbidden) | ✅ |
| Elevate User Roles (CLI only) | ❌ | CLI Script Only |

### Server-Enforced Security Guards
All admin operations and sensitive reader endpoints are guarded on the server by centralized helpers in `src/lib/auth.ts`:
- `requireAuth(request?)`: Ensures a valid, unexpired session exists.
- `requireAdmin(request?)`: Validates that the session belongs to a user with `role === 'admin'`. Rejects unauthenticated callers with 401 and non-admin readers with 403.
- `assertRecordOwnership(userId, ownerId)`: Strictly prevents cross-user modification of progress or bookmarks.

### Rate limiting and password-reset delivery

- Production authentication and password-reset endpoints fail closed with HTTP 503 if the shared Neon-backed rate limiter cannot make a decision; they do not silently fall back to process-local rate limits.
- Local development and tests may use the process-local limiter when the database is not configured.
- Password recovery currently supports Resend through `RESEND_API_KEY`; setting `SMTP_HOST` alone is not enough because no SMTP transport is implemented.
- Resend's HTTP response is checked. If the provider rejects the request or the request times out, the generated reset token is invalidated and a safe error is logged.
- The password-reset endpoint returns a generic HTTP 202 response to avoid revealing whether an email belongs to an account. This confirms receipt of the request, not email delivery. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` in production.

---

## 5. Persistent Object Storage (Image Uploads)

Cover images for books and technical diagrams use **Vercel Blob** (`@vercel/blob`):
1. **Endpoint:** `POST /api/admin/upload` (multipart form-data).
2. **Access Control:** Strictly restricted to authenticated Administrators via `requireAdmin()`.
3. **Deep Content Inspection:** Inspects binary magic bytes before accepting files:
   - JPEG: `0xFF 0xD8 0xFF`
   - PNG: `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`
   - WebP: `RIFF...WEBP` (`0x52 0x49 0x46 0x46` and `0x57 0x45 0x42 0x50`)
4. **Collision Protection:** Filenames are sanitized and appended with timestamps and cryptographic random hex suffixes (e.g. `covers/title-timestamp-randomhex.png`).
5. **Graceful Degrade:** If `BLOB_READ_WRITE_TOKEN` is unset, the endpoint returns an honest HTTP 503 explaining that uploads are disabled, while preserving direct image URL editing in the CMS.

---

## 6. CLI Administrator Provisioning

For maximum security, admin privileges cannot be granted through public registration or client-side toggles. Admin promotion is executed strictly via a secure, audited CLI script:

```bash
# Elevate an existing registered reader to Administrator
npm run admin:promote -- ravikiran@axly.in
```

### CLI Promotion Workflow:
1. Connects to the real configured Neon PostgreSQL database.
2. Normalizes email address (case-insensitive trim).
3. Validates that the target user account exists.
4. Performs an idempotent role update to `'admin'`.
5. Logs confirmation with user ID, name, email, and timestamp without exposing secrets.

---

## 7. Database Setup, Migrations & Seeding

### Environment Setup
Copy the environment template:
```bash
cp .env.example .env.local
```
Configure your Neon PostgreSQL connection string in `.env.local`:
```env
DATABASE_URL="postgresql://user:password@endpoint-pooler.region.aws.neon.tech/dbname?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Versioned Migration & Verification Workflow
```bash
# Generate SQL migrations based on schema updates
npm run db:generate

# Apply versioned migrations from ./drizzle using Neon serverless migrator
npm run db:migrate

# Audit and verify database connectivity, tables, constraints, and admin existence
npm run db:verify

# Seed official publication and chapter data (Idempotent: will not overwrite manual admin edits)
npm run db:seed
```

---

## 8. Quality Assurance & Automated Tests

The repository maintains an automated test harness covering cryptographic functions, validation schemas, user journeys, and genuine HTTP route execution:

```bash
# Run all automated test suites (Phase 2 unit tests, E2E journey tests, and genuine route integration tests)
npm test

# Run ESLint validation (0 errors, 0 warnings enforced)
npm run lint

# Run TypeScript strict type-check (0 errors)
npx tsc --noEmit

# Compile production build with Next.js Turbopack
npm run build
```

---

## 9. Deployment Runbook (Vercel & Neon)

### Step 1: Provision Neon PostgreSQL
1. Create a project at [https://console.neon.tech](https://console.neon.tech).
2. Copy the **Pooled Connection String** (`sslmode=require`).

### Step 2: Apply Migrations & Seed Baseline Data
Run migrations and baseline seeding against your live Neon database:
```bash
DATABASE_URL="<your-neon-pooled-url>" npm run db:migrate
DATABASE_URL="<your-neon-pooled-url>" npm run db:verify
DATABASE_URL="<your-neon-pooled-url>" npm run db:seed
```

### Step 3: Configure Vercel Project
1. Import repository `Ravikiran9988/axly-books` into Vercel.
2. Under **Project Settings > Environment Variables**, add:
   - `DATABASE_URL`: Your Neon pooled connection string (Mandatory).
   - `NEXT_PUBLIC_APP_URL`: `https://books.axly.in` (Mandatory).
   - `BLOB_READ_WRITE_TOKEN`: Token from Vercel Storage Blob (Optional, for cover uploads).
   - `RESEND_API_KEY`: API key from Resend (Optional, for password recovery emails).
   - `EMAIL_FROM`: `AXLY Books <noreply@books.axly.in>` (Optional).
   - `NODE_ENV`: `production`.

### Step 4: Provision Administrator Account
1. Open `https://books.axly.in/register` and register the owner's account (e.g. `ravikiran@axly.in`).
2. Run the promotion script targeting the live database:
   ```bash
   DATABASE_URL="<your-neon-pooled-url>" npm run admin:promote -- ravikiran@axly.in
   ```
3. Log in at `https://books.axly.in/login` and navigate to `https://books.axly.in/admin` to manage books.

### Step 5: Connect Custom Domain
1. In Vercel, navigate to **Settings > Domains** and add `books.axly.in`.
2. Configure DNS CNAME record at your DNS provider:
   - Host: `books`
   - Type: `CNAME`
   - Target: `cname.vercel-dns.com`

---

## 10. Author & Legal Identity

- **Author / Pen Name:** Slayer
- **Full Legal Name:** Medicharla Ravi Kiran
- **Role:** AI/ML Engineer and Full-Stack Developer
- **Contact:** `ravikiran@axly.in` | `books.axly.in`
- **GitHub:** [https://github.com/Ravikiran9988](https://github.com/Ravikiran9988)
- **LinkedIn:** [https://www.linkedin.com/in/medicharla-ravi-kiran/](https://www.linkedin.com/in/medicharla-ravi-kiran/)

All original book contents and publications are licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Software architecture and platform codebase are owned by Medicharla Ravi Kiran.
