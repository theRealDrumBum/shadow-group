# Shadow Group Cardsmith — Custom GPT Setup Guide

This guide walks you through connecting a custom ChatGPT ("GPT") — Shadow Group
Cardsmith, also called Card Forge — to the Shadow Group Card Registry API. The
GPT interviews operators, designs unofficial Magic-style cards, generates art,
and syncs proposed versions. **Only a Shadow Group administrator** can approve a
version and publish it to the public Card Gallery.

Use **Custom GPT Actions** (OpenAPI + Bearer API key). Do not add an MCP server
for this. ChatGPT custom GPTs call HTTP Actions; MCP is a different protocol
used by Cursor/Claude, not by the Cardsmith GPT.

You do **not** need to write code. You do need:

- The deployed site URL (your Vercel domain).
- Access to the Vercel project settings (to set environment variables).
- Access to the Supabase project (to run migrations and copy keys).
- A ChatGPT account that can create GPTs (ChatGPT Plus/Team/Enterprise, or a
  Business plan for Actions).

---

## 1. How the system works (the workflow)

```
Custom GPT ──(Bearer CARD_SYNC_API_KEY)──▶ POST /api/cards/sync
   creates a card OR appends a new version   → status: submitted (never canon)
   optional artworkUrl / artworkBase64        → stored in card-assets
   response.previewUrl                        → shareable visual preview

Custom GPT ──(Bearer CARD_SYNC_API_KEY)──▶ POST /api/cards/sync/assets
   attaches art after the fact                → same previewUrl, updated face

Anyone with previewUrl ──▶ /cards/preview/[token]
   sees the Magic-style card face (not in the public gallery)

Admin ──(signed in on the website)──▶ /command/cards
   Preview the card face, Approve / Request changes / Reject a version
   Approving sets it as the canonical version and publishes it

Custom GPT ──(Bearer CARD_SYNC_API_KEY)──▶ GET /api/cards/sync?syncKey=...
   reads each version's status + review_notes + previewUrl → iterates on rejections

Custom GPT ──▶ GET /api/cards  (listApprovedCards)
   public canon only; use this when the user asks to list the expansion.
   Unapproved work is preview-only until an admin approves it.

Public ──▶ Card Gallery (/cards) shows only approved canonical versions
```

The GPT's configured Actions are this API only. They cannot write a Google
Sheet. Interview facts belong on the sync payload (`facts` / `factsSnapshot`).
An optional human-maintained sheet may back up operator facts; it is not canon
and must not replace `POST /api/cards/sync`.

Key rules the API enforces:

- The sync endpoint can only create `draft`, `generating`, `submitted`, or
  `changes_requested` versions. It **cannot** approve, reject, or archive.
- Approval is a separate, authenticated admin-only action.
- Each card has a stable `sync_key`; re-sending the same `sync_key` appends a new
  version instead of creating a duplicate card.
- The public gallery and `/api/cards*` read endpoints only ever return the
  **approved canonical** version of a card.

---

## 2. Deploy and configure the backend

### 2a. Run the database migrations

Apply everything in `supabase/migrations/` to your Supabase project (in order).
With the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates the `cards`, `card_versions`, `operators`, `expansions`,
`card_assets` tables, the approval workflow, row-level security, and the public
`complete_cards` view used by the gallery.

### 2b. Generate the GPT API key

Create a strong random key the GPT will send on every request:

```bash
openssl rand -hex 32
```

Copy the output — this is your `CARD_SYNC_API_KEY`.

### 2c. Set environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add (Production and
Preview):

| Variable | Where to find it | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Client + server reads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key | Public reads, login |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (keep secret) | Server-side sync + admin |
| `CARD_SYNC_API_KEY` | The value from step 2b | Authenticates the GPT |

> `NEXT_PUBLIC_*` values are embedded at **build time** — after adding them,
> trigger a redeploy so the client picks them up.

Redeploy the project after saving.

Then confirm the production API is actually wired. From a terminal:

```bash
# 1. Auth + Supabase are configured (expect {"ready":true,"configured":true})
curl -sS -H "Authorization: Bearer $CARD_SYNC_API_KEY" \
  https://YOUR-DOMAIN.vercel.app/api/cards/sync

# 2. Lookup a card that does not exist yet (expect {"exists":false,"matches":[]})
curl -sS -H "Authorization: Bearer $CARD_SYNC_API_KEY" \
  "https://YOUR-DOMAIN.vercel.app/api/cards/sync?syncKey=shadow-group:sins:sins-seven-deadly-specialist"
```

- `503` + `CARD_SYNC_API_KEY is not configured` → add the key in Vercel (Production) and redeploy.
- `503` + `Supabase is not configured` → add the three Supabase values and redeploy.
- `401 Unauthorized` → the Bearer token does not match `CARD_SYNC_API_KEY`.
- `200` ready → ChatGPT Actions can be pointed at this URL.

### 2d. Bootstrap the administrator

Admin approval requires a Supabase profile with `role = 'admin'` and
`account_status = 'approved'`. Migration `008` seeds `matt.c.ward@gmail.com` as the
bootstrap admin via the `allowed_accounts` table. To add another admin, insert a
row into `allowed_accounts` with `role = 'admin'`, then have that person sign in
with Google once so their profile is provisioned.

---

## 3. Create the custom GPT

