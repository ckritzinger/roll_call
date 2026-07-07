-- Barbara's Studio Billing Tracker — Phase 1 schema
-- Run in Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────
-- class_slots: recurring weekly templates (e.g. "Sedgefield Group Mon")
-- ──────────────────────────────────────────────────────────────────
create table class_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null check (location in ('Sedgefield', 'Knysna')),
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  time time not null,
  capacity int not null check (capacity > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- class_instances: one dated occurrence of a class_slot
-- time/location/capacity are denormalized from the slot at creation
-- time so a single instance can be overridden later without mutating
-- the recurring template.
-- ──────────────────────────────────────────────────────────────────
create table class_instances (
  id uuid primary key default gen_random_uuid(),
  class_slot_id uuid not null references class_slots(id),
  date date not null,
  time time not null,
  location text not null check (location in ('Sedgefield', 'Knysna')),
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now(),
  unique (class_slot_id, date) -- business rule 2: no duplicate instance per slot+date
);

-- ──────────────────────────────────────────────────────────────────
-- clients
-- ──────────────────────────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null check (location in ('Sedgefield', 'Knysna', 'Both', 'Zoom')),
  service_type text not null check (service_type in ('Group', 'Private', 'Both', 'Duet', 'Zoom')),
  rate numeric(10, 2) not null check (rate >= 0),
  scale_enabled boolean not null default false,
  currency text not null default 'ZAR' check (currency in ('ZAR', 'USD', 'CAD')),
  month_rate numeric(10, 2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- client_recurring_slots: a client may have several standing weekly
-- classes (decided against spec's single-object `recurring` field).
create table client_recurring_slots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  class_slot_id uuid not null references class_slots(id),
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  time time not null,
  created_at timestamptz not null default now(),
  unique (client_id, class_slot_id)
);

-- ──────────────────────────────────────────────────────────────────
-- sessions: one client's attendance record for one class_instance
-- amount snapshots client.rate at creation time so later rate edits
-- don't retroactively reprice already-logged/invoiced sessions.
-- ──────────────────────────────────────────────────────────────────
create table sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  class_instance_id uuid not null references class_instances(id),
  date date not null,
  status text not null default 'attended' check (status in ('attended', 'absent', 'excused')),
  is_recurring boolean not null default false,
  amount numeric(10, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (client_id, class_instance_id) -- business rule 2: no duplicate session per client+instance
);

-- ──────────────────────────────────────────────────────────────────
-- invoices
-- ──────────────────────────────────────────────────────────────────
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique, -- INV-0001, sequential, never reused
  client_id uuid not null references clients(id),
  month text not null, -- YYYY-MM
  line_items jsonb not null default '[]', -- [{ date, description, amount }]
  scale_line_item jsonb, -- { description, amount } | null
  total numeric(10, 2) not null,
  issued_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- settings: singleton row
-- ──────────────────────────────────────────────────────────────────
create table settings (
  id boolean primary key default true check (id), -- enforces single row
  studio_name text not null default '',
  banking_details text not null default '',
  invoice_counter integer not null default 0
);
insert into settings (id) values (true);

-- ──────────────────────────────────────────────────────────────────
-- Row Level Security
-- Any authenticated user has full read/write access — single-admin
-- Phase 1 setup. Phase 2 will narrow these to per-user scopes.
-- ──────────────────────────────────────────────────────────────────
alter table class_slots enable row level security;
alter table class_instances enable row level security;
alter table clients enable row level security;
alter table client_recurring_slots enable row level security;
alter table sessions enable row level security;
alter table invoices enable row level security;
alter table settings enable row level security;

create policy "authenticated_full_access" on class_slots             for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on class_instances          for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on clients                  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on client_recurring_slots   for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on sessions                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on invoices                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on settings                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
