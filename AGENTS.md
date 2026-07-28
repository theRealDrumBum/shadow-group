# Shadow Group

Next.js 15 (App Router) + TypeScript web app backed by Supabase (Postgres, Auth, Storage, RLS). It serves a public team/marketing site, an authenticated admin "command center", and a bearer-token Card Sync API (`/api/cards/sync`) intended to be driven by a Custom GPT.

Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`) and `README.md`. Env vars are listed in `.env.example`.

## Cursor Cloud specific instructions

### Running the app end-to-end
The app requires Supabase. The homepage (`/`) and every `/api/*` route throw if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` for API routes) are missing. Only `/cards` and `/cards/[slug]` degrade to hardcoded sample data (`src/lib/data.ts`). So to actually run the product you need a local Supabase stack.

A local stack is set up via the Supabase CLI (already installed) + Docker (already installed). Startup steps for a fresh session:
1. Start the Docker daemon (it is not auto-started): `sudo dockerd` (run in a background/tmux session) and, once up, make the socket usable without sudo: `sudo chmod 666 /var/run/docker.sock`.
2. From the repo root: `supabase start` (uses `supabase/config.toml`; applies `supabase/migrations/*.sql` and `supabase/seed.sql`). Prints local URL + keys; get them again anytime with `supabase status -o env`.
3. Create `.env.local` (copy `.env.example`) and fill the Supabase URL/anon key/service-role key from `supabase status`, plus any value for `CARD_SYNC_API_KEY`. `OPENAI_API_KEY` is unused and can stay blank.
4. `npm run dev` → http://localhost:3000. Next.js hot-reloads code but NOT `.env.local`; restart `npm run dev` after editing env.

Local Supabase ports: API `54321`, Postgres `54322`, Studio `54323`, Mailpit `54324`.

### Why `supabase/seed.sql` exists
Hosted Supabase auto-grants `anon`/`authenticated`/`service_role` table + sequence privileges on `public` via default privileges. The local CLI migration flow does not, so server code using the service role key (all `/api/cards/*` routes) gets `permission denied for table ...`. `supabase/seed.sql` re-applies those grants and runs automatically on `supabase start` / `supabase db reset`. RLS still protects anon/authenticated; `service_role` bypasses RLS by design.

### Known pre-existing quirks (do NOT "fix" as part of unrelated work)
- `GET /api/cards/sync?syncKey=...` returns 500 (`PGRST201` ambiguous embedding) because there are two FKs between `cards` and `operators` (`cards.operator_id` and `operators.dossier_card_id`) and the query uses an unqualified `operators(*)` embed. The POST (create/update) path works fine.
- The `complete_cards` view is granted only to `anon, authenticated` in the migrations; `service_role` access to it comes from `supabase/seed.sql` grants.

### Testing the core Card Sync flow without a browser (no Google OAuth needed)
- Create/submit a card: `POST /api/cards/sync` with header `Authorization: Bearer <CARD_SYNC_API_KEY>` and a JSON body containing `syncKey`, `card`, `operator`, `version` (see `src/app/api/cards/sync/route.ts` for the shape).
- Approve as admin: admin routes (`/api/admin/*`) require a real Supabase user JWT whose `profiles.role = 'admin'`. Provision one by inserting the email into `public.allowed_accounts` (role `admin`, `is_active true`), creating the auth user via the GoTrue admin API (`POST /auth/v1/admin/users` with the service key, `email_confirm: true`) — a trigger creates the approved admin profile — then signing in via `POST /auth/v1/token?grant_type=password` to get an `access_token` for the `Bearer` header.
- Login for `/command/*` in the browser is Google-OAuth only, so it cannot be exercised without configuring Google OAuth in Supabase.

### Auth / Google OAuth
Google is the only interactive login provider. To exercise `/command` via the browser you must configure a Google OAuth provider in Supabase Auth; otherwise use the service-role/admin-API path above for API-level testing.

### Lint
`npm run lint` (`next lint`) prompts interactively to create an ESLint config because none is committed to the repo, so it cannot run non-interactively as-is. `npm run build` succeeds and is the reliable static-check.
