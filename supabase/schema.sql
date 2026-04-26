-- BudgetCat Phase 2 schema
-- Private household data with row level security.

create extension if not exists "pgcrypto";

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income', 'salary', 'savings', 'goal_contribution')),
  color text,
  icon text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'salary', 'savings', 'goal_contribution')),
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  date date not null default current_date,
  payment_method text not null default 'Cash',
  note text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.due_dates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  due_date date not null,
  repeat_type text not null default 'none' check (repeat_type in ('none', 'weekly', 'monthly', 'yearly')),
  reminder_days integer not null default 3 check (reminder_days >= 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'paid', 'overdue')),
  note text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in ('financial_freedom', 'travel', 'purchase', 'emergency', 'savings', 'investment')
  ),
  title text not null,
  target_amount numeric(12,2) not null check (target_amount >= 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  note text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  date date not null default current_date,
  note text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_household_members_household_id on public.household_members(household_id);
create index if not exists idx_household_members_user_id on public.household_members(user_id);
create index if not exists idx_categories_household_id on public.categories(household_id);
create index if not exists idx_transactions_household_id on public.transactions(household_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_due_dates_household_id on public.due_dates(household_id);
create index if not exists idx_due_dates_due_date on public.due_dates(due_date);
create index if not exists idx_goals_household_id on public.goals(household_id);
create index if not exists idx_goal_contributions_goal_id on public.goal_contributions(goal_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.due_dates enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

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

drop policy if exists "households_insert_own" on public.households;
create policy "households_insert_own"
on public.households
for insert
with check (created_by = auth.uid());

drop policy if exists "households_member_select" on public.households;
create policy "households_member_select"
on public.households
for select
using (public.is_household_member(id) or created_by = auth.uid());

drop policy if exists "households_member_update" on public.households;
create policy "households_member_update"
on public.households
for update
using (public.is_household_member(id) or created_by = auth.uid())
with check (public.is_household_member(id) or created_by = auth.uid());

drop policy if exists "household_members_insert_self" on public.household_members;
create policy "household_members_insert_self"
on public.household_members
for insert
with check (user_id = auth.uid());

drop policy if exists "household_members_member_select" on public.household_members;
create policy "household_members_member_select"
on public.household_members
for select
using (public.is_household_member(household_id) or user_id = auth.uid());

drop policy if exists "household_members_member_update" on public.household_members;
create policy "household_members_member_update"
on public.household_members
for update
using (public.is_household_member(household_id) or user_id = auth.uid())
with check (public.is_household_member(household_id) or user_id = auth.uid());

drop policy if exists "categories_household_access" on public.categories;
create policy "categories_household_access"
on public.categories
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "transactions_household_access" on public.transactions;
create policy "transactions_household_access"
on public.transactions
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "due_dates_household_access" on public.due_dates;
create policy "due_dates_household_access"
on public.due_dates
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "goals_household_access" on public.goals;
create policy "goals_household_access"
on public.goals
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id) and user_id = auth.uid());

drop policy if exists "goal_contributions_household_access" on public.goal_contributions;
create policy "goal_contributions_household_access"
on public.goal_contributions
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id) and user_id = auth.uid());
