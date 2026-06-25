-- ShareLedger 초기 스키마
set check_function_bodies = off;
set search_path = public;

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null unique,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.account_books (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.users (id) on delete cascade,
    name text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_books_owner_idx on public.account_books (owner_id);

create table if not exists public.book_members (
    book_id uuid not null references public.account_books (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    role text not null check (role in ('owner', 'editor')),
    joined_at timestamptz not null default timezone('utc', now()),
    primary key (book_id, user_id)
);

create index if not exists book_members_user_idx on public.book_members (user_id);

create table if not exists public.entries (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.account_books (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    entry_date date not null,
    description text not null,
    amount numeric(14, 2) not null,
    category text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint amount_non_zero check (amount <> 0)
);

create index if not exists entries_book_idx on public.entries (book_id);
create index if not exists entries_user_idx on public.entries (user_id);
create index if not exists entries_date_idx on public.entries (entry_date);

create table if not exists public.entry_history (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid references public.entries (id) on delete set null,
    book_id uuid not null references public.account_books (id) on delete cascade,
    changed_by uuid references public.users (id) on delete set null,
    changed_at timestamptz not null default timezone('utc', now()),
    action_type text not null check (action_type in ('created', 'updated', 'deleted', 'restored')),
    snapshot jsonb not null
);

create index if not exists entry_history_book_idx on public.entry_history (book_id, changed_at desc);

create table if not exists public.recurring_entries (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.account_books (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    description text not null,
    amount numeric(14, 2) not null,
    category text,
    frequency text not null check (frequency in ('monthly', 'weekly')),
    day_of_month int,
    day_of_week int,
    start_date date not null,
    end_date date,
    last_created_date date,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint recurring_amount_non_zero check (amount <> 0),
    constraint recurring_date_range check (end_date is null or end_date >= start_date),
    constraint recurring_schedule_valid check (
        (frequency = 'monthly' and day_of_month between 1 and 31 and day_of_week is null)
        or (frequency = 'weekly' and day_of_week between 0 and 6 and day_of_month is null)
    )
);

create index if not exists recurring_entries_book_idx on public.recurring_entries (book_id);
create index if not exists recurring_entries_user_idx on public.recurring_entries (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create or replace function public.enforce_book_limits()
returns trigger
language plpgsql
as $$
declare
    owned_count integer;
begin
    select count(*) into owned_count
    from public.account_books
    where owner_id = new.owner_id
    and (tg_op <> 'UPDATE' or id <> new.id);

    if owned_count >= 5 then
        raise exception '사용자는 최대 5개의 가계부만 생성할 수 있습니다.'
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

create or replace function public.enforce_member_limits()
returns trigger
language plpgsql
as $$
declare
    membership_count integer;
begin
    select count(*) into membership_count
    from public.book_members
    where user_id = new.user_id
    and (tg_op <> 'UPDATE' or book_id <> new.book_id);

    if membership_count >= 5 then
        raise exception '사용자는 최대 5개의 공유 가계부에만 참여할 수 있습니다.'
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

create or replace function public.prune_entry_history()
returns trigger
language plpgsql
as $$
begin
    delete from public.entry_history
    where id in (
        select id
        from public.entry_history
        where book_id = new.book_id
        order by changed_at desc, id desc
        offset 100
    );

    return new;
end;
$$;

create or replace function public.check_recurring_conflict()
returns trigger
language plpgsql
as $$
declare
    conflict_exists boolean;
begin
    select exists (
        select 1
        from public.recurring_entries re
        where re.book_id = new.book_id
          and re.frequency = new.frequency
          and coalesce(re.description, '') = coalesce(new.description, '')
          and coalesce(re.category, '') = coalesce(new.category, '')
          and daterange(re.start_date, coalesce(re.end_date, 'infinity'::date), '[]')
              && daterange(new.start_date, coalesce(new.end_date, 'infinity'::date), '[]')
          and (
              (new.frequency = 'monthly' and re.day_of_month = new.day_of_month)
              or (new.frequency = 'weekly' and re.day_of_week = new.day_of_week)
          )
          and (tg_op = 'INSERT' or re.id <> new.id)
    ) into conflict_exists;

    if conflict_exists then
        raise exception '동일한 주기로 중복되는 반복 내역이 이미 존재합니다.'
            using errcode = 'unique_violation';
    end if;

    return new;
end;
$$;

drop trigger if exists set_timestamp_on_users on public.users;
create trigger set_timestamp_on_users
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_timestamp_on_account_books on public.account_books;
create trigger set_timestamp_on_account_books
before update on public.account_books
for each row
execute function public.set_updated_at();

drop trigger if exists set_timestamp_on_entries on public.entries;
create trigger set_timestamp_on_entries
before update on public.entries
for each row
execute function public.set_updated_at();

drop trigger if exists set_timestamp_on_recurring_entries on public.recurring_entries;
create trigger set_timestamp_on_recurring_entries
before update on public.recurring_entries
for each row
execute function public.set_updated_at();

drop trigger if exists enforce_book_limit_trigger on public.account_books;
create trigger enforce_book_limit_trigger
before insert or update of owner_id on public.account_books
for each row
execute function public.enforce_book_limits();

drop trigger if exists enforce_member_limit_trigger on public.book_members;
create trigger enforce_member_limit_trigger
before insert or update of user_id on public.book_members
for each row
execute function public.enforce_member_limits();

drop trigger if exists prune_entry_history_trigger on public.entry_history;
create trigger prune_entry_history_trigger
after insert on public.entry_history
for each row
execute function public.prune_entry_history();

drop trigger if exists check_recurring_conflict_trigger on public.recurring_entries;
create trigger check_recurring_conflict_trigger
before insert or update on public.recurring_entries
for each row
execute function public.check_recurring_conflict();
