# AXLY Books

> **A World of Ideas, One Page at a Time.**  
> An independent digital book-reading platform and author CMS by **Slayer** (Medicharla Ravi Kiran).  
> Canonical Domain: **[https://books.axly.in](https://books.axly.in/)**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat&logo=postgresql)](https://neon.tech/)
[![ORM](https://img.shields.io/badge/Drizzle-ORM-orange?style=flat)](https://orm.drizzle.team/)
[![Security](https://img.shields.io/badge/RBAC-Admin%20%7C%20Reader-emerald?style=flat)](#)
[![License](https://img.shields.io/badge/Content-CC%20BY--NC%204.0-brightgreen)](#)

---

## 1. Overview

**AXLY Books** is a production-grade digital reading platform and content management system designed to publish original technical books freely online. It features:
- An editorial, distraction-free reading interface with 3 reading themes (**Dark**, **Light**, **Sepia**), custom typography, instant chapter drawer, and full keyboard navigation.
- Persistent cross-device reading progress, chapter bookmarks, and reader dashboard.
- A fully isolated **Administrator Content Management System (CMS)** with draft segregation, chapter reordering, and technical code snippet/callout management.
- Robust Role-Based Access Control (**RBAC**) separating general readers from platform administrators.

---

## 2. Official Publication

- **Title:** *ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition*
- **Author:** Slayer (Medicharla Ravi Kiran)
- **License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)
- **Topics:** Classical Machine Learning, Linear Algebra, Optimization, Deep Neural Networks, CNNs, Sequence Modeling, Transformers, and modern Generative AI.

---

## 3. Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Browser (React 19 / Turbopack)"] --> AppShell["AppShell & Next.js Router"]
    AppShell --> PublicRoutes["Public / Reader Routes (/books, /read, /dashboard)"]
    AppShell --> AdminRoutes["Admin CMS Routes (/admin, /admin/books)"]
    
    PublicRoutes --> API["API Layer (/api/*)"]
    AdminRoutes --> AdminAPI["Admin API Layer (/api/admin/*)"]
    
    API --> RateLimit["Distributed Rate Limiting (Neon / In-Memory)"]
    AdminAPI --> RateLimit
    
    RateLimit --> AuthGuard["Server Security Guards (requireAuth, requireAdmin)"]
    AuthGuard --> DrizzleORM["Drizzle ORM Schema & Queries"]
    DrizzleORM --> NeonDB["Neon Serverless PostgreSQL"]
```

- **Framework:** Next.js 16.4.2 (App Router with Cache Components & Partial Prerendering)
- **Frontend:** React 19, Vanilla CSS Design System with curated design tokens, glassmorphism, responsive drawers
- **Language:** TypeScript 5.0 (Strict mode enabled)
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Authentication & Security:** bcrypt password hashing (12 salt rounds), SHA-256 session token hashing, HTTP-only SameSite cookies, sliding-window distributed rate limiting, Zod schema validations

---

## 4. Role-Based Access Control (RBAC)

The application strictly differentiates permissions between **`reader`** and **`admin`** users:

| Permission / Surface | Reader (`reader`) | Administrator (`admin`) |
| :--- | :---: | :---: |
| Browse published book catalogue (`/books`) | ✅ | ✅ |
| Read published chapters (`/read/[bookSlug]`) | ✅ | ✅ |
| Preview unpublished / draft books | ❌ | ✅ |
| Personal Reader Dashboard (`/dashboard`) | ✅ | ✅ |
| Save personal reading progress & bookmarks | ✅ | ✅ |
| Access Admin CMS Dashboard (`/admin`) | ❌ (Redirected to `/dashboard`) | ✅ |
| Manage Books (Create, Edit, Delete) (`/admin/books`) | ❌ (403 Forbidden) | ✅ |
| Manage Chapters & Sections (`/admin/books/[id]/chapters`) | ❌ (403 Forbidden) | ✅ |
| Toggle Book Publication Status (Draft vs Published) | ❌ (403 Forbidden) | ✅ |
| Reorder Chapter Indexing | ❌ (403 Forbidden) | ✅ |
| Elevate User Roles (CLI only) | ❌ | CLI Script Only |

### Server-Enforced Security Guards
All admin operations and sensitive reader endpoints are guarded on the server by centralized helpers in `src/lib/auth.ts`:
- `requireAuth()`: Ensures a valid, unexpired session exists.
- `requireAdmin()`: Validates that the session belongs to a user with `role === 'admin'`. Rejects unauthenticated callers with 401 and non-admin readers with 403.
- `assertRecordOwnership(userId, ownerId)`: Strictly prevents cross-user modification of progress or bookmarks.

---

## 5. CLI Administrator Provisioning

For maximum security, admin privileges cannot be granted through public registration or UI toggles. Admin promotion is executed strictly via a secure, audited CLI script:

```bash
# Elevate an existing registered reader to Administrator
npm run admin:promote -- admin@axly.in
```

### CLI Promotion Workflow:
1. Verifies connectivity to the configured Neon PostgreSQL database.
2. Normalizes email address (case-insensitive trim).
3. Validates that the target user exists.
4. Performs an idempotent role update to `'admin'`.
5. Logs confirmation with user ID, name, email, and timestamp.

---

## 6. Database Setup, Migrations & Seeding

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

### Running Migrations & Seeding
```bash
# Generate SQL migrations based on schema updates
npm run db:generate

# Apply pending migrations to Neon PostgreSQL
npm run db:migrate

# Seed official publication and chapter data (Idempotent: will not overwrite manual admin edits)
npm run db:seed

# Inspect database visually via Drizzle Studio
npm run db:studio
```

---

## 7. Quality Assurance & Automated Verification

The project includes an end-to-end automated test harness covering all Phase 2 backend functionality, RBAC boundaries, cryptographic functions, and validation schemas:

```bash
# Run all automated test suites
npm test

# Run ESLint validation (0 errors, 0 warnings enforced)
npm run lint

# Run TypeScript strict type-check
npx tsc --noEmit

# Compile production build with Next.js Turbopack
npm run build
```

---

## 8. Deployment Guide (Vercel & Neon)

### Step 1: Provision Neon PostgreSQL
1. Create a project at [https://console.neon.tech](https://console.neon.tech).
2. Copy the **Pooled Connection String** (`sslmode=require`).

### Step 2: Configure Vercel Project
1. Link your GitHub repository `Ravikiran9988/axly-books` to Vercel.
2. Under **Project Settings > Environment Variables**, add:
   - `DATABASE_URL`: Your Neon pooled connection string.
   - `NEXT_PUBLIC_APP_URL`: `https://books.axly.in`
   - `RESEND_API_KEY`: API key from [Resend](https://resend.com) (for password reset emails).
   - `EMAIL_FROM`: `AXLY Books <books@axly.in>`
   - `BLOB_READ_WRITE_TOKEN`: Vercel Blob token (for asset uploads).
   - `NODE_ENV`: `production`

### Step 3: Run Database Migrations & Seed
In your local terminal or CI/CD pipeline targeting the production database:
```bash
DATABASE_URL="<production-neon-url>" npm run db:migrate
DATABASE_URL="<production-neon-url>" npm run db:seed
```

### Step 4: Provision Initial Administrator
```bash
DATABASE_URL="<production-neon-url>" npm run admin:promote -- <your-admin-email>
```

### Step 5: Configure Custom Domain
1. In Vercel, navigate to **Domains** and add `books.axly.in`.
2. Configure DNS CNAME record: `books.axly.in` -> `cname.vercel-dns.com`.

---

## 9. Author & Legal Identity

- **Author / Pen Name:** Slayer
- **Full Legal Name:** Medicharla Ravi Kiran
- **Role:** AI/ML Engineer and Full-Stack Developer
- **Contact:** `ravikiran@axly.in` | `books.axly.in`
- **GitHub:** [https://github.com/Ravikiran9988](https://github.com/Ravikiran9988)
- **LinkedIn:** [https://www.linkedin.com/in/medicharla-ravi-kiran/](https://www.linkedin.com/in/medicharla-ravi-kiran/)

All original book contents and publications are licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Software architecture and platform codebase are owned by Medicharla Ravi Kiran.
