-- 반복 내역 범위 저장 방식 구현
-- entries 테이블에 반복 정보 통합, 프론트엔드에서 전개하는 방식으로 변경
set search_path = public;

-- entries 테이블에 반복 내역 필드 추가
alter table public.entries
  add column if not exists end_date date,
  add column if not exists frequency text default 'once',
  add column if not exists day_of_month integer,
  add column if not exists day_of_week integer;

-- frequency 제약 조건 추가
alter table public.entries
  add constraint entries_frequency_check
    check (frequency in ('once', 'monthly', 'weekly'));

-- 반복 스케줄 유효성 제약 조건 추가
alter table public.entries
  add constraint entries_schedule_valid
    check (
      (frequency = 'once')
      or (frequency = 'monthly' and day_of_month between 1 and 31 and day_of_week is null)
      or (frequency = 'weekly' and day_of_week between 0 and 6 and day_of_month is null)
    );

-- 날짜 범위 제약 조건 추가
alter table public.entries
  add constraint entries_date_range_check
    check (end_date is null or end_date >= entry_date);

-- 기존 데이터 마이그레이션 (단건은 end_date = entry_date)
update public.entries
set
  end_date = entry_date,
  frequency = 'once'
where end_date is null;

-- end_date를 NOT NULL로 설정
alter table public.entries
  alter column end_date set not null;

-- 인덱스 추가 (범위 쿼리 최적화)
create index if not exists idx_entries_date_range
  on public.entries (book_id, entry_date, end_date);

create index if not exists idx_entries_frequency
  on public.entries (book_id, frequency);

