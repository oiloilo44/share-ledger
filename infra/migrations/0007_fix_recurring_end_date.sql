-- Migration 0007: Fix end_date behavior for recurring entries
-- 무기한 반복 내역은 end_date가 null이어야 함
set search_path = public;

-- end_date를 nullable로 변경
alter table public.entries
  alter column end_date drop not null;

-- 기존 데이터 수정: 반복 내역에서 end_date = entry_date인 경우 null로 변경
update public.entries
set end_date = null
where frequency != 'once' and end_date = entry_date;

-- 제약 조건 업데이트: once인 경우에만 end_date = entry_date 필수
alter table public.entries
  drop constraint if exists entries_date_range_check;

alter table public.entries
  add constraint entries_date_range_check
    check (
      (frequency = 'once' and end_date = entry_date)
      or (frequency != 'once' and (end_date is null or end_date >= entry_date))
    );

-- create_entry_with_history 함수 수정
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
    -- 단건이면 end_date = entry_date, 반복이면 p_end_date 그대로 사용 (null 가능)
    if p_frequency = 'once' then
        v_computed_end_date := p_entry_date;
    else
        v_computed_end_date := p_end_date;
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

-- update_entry_with_history 함수 수정 (기존 파라미터 순서 유지)
drop function if exists public.update_entry_with_history(uuid,uuid,uuid,date,text,numeric,text,date,text,integer,integer);

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

    -- 단건이면 end_date = entry_date, 반복이면 p_end_date 그대로 사용 (null 가능)
    if p_frequency = 'once' then
        v_computed_end_date := p_entry_date;
    else
        v_computed_end_date := p_end_date;
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
