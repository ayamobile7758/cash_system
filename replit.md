# Aya Mobile Runtime Skeleton

## Overview
An Arabic-language mobile retail management web app built with Next.js 14 + Supabase.
Features include: POS (Point of Sale), inventory management, reports, invoicing, and notifications.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Auth & DB**: Supabase (SSR client)
- **UI**: React 18, Tailwind CSS, Lucide React, Recharts
- **State**: Zustand
- **Validation**: Zod
- **Package Manager**: npm

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side)
- `CRON_SECRET` — (optional) Secret for cron job authorization (min 16 chars)

## Running the App
- **Dev**: `npm run dev` → starts on port 5000
- **Build**: `npm run build`
- **Start (prod)**: `npm run start` → starts on port 5000

## Project Structure
- `app/` — Next.js App Router pages and layouts
- `app/api/` — API route handlers
- `app/(dashboard)/` — Dashboard pages (protected)
- `components/` — Shared UI components
- `lib/` — Utilities, Supabase clients, env validation
- `hooks/` — Custom React hooks
- `stores/` — Zustand state stores
- `middleware.ts` — Auth/redirect middleware

## Notes
- Port is explicitly set to 5000 with `0.0.0.0` binding for Replit compatibility
- Security headers configured in `next.config.mjs`
- Migrated from Vercel to Replit March 2026