1. Open ChatGPT → **Explore GPTs → Create** (or go to
   <https://chatgpt.com/gpts/editor>).
2. Switch to the **Configure** tab.
3. **Name**: `Shadow Group Cardsmith`.
4. **Description**: `Interviews operators, designs unofficial Magic-style Shadow Group cards, generates art, and syncs them to the website registry for admin approval.`
5. **Instructions**: paste the full contents of
   [`custom-gpt-instructions.md`](./custom-gpt-instructions.md). These tell the
   GPT to lead the operator interview, present three concepts, generate likeness
   art from a face reference, GET before every POST, never claim a card is canon,
   and iterate on `review_notes`.
6. **Knowledge** (optional): upload the file **ShadowGroup - Magic GPT Design
   Reference** if you have it. The instructions tell the GPT to treat it as extra
   set-design rules. It does not replace the Card Sync protocol.
7. **Capabilities**: enable *Image Generation* (required for card art) and *Web Browsing* if you want the GPT to look up reference photos or try to read a shared Google Sheet of operator facts. Do **not** add a Google Sheets Action unless you separately configure one; the Card Registry OpenAPI cannot write Sheets.

---

## 4. Add the Action (connect the API)

1. In the GPT editor, scroll to **Actions → Create new action**.
2. **Authentication → Authentication Type: API Key**
   - **API Key**: paste your `CARD_SYNC_API_KEY`.
   - **Auth Type: Bearer**.
   - Save. (ChatGPT will send `Authorization: Bearer <key>` on every call.)
3. **Schema**: paste the contents of
   [`card-sync-openapi.yaml`](./card-sync-openapi.yaml).
4. **Edit the server URL**: in the pasted schema, change

   ```yaml
   servers:
     - url: https://YOUR-VERCEL-DOMAIN.vercel.app
   ```

   to your real deployed domain (for example
   `https://shadow-group.vercel.app`). This must be the live HTTPS URL — the
   Action cannot call `localhost`.
5. ChatGPT will list the available operations:
   - `findCardInRegistry` — `GET /api/cards/sync` (working versions; call before every POST)
   - `synchronizeCard` — `POST /api/cards/sync`
   - `uploadCardArtwork` — `POST /api/cards/sync/assets`
   - `listApprovedCards` — `GET /api/cards` (public canon; use this to list the expansion)
   - `getRandomApprovedCard` — `GET /api/cards/random`
   - `lookupApprovedCard` — `GET /api/cards/lookup` (approved gallery cards only)

### Test it

Use the **Test** button on `findCardInRegistry` with no parameters first. A `200`
with `{"ready": true, "configured": true}` means the server URL, API key, and
Supabase connection are all working. Then test with a `syncKey` like
`shadow-group:sins:sins-seven-deadly-specialist`. `{"exists": false, "matches": []}`
(or a match) means lookup works. A `401` means the API key is wrong; a `503`
means a Vercel env var is missing; a `404`/`DNS` error means the server URL is
wrong.

Then test `synchronizeCard` with a complete payload that includes
`version.artworkUrl` or `version.artworkBase64`. The response should include
`previewUrl` — open that link to confirm the Magic-style card face renders on
the website. If art is generated after the card exists, test `uploadCardArtwork`
and refresh the same preview URL.

---

## 5. The approval loop (admin + GPT)

1. The GPT submits a card: `POST /api/cards/sync` with `version.status = "submitted"`.
2. An administrator signs in on the website and opens **Command Center →
   Card workflow** (`/command/cards`). Submitted versions show **Approve as
   canon**, **Request changes**, and **Reject** buttons. Notes entered here are
   stored as `review_notes`.
3. Approving sets that version as the card's canonical version, marks the card
   `approved`, and it appears in the public **Card Gallery** (`/cards`).
4. If changes are requested or the card is rejected, the GPT calls
   `GET /api/cards/sync?syncKey=...`, reads each version's `status` and
   `review_notes`, fixes the issues, and `POST`s a new version with the **same**
   `sync_key`.

---

## 6. Distribute the GPT

In the GPT editor → **Share**:

- **Anyone with the link** — good for a small team; anyone with the link can use
  it (and therefore can submit cards through your API).
- **Publish to the GPT Store** — public discovery (requires a verified builder
  profile).

> **Security note:** whoever can use the GPT can submit cards via your API key
> (the key is stored inside the Action, not shown to users). They still cannot
> approve or publish anything — that stays admin-only. If the key is ever
> exposed or misused, generate a new `CARD_SYNC_API_KEY`, update it in Vercel,
> redeploy, and update the Action's API key.

---

## 7. Quick reference

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/cards/sync` | GET | Bearer `CARD_SYNC_API_KEY` | Look up a card + all versions/status/notes/previewUrl |
| `/api/cards/sync` | POST | Bearer `CARD_SYNC_API_KEY` | Create a card or append a proposed version (optional artwork) |
| `/api/cards/sync/assets` | POST | Bearer `CARD_SYNC_API_KEY` | Attach artwork to the current working version |
| `/api/cards` | GET | none (public) | List approved canonical cards |
| `/api/cards/random` | GET | none (public) | One random approved card |
| `/api/cards/lookup` | GET | none (public) | Find approved cards by key/slug/name/callsign |
| `/cards/preview/[token]` | GET | none (secret link) | Visual preview of a specific version |
| `/api/admin/card-versions/{id}/transition` | POST | Bearer admin session JWT | Approve/reject/request changes (admin app only) |

Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CARD_SYNC_API_KEY`, optional `NEXT_PUBLIC_SITE_URL`.

Optional human backup of interview facts (not canon, not writable by these
Actions): the operator-fact Google Sheet linked from
[`custom-gpt-instructions.md`](./custom-gpt-instructions.md). Completed cards
still must go through `POST /api/cards/sync`.
