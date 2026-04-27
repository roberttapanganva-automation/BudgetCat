-- Run this manually in Supabase SQL Editor after reviewing.
-- BudgetCat Phase 7 goals RLS repair.
-- This keeps RLS enabled and limits goal access to authenticated household members
-- whose synced row user_id matches auth.uid().

alter table public.goals enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "phase7_goals_select_household" on public.goals;
create policy "phase7_goals_select_household"
on public.goals
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "phase7_goals_insert_household_owner" on public.goals;
create policy "phase7_goals_insert_household_owner"
on public.goals
for insert
to authenticated
with check (
  public.is_household_member(household_id)
  and user_id = auth.uid()
);

drop policy if exists "phase7_goals_update_household_owner" on public.goals;
create policy "phase7_goals_update_household_owner"
on public.goals
for update
to authenticated
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and user_id = auth.uid()
);

drop policy if exists "phase7_goals_delete_household_owner" on public.goals;
create policy "phase7_goals_delete_household_owner"
on public.goals
for delete
to authenticated
using (
  public.is_household_member(household_id)
  and user_id = auth.uid()
);
