-- Production security baseline. Run after 001_inventory_sessions.sql.
-- The policies intentionally use authenticated users; the current public-access
-- policies from migration 001 are removed here.

alter table public.inventory_sessions enable row level security;
alter table public.inventory_counts enable row level security;

drop policy if exists inventory_sessions_public_access on public.inventory_sessions;
drop policy if exists inventory_counts_public_access on public.inventory_counts;

drop policy if exists inventory_sessions_authenticated on public.inventory_sessions;
create policy inventory_sessions_authenticated on public.inventory_sessions
for all to authenticated
using (true) with check (true);

drop policy if exists inventory_counts_authenticated on public.inventory_counts;
create policy inventory_counts_authenticated on public.inventory_counts
for all to authenticated
using (true) with check (true);

-- Prevent completed sessions from being edited accidentally.
create or replace function public.prevent_completed_inventory_session_edit()
returns trigger language plpgsql as $$
begin
  if old.status = 'completed' and (
    new.name is distinct from old.name or
    new.comparison_scope is distinct from old.comparison_scope or
    new.status is distinct from old.status
  ) then
    raise exception 'Completed inventory sessions are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_sessions_immutable on public.inventory_sessions;
create trigger inventory_sessions_immutable
before update on public.inventory_sessions
for each row execute function public.prevent_completed_inventory_session_edit();

-- Counts can be changed while a session is draft. Once completed, lock them.
create or replace function public.prevent_completed_inventory_count_edit()
returns trigger language plpgsql as $$
declare session_status text;
begin
  select status into session_status from public.inventory_sessions where id = coalesce(new.session_id, old.session_id);
  if session_status = 'completed' then
    raise exception 'Counts of a completed inventory session are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists inventory_counts_immutable on public.inventory_counts;
create trigger inventory_counts_immutable
before insert or update or delete on public.inventory_counts
for each row execute function public.prevent_completed_inventory_count_edit();
