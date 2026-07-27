# Shadow Group

Shadow Group team platform and custom trading-card registry.

## Stack

- Next.js 15 + TypeScript
- Supabase Postgres, Auth, Storage, and Row Level Security
- Vercel hosting
- OpenAI API integration planned for structured card and artwork generation

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Add your Supabase project URL and anon key to `.env.local`.

## Database setup

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor. It creates:

- member profiles and roles
- operators and approved source facts
- versioned cards and card specifications
- generation-run history
- linked reference, artwork, and rendered assets
- initial Row Level Security policies
- public card-assets and private operator-references buckets

## Vercel

Import the GitHub repository into Vercel and add the same environment variables from `.env.example`. The current UI uses sample data, so it can deploy before Supabase is connected.

## First-pass scope

- Shadow Group branded landing page
- responsive operator-card gallery
- complete registry route
- individual card detail routes
- version-ready Supabase schema

Next milestones are Supabase data access, invite-only authentication, operator management, card creation workflow, SVG card rendering, and AI generation.
