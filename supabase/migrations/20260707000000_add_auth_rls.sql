-- Replace Phase 1 anon-open policies with auth-required policies.
-- Any authenticated user has full access — single-admin Phase 1 setup.
-- Phase 2 will narrow these to per-user scopes.

drop policy "phase1_anon_full_access" on class_slots;
drop policy "phase1_anon_full_access" on class_instances;
drop policy "phase1_anon_full_access" on clients;
drop policy "phase1_anon_full_access" on client_recurring_slots;
drop policy "phase1_anon_full_access" on sessions;
drop policy "phase1_anon_full_access" on invoices;
drop policy "phase1_anon_full_access" on settings;

create policy "authenticated_full_access" on class_slots             for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on class_instances          for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on clients                  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on client_recurring_slots   for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on sessions                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on invoices                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated_full_access" on settings                 for all using (auth.uid() is not null) with check (auth.uid() is not null);
