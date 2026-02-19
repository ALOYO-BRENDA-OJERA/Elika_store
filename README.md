# Elika Store

Custom e-commerce store with a React + Vite frontend and a Node/Express + MySQL backend.

## Features

- Product browsing, filters, and product detail pages
- Cart + checkout flow
- Customer accounts, orders, and order tracking
- Reviews and product features
- Admin dashboard for products, categories, orders, and complaints (contact messages)
- File uploads for product images

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn-ui, Radix UI
- **State/Data**: React Context, TanStack Query
- **Backend**: Node.js, Express, MySQL (mysql2)
- **Auth**: JWT (httpOnly cookies)

## Prerequisites

- Node.js v18+
- MySQL (e.g., XAMPP or local MySQL server)
- npm (or bun)

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Frontend env:

```dotenv
# .env (project root)
VITE_ADMIN_PATH=admin-your-secret
```

Backend env:

```dotenv
# server/.env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=elika_store

JWT_SECRET=your-long-random-secret

# Admin seed (run once)
ADMIN_SEED_USERNAME=your-admin-username
ADMIN_SEED_PASSWORD=your-admin-password

# Resend (optional, for password reset emails)
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 3) Start backend

```bash
cd server
npm install
npm run dev
```

### 4) Seed admin user (run once)

```bash
cd server
npm run seed:admin
```

### 5) Start frontend

```bash
npm run dev
```

## Admin Access

Admin URL is hidden behind a secret path:

```
http://localhost:8080/<VITE_ADMIN_PATH>
```

Log in using the seeded admin credentials.

## Customer Flow

- Users must sign up or log in to checkout.
- Orders are linked to the logged-in customer and visible in **My Orders**.

## Scripts

Frontend (project root):

- `npm run dev` - Start Vite dev server
- `npm run build` - Build frontend
- `npm run lint` - Lint frontend
- `npm run test` - Run tests (Vitest)

Backend (server/):

- `npm run dev` - Start API server (watch mode)
- `npm run start` - Start API server
- `npm run seed:admin` - Seed admin user

## Notes

- Product images are stored in `server/uploads/` and served from `/uploads`.
- Contact form submissions appear under **Complaints** in the admin dashboard.
