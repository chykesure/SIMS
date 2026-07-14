Here you go — copy everything below:

---

```markdown
# SIMS — School Intelligence Management System

A comprehensive, multi-tenant SaaS platform designed to manage every aspect of school administration — from student enrollment and academic grading to finance, inventory, virtual classrooms, and AI-powered teaching tools.

Built with modern web technologies and tailored primarily for the Nigerian education system, SIMS empowers schools of all sizes to digitize and streamline their operations.

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Project](#running-the-project)
- [Project Structure](#-project-structure)
- [Modules Overview](#-modules-overview)
  - [Multi-Tenancy & Subscriptions](#1-multi-tenancy--subscriptions)
  - [Student Management](#2-student-management)
  - [Teacher Management](#3-teacher-management)
  - [Academics & Grading](#4-academics--grading)
  - [Report Cards](#5-report-cards)
  - [Finance](#6-finance)
  - [Vouchers](#7-vouchers)
  - [Inventory Management](#8-inventory-management)
  - [Budgeting](#9-budgeting)
  - [Virtual Classroom](#10-virtual-classroom)
  - [Parent Portal](#11-parent-portal)
  - [AI Teaching Assistant](#12-ai-teaching-assistant)
  - [Lesson Planning](#13-lesson-planning)
  - [Security & Audit](#14-security--audit)
- [User Roles](#-user-roles)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- **Multi-Tenant SaaS** — Host multiple schools on a single platform with full data isolation, custom branding (logo, colors, motto), and subscription-based access control.
- **Student Management** — Complete student lifecycle from admission inquiry through enrollment, class assignment, and academic tracking.
- **Teacher Management** — Staff profiles with subject assignments, activity tracking, and a gamified points system for engagement.
- **Configurable Grading System** — Flexible CA/exam structure (up to 3 CAs + exam), custom score maxima, and automatic position calculations (class, subject, and overall).
- **Termly Report Cards** — Auto-generated Word document report cards with teacher/principal remarks, digital signatures, and position rankings.
- **School Finance** — Fee types & assignments, payment tracking across multiple methods (cash, transfer, POS, online), income/expense logging, and receipt generation.
- **Voucher System** — Payment, receipt, credit note, and debit note vouchers with draft/approval workflows.
- **Inventory Management** — Track school supplies with stock-in/stock-out transactions, reorder level alerts, and supplier info.
- **Budget Management** — Session/term-based budgeting with category-level allocation and spend tracking.
- **Virtual Classroom** — Google Classroom-inspired module with announcements, assignments, file attachments, submissions, and grading.
- **Parent Portal** — Parents linked to students can monitor academic progress and school communications.
- **AI Teaching Assistant** — OpenAI-powered lesson note generation, lesson planning, and educational resource creation with a teacher gamification system.
- **Internationalization** — Multi-language support via `next-intl`.
- **Dark/Light Mode** — Theme switching powered by `next-themes`.
- **Role-Based Access Control** — Six distinct user roles with granular permissions (SuperAdmin, Admin, Staff, Teacher, Student, Parent).
- **Security Audit Logging** — Comprehensive login history and security event tracking.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **UI** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Components** | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) |
| **ORM** | [Prisma 6](https://www.prisma.io/) |
| **Authentication** | [NextAuth.js v4](https://next-auth.js.org/) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Data Fetching** | [TanStack React Query](https://tanstack.com/query) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **AI** | [OpenAI API](https://platform.openai.com/) |
| **Email** | [Nodemailer](https://nodemailer.com/) + [Resend](https://resend.com/) |
| **Internationalization** | [next-intl](https://next-intl.dev/) |
| **Theming** | [next-themes](https://github.com/pacocoursey/next-themes) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Document Generation** | [docx](https://docx.js.org/), [mammoth](https://github.com/mwilliamson/mammoth.js) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) |
| **Rich Text Editor** | [MDXEditor](https://mdxeditor.dev/) |
| **Tables** | [TanStack React Table](https://tanstack.com/table) |
| **Runtime** | [Bun](https://bun.sh/) |
| **Deployment** | [Netlify](https://www.netlify.com/) |

---

## 🏗️ Architecture

SIMS follows a **multi-tenant architecture** where every piece of data is scoped to a `tenantId`, ensuring complete data isolation between schools. The system consists of several clearly separated modules, each backed by its own set of Prisma models.

```
┌─────────────────────────────────────────────────┐
│                  SIMS Platform                  │
│              (Multi-Tenant SaaS)                │
├─────────┬──────────┬──────────┬────────────────┤
│  Admin  │  Teacher  │ Student  │    Parent      │
│ Portal  │  Portal   │ Portal  │    Portal      │
├─────────┴──────────┴──────────┴────────────────┤
│              Next.js App Router                 │
│         (API Routes + Server Actions)           │
├────────────────────────────────────────────────┤
│              Business Logic Layer               │
│    ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│    │ Academics│ │ Finance  │ │  Classroom   │  │
│    │  Module  │ │  Module  │ │   Module     │  │
│    ├──────────┤ ├──────────┤ ├──────────────┤  │
│    │ Inventory│ │  Budget  │ │  AI Module   │  │
│    │  Module  │ │  Module  │ │              │  │
│    └──────────┘ └──────────┘ └──────────────┘  │
├────────────────────────────────────────────────┤
│              Prisma ORM + PostgreSQL            │
│         (Tenant-scoped data isolation)          │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [PostgreSQL](https://www.postgresql.org/) (v14+)
- An [OpenAI API key](https://platform.openai.com/api-keys) (for AI features)
- A [Resend](https://resend.com/) or SMTP account (for email)

### Installation

```bash
# Clone the repository
git clone https://github.com/chykesure/SIMS.git
cd SIMS

# Install dependencies
bun install
# or
npm install
```

### Environment Variables

Create a `.env` file in the root directory based on the example below:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sims"
DIRECT_URL="postgresql://user:password@localhost:5432/sims"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI (for AI teaching assistant)
OPENAI_API_KEY="sk-your-openai-api-key"

# Email (Resend or SMTP)
RESEND_API_KEY="re-your-resend-key"
# OR SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (development)
bun run db:push

# Or run migrations
bun run db:migrate

# Reset database (clears all data)
bun run db:reset
```

### Running the Project

```bash
# Start development server on port 3000
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
SIMS/
├── prisma/
│   └── schema.prisma          # Database schema (30+ models)
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages & layouts
│   ├── components/             # React components (shadcn/ui + custom)
│   ├── lib/                    # Utilities, helpers, shared logic
│   └── ...                     # Additional source directories
├── .gitignore
├── .nvmrc                      # Node version pinning
├── components.json             # shadcn/ui configuration
├── eslint.config.mjs           # ESLint configuration
├── netlify.toml                # Netlify deployment config
├── next-env.d.ts               # Next.js TypeScript declarations
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies & scripts
├── postcss.config.mjs          # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

---

## 📦 Modules Overview

### 1. Multi-Tenancy & Subscriptions

Each school operates as an independent **tenant** with its own:
- **Branding** — Custom logo, primary color, motto, name
- **Subscription Plan** — Free (50 students, 3 users), Basic, or Premium
- **Approval Workflow** — Schools register and are reviewed by a SuperAdmin before activation
- **Plan Upgrades** — Schools can request plan upgrades with payment evidence verification
- **Settings** — Configurable school parameters (address, phone, website, state, country)

### 2. Student Management

- **Admission Records** — Track prospective students with status (Pending, Approved, Rejected)
- **Student Profiles** — Full student data including registration number, class, gender, date of birth, state of origin, LGA, parent contact, and photo
- **Parent-Student Linking** — Many-to-many relationship between parents and students
- **Class Assignment** — Students assigned to classes with reference tracking

### 3. Teacher Management

- **Teacher Profiles** — Name, subject specialization, gender, phone, email, address, photo, and active status
- **Activity Tracking** — Every teacher action (AI resource creation, grading, etc.) is logged with a gamified **points system** to encourage platform engagement

### 4. Academics & Grading

- **Configurable Score Structure** — Each school defines its CA count (1-3), CA labels, CA maxima, and exam maximum via `SchoolSettings`
- **Exam Scores** — Per-student, per-subject scores for each term and session with up to 3 CAs and an exam score
- **Automatic Calculations** — Total scores, averages, percentages, pass/fail counts, and subjects taken
- **Position Rankings** — Automatic class position, subject position, and overall position calculations
- **Previous Term Scores** — Import historical scores for schools adopting SIMS mid-session, ensuring accurate cumulative averages

### 5. Report Cards

- **Word Document Generation** — Termly report cards generated as `.docx` files using the `docx` library
- **Teacher Remarks** — Customizable per-term, per-student remarks
- **Principal Remarks** — School-wide principal comments
- **Digital Signatures** — Stored teacher and principal signature images embedded into report cards
- **Term/Session Management** — Resumption dates, term transitions, and session tracking

### 6. Finance

- **Fee Types** — Define school fees (Tuition, Exam Fee, Development Levy, etc.) with amounts and frequency (termly, per-session, once)
- **Fee Assignments** — Assign fees to specific classes or all classes with optional amount overrides and due dates
- **Payment Tracking** — Record payments with method (cash, bank transfer, POS, cheque, online), reference numbers, and receipt generation
- **Income & Expenses** — General ledger for school financial operations with categories like salary, maintenance, supplies, utilities, and donations
- **Payment Evidence** — For subscription payments, schools can upload proof of payment for manual verification

### 7. Vouchers

- **Multiple Voucher Types** — Payment vouchers, receipt vouchers, credit notes, and debit notes
- **Approval Workflow** — Draft → Approved → Cancelled status progression
- **Full Details** — Payee information, particulars, amounts, and authorization tracking

### 8. Inventory Management

- **Item Catalog** — Track items by category (stationery, furniture, lab equipment, sports, cleaning, etc.), unit, unit cost, and supplier
- **Stock Tracking** — Current quantities, reorder level alerts, and storage location
- **Transaction History** — Stock-in, stock-out, and adjustment transactions with cost tracking and performer info

### 9. Budgeting

- **Budget Creation** — Session and term-based budgets with category-level entries
- **Allocation vs. Spend** — Track allocated amounts against actual spending per category
- **Status Management** — Draft → Approved → Active → Closed lifecycle

### 10. Virtual Classroom

A Google Classroom-inspired module for digital learning:
- **Classrooms** — Create classes with subject, section, teacher, and cover image
- **Announcements** — Post updates with pinning support
- **Assignments** — Create assignments with instructions, due dates, max scores, and file attachments
- **Submissions** — Students submit work with file attachments; teachers grade and provide feedback
- **Materials** — Share links, documents, and resources with the class

### 11. Parent Portal

- **Parent Profiles** — Full parent information (name, email, phone, address, occupation)
- **Multi-Child Support** — One parent can be linked to multiple students via the `ParentStudent` join table
- **Progress Monitoring** — Parents can view their children's academic records, report cards, and school communications

### 12. AI Teaching Assistant

Powered by OpenAI, this module helps teachers create educational content:
- **Lesson Notes** — AI-generated lesson notes customized by subject, class, topic, term, and week
- **Resource Management** — Generated resources go through a draft → published workflow with admin approval
- **Gamification** — Teachers earn points for creating AI resources, with download counts tracking engagement
- **Activity Logging** — All AI-assisted actions are tracked for accountability and analytics

### 13. Lesson Planning

- **Structured Plans** — Teachers create detailed lesson plans per subject, class, term, and session
- **Weekly Breakdown** — Week-by-week planning stored as structured data
- **Status Tracking** — Draft and published states for lesson plans

### 14. Security & Audit

- **Role-Based Access Control** — Six roles with distinct permissions:
  - `SuperAdmin` — Platform-wide administration, school approvals
  - `Admin` — School-level administration
  - `Staff` — School staff with limited access
  - `Teacher` — Academic and classroom management
  - `Student` — View own records and submit assignments
  - `Parent` — Monitor linked students' progress
- **Login History** — Track all login/logout events per user
- **Security Audit Logs** — Comprehensive event logging with IP addresses, user agents, severity levels, and event metadata
- **Activity Logs** — School-level activity tracking for administrative actions

---

## 👥 User Roles

| Role | Description |
| --- | --- |
| **SuperAdmin** | Manages the entire platform — approves/rejects school registrations, reviews plan upgrades, monitors all tenants |
| **Admin** | Manages a single school — configures settings, manages users, oversees all school operations |
| **Staff** | Supports school administration with limited access to specific modules |
| **Teacher** | Manages academics — enters scores, creates lesson plans, uses AI tools, manages virtual classrooms |
| **Student** | Views own records, submits assignments, accesses classroom materials |
| **Parent** | Monitors linked students' academic progress and school communications |

---

## 🌐 Deployment

The project includes a `netlify.toml` configuration file for deployment on [Netlify](https://www.netlify.com/). The build script is configured to produce a standalone output:

```bash
# Build for production
bun run build

# Start production server
bun run start
```

The build process:
1. Runs `next build` to generate the optimized production build
2. Copies static assets into the standalone output directory
3. Copies the `public/` folder for static file serving

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private. All rights reserved.
```

---

Just **copy all of that**, create a file called `README.md` in your project root folder in VSCode, and paste it in. Done! 👍
