# Shadow Group

Shadow Group team platform and custom trading-card registry.

## Stack

- Next.js 15 + TypeScript
- Supabase Postgres, Auth, Storage, and Row Level Security
- Vercel hosting
- OpenAI (`OPENAI_API_KEY`) for Command card image-read and Cardsmith drafts

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

Import the GitHub repository into Vercel and add the same environment variables from `.env.example`.

## Command access

`/command` is the admin console (cards, roster, events). It no longer depends on Google OAuth.

1. Apply migrations (including `018_bootstrap_admin.sql`) to hosted Supabase.
2. Confirm the admin email is in `public.allowed_accounts` with `role = admin` and `is_active = true`.
3. On the site, open **Command Access** → `/command/login`.
4. First visit: **Create allowlisted account** with that email and a password, then you are signed in.
5. Later visits: sign in with email and password. Google is optional if the provider is enabled in Supabase Auth.
6. If the email already has a Google-only auth user, use **Forgot password** (or set a password on that user in the Supabase dashboard) instead of Create account.

At `/command/cards` you can **Create** a card by dropping a finished render (the form is filled from the image) or by asking Cardsmith to draft fields from a brief, then **Review** and publish. You can still upload/replace the Magic card image on an existing version (stored in the `card-assets` bucket as kind `render`). Approving a version puts it in the public gallery. Image-read and Cardsmith drafts need `OPENAI_API_KEY`.

## First-pass scope

- Shadow Group branded landing page
- responsive operator-card gallery
- complete registry route
- individual card detail routes
- version-ready Supabase schema

Next milestones are Supabase data access, invite-only authentication, operator management, card creation workflow, SVG card rendering, and AI generation.
