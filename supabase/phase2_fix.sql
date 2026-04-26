-- Run this manually in Supabase SQL Editor after reviewing.
-- BudgetCat Phase 2 auth/sync compatibility patch.
-- This file only adds missing columns and widens app-level check constraints.
-- It does not delete data, drop tables, disable RLS, or use service-role access.

alter table public.households
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.household_members
  add column if not exists email text,
  add column if not exists role text not null default 'member',
  add column if not exists updated_at timestamptz not null default now();

alter table public.transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists type text,
  add column if not exists amount numeric(12,2),
  add column if not exists category text,
  add column if not exists payment_method text,
  add column if not exists date date,
  add column if not exists transaction_date date,
  add column if not exists note text,
  add column if not exists notes text,
  add column if not exists title text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.goals
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists title text,
  add column if not exists type text,
  add column if not exists goal_type text not null default 'savings',
  add column if not exists target_amount numeric(12,2),
  add column if not exists current_amount numeric(12,2) not null default 0,
  add column if not exists target_date date,
  add column if not exists priority text not null default 'medium',
  add column if not exists status text not null default 'active',
  add column if not exists note text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.due_dates
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists title text,
  add column if not exists amount numeric(12,2),
  add column if not exists due_date date,
  add column if not exists repeat_type text,
  add column if not exists reminder_days integer[],
  add column if not exists status text,
  add column if not exists note text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.goal_contributions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists goal_id uuid references public.goals(id) on delete cascade,
  add column if not exists amount numeric(12,2),
  add column if not exists date date,
  add column if not exists contribution_date date,
  add column if not exists note text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('expense', 'income', 'salary', 'savings', 'goal_contribution'));

alter table public.goals drop constraint if exists goals_type_check;
alter table public.goals
  add constraint goals_type_check
  check (
    type is null or
    type in ('financial_freedom', 'travel', 'purchase', 'emergency', 'savings', 'investment')
  );

alter table public.goals drop constraint if exists goals_goal_type_check;
alter table public.goals
  add constraint goals_goal_type_check
  check (
    goal_type in ('financial_freedom', 'travel', 'purchase', 'emergency', 'savings', 'investment')
  );

alter table public.due_dates drop constraint if exists due_dates_repeat_type_check;
alter table public.due_dates
  add constraint due_dates_repeat_type_check
  check (repeat_type is null or repeat_type in ('none', 'weekly', 'monthly', 'yearly'));

alter table public.due_dates drop constraint if exists due_dates_status_check;
alter table public.due_dates
  add constraint due_dates_status_check
  check (status is null or status in ('upcoming', 'paid', 'overdue'));

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.due_dates enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
