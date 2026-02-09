# Elika Store

A custom-made e-commerce application built with React, Vite, Tailwind CSS, and shadcn-ui.

## Project Structure

- \src/\: React frontend application.
- \server/\: Node.js/Express backend with MySQL.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui.
- **Backend**: Node.js, Express, MySQL.
- **State Management**: React Context, TanStack Query.

## Getting Started

### 1. Prerequisites

- Node.js (v18+)
- MySQL Server installed and running.

### 2. Backend Setup

1. Navigate to the server directory:
   \cd server\
2. Install dependencies:
   \
pm install\
3. Configure your database:
   - Create a database named \elika_store\ in MySQL.
   - Update \server/.env\ with your MySQL credentials (user and password).
4. Start the backend:
   \
pm run dev\

### 3. Frontend Setup

1. Return to the root directory:
   \cd ..\
2. Install dependencies:
   \
pm install\
3. Start the frontend:
   \
pm run dev\

## Features

- Product browsing and filtering.
- Shopping cart functionality.
- Admin dashboard (Categories, Products, Orders).
- MySQL persistence for products and categories.
