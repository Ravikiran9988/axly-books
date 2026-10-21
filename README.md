# AXLY Books

> **A World of Ideas, One Page at a Time.**  
> An independent digital book-reading platform by **Slayer** (Medicharla Ravi Kiran).

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vanilla CSS](https://img.shields.io/badge/CSS-Design%20Tokens-purple?style=flat)](https://www.w3.org/Style/CSS/)
[![License](https://img.shields.io/badge/Access-100%25%20Free-emerald)](#)

---

## Overview

**AXLY Books** (`books.axly.in`) is a digital book-reading platform built to share published works with curious readers worldwide—without paywalls, subscriptions, or intrusive distractions. 

The platform features an editorial reading interface with customizable themes, live search, persistent reading progress, and chapter bookmarks.

### Official Publication
- **Title:** *ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition*
- **Author:** Slayer (Medicharla Ravi Kiran)
- **Topics:** Classical Machine Learning, Linear Algebra, Optimization, Deep Neural Networks, CNNs, Sequence Modeling, Transformers, and modern Generative AI.

---

## Key Features

- **Distraction-Free Interactive Reader:**
  - 3 Reading Themes: **Dark**, **Light**, and **Sepia**.
  - Typography Controls: Font size (15px to 24px), line height, and font style toggles (Editorial Serif, Modern Sans, Monospace).
  - Collapsible Table of Contents drawer for jumping across chapters.
  - Keyboard Navigation: `ArrowLeft` / `ArrowRight` for chapters, `B` to toggle bookmarks, `D` for focus mode.
- **Progress Tracking & Bookmarks:**
  - Automatically records chapter reading positions and percentage completion.
  - Manage saved bookmarks and resume reading directly from **My Library**.
- **Spotlight Search & Filter:**
  - Instant modal search (`/` or `Ctrl+K`) across titles, chapter headers, and descriptions.
  - Category and multi-criteria sorting on the library catalogue.
- **Reader Profile & Auth:**
  - Client-side reactive authentication and reader preferences (ready for Phase 2 API integration).

---

## Platform Routes

| Route | Description |
| :--- | :--- |
| `/` | Homepage with hero, featured book showcase, and author spotlight |
| `/books` | Digital library catalogue with search and category filters |
| `/books/[slug]` | Book details, metadata grid, and interactive table of contents |
| `/read/[bookSlug]` | Interactive distraction-free reader interface |
| `/author/slayer` | Complete author profile for Slayer (Medicharla Ravi Kiran) |
| `/about` | About AXLY publishing initiative |
| `/login` | Reader sign in |
| `/register` | Reader account registration |
| `/forgot-password` | Password recovery |
| `/profile` | Reader profile and reading environment defaults |
| `/my-library` | Saved books and bookmarks |
| `/privacy` | Privacy notice |
| `/terms` | Terms of use |

---

## Author Identity

- **Pen Name:** Slayer
- **Full Name:** Medicharla Ravi Kiran
- **Background:** AI/ML Engineer and Full-Stack Developer
- **Education:** B.Tech in Computer Science and Engineering, Vaagdevi College of Engineering, Warangal
- **GitHub:** [https://github.com/Ravikiran9988/](https://github.com/Ravikiran9988/)
- **LinkedIn:** [https://www.linkedin.com/in/medicharla-ravi-kiran/](https://www.linkedin.com/in/medicharla-ravi-kiran/)
- **Contact:** `ravikiran@axly.in`

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20+ (tested on Node v22.12.0)
- npm 9+

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Ravikiran9988/axly-books.git
cd axly-books

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Custom Vanilla CSS with CSS custom properties (Tokens, Glassmorphism, Radii)
- **Icons:** Lucide React + custom SVG brand assets
- **Data Layer:** Typed service layer (`bookService`, `authService`, `progressService`) designed for Phase 2 backend connection.

---

## License

All original publications and manuscripts authored by **Medicharla Ravi Kiran (Slayer)**. All rights reserved. Online access is provided freely for educational and personal reading purposes.
