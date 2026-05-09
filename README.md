# Mezon Tutors

> Smart tutor matching platform for busy professionals. Learn on your schedule.

[![Turborepo](https://img.shields.io/badge/monorepo-turborepo-blue.svg)](https://turbo.build/repo)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-green.svg)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748)](https://www.prisma.io)
[![Yarn](https://img.shields.io/badge/package%20manager-Yarn%204-2C8EBB)](https://yarnpkg.com)

---

## 👋 Overview

**Mezon Tutors** is a B2C/B2B tutor booking platform that connects learners with qualified tutors through an intuitive, Tinder-style matching experience. All communication, scheduling, and learning sessions happen directly on Mezon—keeping everything in one place while ensuring quality and transparency for both sides.

### The Problem

- **Learners** (especially working professionals) struggle to find flexible, quality tutoring outside standard office hours
- **Tutors** (language teachers, skilled students) lack a trusted platform to monetize their expertise on their own terms

### The Solution

Mezon Tutors offers a seamless matching system where learners discover tutors based on subject, availability, and teaching style. All interactions—chat, video calls, and learning rooms—stay within the platform, with tutor-led clans and clear policies to build accountability and community.

---

## ✨ Features

### Core

- **Smart Matching** — Swipe-style discovery to find tutors that fit your goals, schedule, and budget
- **In-Platform Learning** — Chat, video calls, and virtual rooms built directly into Mezon (no external apps)
- **Tutor Clans** — Tutors create and manage their own communities with customizable policies
- **Platform Governance** — Clear rules ensuring tutors operate within Mezon (no private off-platform arrangements)

### Planned

- **Multi-Subject Expansion** — Beyond languages: programming, math, and more
- **Rewards & Gamification** — Earn skills, coins, and achievements
- **Certifications** — Skill-based credentials upon completion
- **Periodic Rewards** — Incentives for learners and tutors who stay active

---

## 🎯 Target Users

| Segment            | Description                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **B2C — Learners** | Working professionals and others learning languages who need flexible, non–9-to-5 scheduling                 |
| **B2B — Tutors**   | English tutors, language students, and subject-matter experts looking for extra income on a trusted platform |

---

## 🧰 Tech Stack

| Layer    | Technologies                                     |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui    |
| Backend  | NestJS 10, Swagger, Passport, JWT, Helmet, Zod   |
| Database | PostgreSQL, Prisma ORM                           |
| Shared   | TypeScript, Zod, React Hook Form, TanStack Query |
| Tooling  | Yarn 4, Turbo, Vitest, Biome, Husky              |

## 🗂️ Project Structure

```text
mezon-tutors/
├─ apps/
│  ├─ api/                 # NestJS backend (Swagger, JWT, RBAC)
│  └─ web/                 # Next.js frontend
├─ packages/
│  ├─ app/                 # Cross-platform screens/components used by web
│  ├─ db/                  # Prisma schema, migrations, seed, DB utilities
│  └─ shared/              # Shared DTOs/schemas/helpers (used by api & web)
├─ docs/                   # Product/design notes (e.g. Figma links)
├─ .github/workflows/      # CI workflow
├─ package.json            # Monorepo scripts & workspace config
└─ README.md
```

## 🏁 Getting Started

### Prerequisites

- Node.js 22 or newer
- Yarn 4.x via Corepack
- PostgreSQL 16+ or a compatible Postgres instance

### Install dependencies

```sh
yarn install
```

### Environment setup

Create the environment files and point them to your local services:

Then generate Prisma Client and run migrations:

```sh
yarn workspace @mezon-tutors/db prisma:gen
yarn workspace @mezon-tutors/db prisma:migrate
```

If you only need to push the schema without creating a migration:

```sh
yarn workspace @mezon-tutors/db prisma:db:push
```

## 🚀 Usage

### Run the API

For local development, run the NestJS app directly:

```sh
yarn workspace @mezon-tutors/api dev
```

The API will usually be available at:

- `http://localhost:4000`
- Swagger docs: `http://localhost:4000/api/docs`

Note: the root script `yarn api` also exists, but it performs a build step first.

### Run the web app

For local development, run the frontend directly:

```sh
yarn workspace @mezon-tutors/web dev
```

The web app will usually be available at:

- `http://localhost:3000`

Note: the root script `yarn web` also exists, but it performs a build step first.

### Common scripts

```sh
yarn build
yarn lint
yarn typecheck
yarn test
```

## 🔐 Env

### API

| Variable             | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `PORT`               | No       | API port, defaults to `4000`                     |
| `NODE_ENV`           | No       | Environment mode, defaults to `development`      |
| `CORS_ORIGINS`       | No       | Comma-separated allowed origins                  |
| `FRONTEND_URL`       | Yes      | Frontend base URL used for redirects             |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string                     |
| `JWT_SECRET`         | Yes      | Secret used to sign JWT access tokens            |
| `JWT_REFRESH_SECRET` | No       | Refresh-token secret, falls back to `JWT_SECRET` |
| `MEZON_OAUTH_URL`    | Yes      | Base URL for Mezon OAuth                         |
| `CLIENT_ID`          | Yes      | OAuth client ID                                  |
| `CLIENT_SECRET`      | Yes      | OAuth client secret                              |
| `REDIRECT_URI`       | Yes      | OAuth redirect URI                               |

Example:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,exp://localhost:8081
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:6543/mezon-tutors?schema=public
JWT_SECRET=change-me-in-production-use-strong-random-string
JWT_REFRESH_SECRET=change-me-too
MEZON_OAUTH_URL=https://example.com/oauth
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:4000/api/auth/mezon/callback
```

### Web

| Variable                   | Required | Description                             |
| -------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_API_ENDPOINT` | Yes      | Public API base URL used by the web app |
| `IGNORE_TS_CONFIG_PATHS`   | No       | Compatibility flag for path resolution  |

Example:

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:4000/api
IGNORE_TS_CONFIG_PATHS=true
```

## 🧪 Testing

Run the available project checks with:

```sh
yarn test
yarn lint
yarn typecheck
```

Workspace-specific examples:

```sh
yarn workspace @mezon-tutors/web test
yarn workspace @mezon-tutors/web typecheck
yarn workspace @mezon-tutors/api typecheck
yarn workspace @mezon-tutors/db typecheck
```

Coverage is not wired into the repository yet. If you want coverage reports, add Vitest coverage in the relevant workspace and publish the result to your CI.

## 🤝 Contributing

1. Create a branch from `main`.
2. Make your changes in the relevant workspace.
3. Run `yarn lint`, `yarn typecheck`, and any relevant tests.
4. Open a pull request with a clear summary of the change.

Recommended conventions:

- Keep shared types and DTOs in `packages/shared`.
- Keep Prisma schema changes in `packages/db`.
- Keep UI and screen logic in `apps/web` or `packages/app`.
- Keep server-side business logic in `apps/api`.

## 🌍 Community

### Special thanks

- Huge thanks to everyone who supported and shared early feedback for Mezon Tutors.
- Thanks to the open-source community for all the ideas, patterns, and tools we build on.

### Contributors

Thank you to everyone who has contributed code, ideas, issues, and feedback:

<p align="left">
  <a href="https://github.com/phunguyenthien-ncc">
    <img src="https://avatars.githubusercontent.com/u/247509413?v=4" width="48" height="48" alt="phunguyenthien-ncc" title="phunguyenthien-ncc" />
  </a>
  <a href="https://github.com/phuocnguyenncc">
    <img src="https://avatars.githubusercontent.com/u/167954084?v=4" width="48" height="48" alt="phuocnguyenncc" title="phuocnguyenncc" />
  </a>
  <a href="https://github.com/tomedis">
    <img src="https://avatars.githubusercontent.com/u/114924189?v=4" width="48" height="48" alt="tomedis" title="tomedis" />
  </a>
  <a href="https://github.com/thieuthangncc">
    <img src="https://avatars.githubusercontent.com/u/217855691?v=4" width="48" height="48" alt="thieuthangncc" title="thieuthangncc" />
  </a>
  <a href="https://github.com/LongVu236">
    <img src="https://avatars.githubusercontent.com/u/218201012?v=4" width="48" height="48" alt="LongVu236" title="LongVu236" />
  </a>
  <a href="https://github.com/tiennguyenvan-ncc">
    <img src="https://avatars.githubusercontent.com/u/226026574?v=4" width="48" height="48" alt="tiennguyenvan-ncc" title="tiennguyenvan-ncc" />
  </a>
</p>