-- create_entry_with_history 함수 업데이트 (반복 정보 파라미터 추가)
create or replace function public.create_entry_with_history(
    p_book_id uuid,
    p_user_id uuid,
    p_entry_date date,
    p_description text,
    p_amount numeric,
    p_category text default null,
    p_end_date date default null,
    p_frequency text default 'once',
    p_day_of_month integer default null,
    p_day_of_week integer default null
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_entry entries%rowtype;
    v_computed_end_date date;
begin
    -- 단건이면 end_date = entry_date
    if p_frequency = 'once' then
        v_computed_end_date := p_entry_date;
    else
        v_computed_end_date := coalesce(p_end_date, p_entry_date);
    end if;

    insert into public.entries (
        book_id,
        user_id,
        entry_date,
        description,
        amount,
        category,
        end_date,
        frequency,
        day_of_month,
        day_of_week
    )
    values (
        p_book_id,
        p_user_id,
        p_entry_date,
        p_description,
        p_amount,
        nullif(trim(p_category), ''),
        v_computed_end_date,
        p_frequency,
        p_day_of_month,
        p_day_of_week
    )
    returning * into v_entry;

    insert into public.entry_history (entry_id, book_id, changed_by, action_type, snapshot)
    values (
        v_entry.id,
        v_entry.book_id,
        p_user_id,
        'created',
        to_jsonb(v_entry)
    );

    return to_jsonb(v_entry);
end;
$$;

-- update_entry_with_history 함수 업데이트 (반복 정보 파라미터 추가)
create or replace function public.update_entry_with_history(
    p_entry_id uuid,
    p_book_id uuid,
    p_user_id uuid,
    p_entry_date date,
    p_description text,
    p_amount numeric,
    p_category text default null,
    p_end_date date default null,
    p_frequency text default 'once',
    p_day_of_month integer default null,
    p_day_of_week integer default null
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_current entries%rowtype;
    v_updated entries%rowtype;
    v_computed_end_date date;
begin
    select *
    into v_current
    from public.entries
    where id = p_entry_id
      and book_id = p_book_id
    for update;

    if not found then
        raise exception '존재하지 않는 내역입니다.'
            using errcode = 'P0002';
    end if;

    insert into public.entry_history (entry_id, book_id, changed_by, action_type, snapshot)
    values (
        v_current.id,
        v_current.book_id,
        p_user_id,
        'updated',
        to_jsonb(v_current)
    );

    -- 단건이면 end_date = entry_date
    if p_frequency = 'once' then
        v_computed_end_date := p_entry_date;
    else
        v_computed_end_date := coalesce(p_end_date, p_entry_date);
    end if;

    update public.entries
    set
        entry_date = p_entry_date,
        description = p_description,
        amount = p_amount,
        category = nullif(trim(p_category), ''),
        end_date = v_computed_end_date,
        frequency = p_frequency,
        day_of_month = p_day_of_month,
        day_of_week = p_day_of_week
    where id = p_entry_id
    returning * into v_updated;

    return to_jsonb(v_updated);
end;
$$;

-- restore_entry_from_history 함수 업데이트 (반복 정보 복원)
create or replace function public.restore_entry_from_history(
    p_history_id uuid,
    p_user_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_history record;
    v_snapshot jsonb;
    v_entry_id uuid;
    v_book_id uuid;
    v_existing entries%rowtype;
    v_restored entries%rowtype;
    v_entry_date date;
    v_amount numeric;
    v_category text;
    v_end_date date;
    v_frequency text;
    v_day_of_month integer;
    v_day_of_week integer;
begin
    select id, book_id, entry_id, action_type, snapshot
    into v_history
    from public.entry_history
    where id = p_history_id;

    if not found then
        raise exception '존재하지 않는 히스토리 항목입니다.'
            using errcode = 'P0002';
    end if;

    v_snapshot := v_history.snapshot;
    v_entry_id := coalesce((v_snapshot ->> 'id')::uuid, v_history.entry_id);
    v_book_id := (v_snapshot ->> 'book_id')::uuid;
    v_entry_date := (v_snapshot ->> 'entry_date')::date;
    v_amount := (v_snapshot ->> 'amount')::numeric;
    v_category := nullif(trim(v_snapshot ->> 'category'), '');
    v_end_date := coalesce((v_snapshot ->> 'end_date')::date, v_entry_date);
    v_frequency := coalesce(v_snapshot ->> 'frequency', 'once');
    v_day_of_month := (v_snapshot ->> 'day_of_month')::integer;
    v_day_of_week := (v_snapshot ->> 'day_of_week')::integer;

    if v_entry_id is null then
        raise exception '복원에 필요한 내역 ID가 없습니다.'
            using errcode = '22023';
    end if;

    if v_entry_date is null or v_amount is null then
        raise exception '복원에 필요한 데이터가 부족합니다.'
            using errcode = '22023';
    end if;

    select *
    into v_existing
    from public.entries
    where id = v_entry_id
    for update;

    if not found then
        insert into public.entries (
            id,
            book_id,
            user_id,
            entry_date,
            description,
            amount,
            category,
            end_date,
            frequency,
            day_of_month,
            day_of_week,
            created_at,
            updated_at
        )
        values (
            v_entry_id,
            v_book_id,
            coalesce((v_snapshot ->> 'user_id')::uuid, p_user_id),
            v_entry_date,
            coalesce(v_snapshot ->> 'description', ''),
            v_amount,
            v_category,
            v_end_date,
            v_frequency,
            v_day_of_month,
            v_day_of_week,
            coalesce((v_snapshot ->> 'created_at')::timestamptz, timezone('utc', now())),
            timezone('utc', now())
        )
        returning * into v_restored;
    else
        update public.entries
        set
            entry_date = v_entry_date,
            description = coalesce(v_snapshot ->> 'description', v_existing.description),
            amount = v_amount,
            category = v_category,
            end_date = v_end_date,
            frequency = v_frequency,
            day_of_month = v_day_of_month,
            day_of_week = v_day_of_week,
            user_id = coalesce((v_snapshot ->> 'user_id')::uuid, v_existing.user_id)
        where id = v_entry_id
        returning * into v_restored;
    end if;

    insert into public.entry_history (entry_id, book_id, changed_by, action_type, snapshot)
    values (
        v_restored.id,
        v_restored.book_id,
        p_user_id,
        'restored',
        to_jsonb(v_restored)
    );

    return to_jsonb(v_restored);
end;
$$;
