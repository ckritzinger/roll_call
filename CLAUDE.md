# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Barbara's Studio Billing Tracker — mobile-first Nuxt 4 app for a Pilates studio owner to log client sessions and generate monthly invoices. Phase 1 (current build) is admin-only, unauthenticated, single-user. Full requirements/data model: `spec.md` (and `prompts/base.md`, an earlier draft of the same spec — `spec.md` is the source of truth where they diverge, e.g. it adds `ClassInstance` and per-client multiple recurring slots).

## Commands

```bash
npm run dev       # start dev server (http://localhost:3000)
npm run build     # production build
npm run generate  # static generate
npm run preview   # preview production build locally
```

No test suite or lint script is configured yet.

Supabase (local schema workflow):
```bash
supabase db push          # apply supabase/migrations/*.sql to the linked project
```
Migrations live in `supabase/migrations/`; `supabase/schema.sql` is the full schema reference (matches the latest migration). When changing the schema, add a new migration file rather than editing old ones, and keep `schema.sql` in sync.

## Architecture

**Stack**: Nuxt 4 (Vue 3, `app/` source dir) + `@nuxtjs/supabase` + Tailwind. No Pinia/state library — pages talk to `useSupabaseClient()` directly and hold local `ref` state.

**Auth**: intentionally disabled for Phase 1. `nuxt.config.ts` sets `supabase.redirectOptions.exclude: ['*']` so the module's login redirect never fires. Supabase RLS policies (`supabase/schema.sql`) grant the anon key full read/write on every table — this is deliberate for an unauthenticated single-admin tool and is documented in the schema comments as something that **must** change before Phase 2 (client-facing booking) ships.

**Data model** (see `supabase/schema.sql` for full DDL):
- `class_slots` — recurring weekly templates (name, location, day, time, capacity).
- `class_instances` — one dated occurrence of a slot. Time/location/capacity are denormalized from the slot at creation time so a single instance can be overridden later without mutating the recurring template. Unique on `(class_slot_id, date)`.
- `clients` — billing rate is a flat manual number per client (`rate`), plus `scale_enabled` (dormant R100/month line item toggle).
- `client_recurring_slots` — join table; a client can have multiple standing weekly classes (spec originally modeled this as a single `recurring` object on Client — the schema generalizes it to a table instead).
- `sessions` — one client's attendance for one class_instance. `amount` snapshots `client.rate` at creation time so later rate edits don't retroactively reprice already-logged/invoiced sessions. Unique on `(client_id, class_instance_id)`.
- `invoices` — `line_items`/`scale_line_item` stored as JSONB snapshots, not derived live, so invoice history survives edits to clients/sessions.
- `settings` — singleton row (`id boolean primary key default true`) for studio name, banking details, and the never-reset/never-reused `invoice_counter`.

**Week generation** (`app/composables/useWeekGeneration.ts`) is the core scheduling logic, run on every Dashboard mount (`app/pages/index.vue` `onMounted`):
1. `generateCurrentWeekData()` walks every active client's `client_recurring_slots`, finds-or-creates the `class_instance` for that slot+date via `findOrCreateClassInstance`, then finds-or-creates the `session` row (default `status: 'attended'`).
2. Duplication is prevented both in application logic (select-before-insert) and backstopped by DB unique constraints — `findOrCreateClassInstance` explicitly handles the race where a concurrent insert wins, by re-fetching instead of erroring.
3. The studio week is Monday–Saturday (`getCurrentWeekRange`), not Sunday-start — this affects any date-range logic touching sessions/instances.

**Money rules** (from spec, not yet fully implemented in code — check before assuming a view exists):
- Knysna/Robin ledger: every *attended* session where client location is Knysna or Both contributes R40/month, deduped per unique (date, time) session (not per client) — read-only, calculated on the fly, never stored.
- Scale line item: flat R100/month per client with `scale_enabled = true`, regardless of session count, appended last on the invoice.
- Invoice numbers: `INV-` + zero-padded sequential integer from `settings.invoice_counter`, incremented on generation, never reused even if an invoice is later deleted.

**Pages built so far**: `/` (Dashboard), `/clients`, `/class-slots`, `/session-log`. Spec also calls for `/invoices` and a Robin Ledger view — these don't exist yet as of this writing; don't assume the route exists without checking `app/pages/`.

**Print CSS**: invoice view is meant to be printable via browser print with nav/chrome hidden using `print:hidden` Tailwind utilities (see `app/layouts/default.vue` for the existing pattern on header/nav).

## Phase 2 awareness

Phase 2 (future, not in scope) adds client-facing self-booking with Barbara confirming. Any schema or auth decision should avoid foreclosing this — e.g. RLS is wide-open by explicit Phase-1-only design, not by oversight; tightening it is expected, not a "fix".
