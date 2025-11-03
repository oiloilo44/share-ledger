-- entries 및 entry_history 트랜잭션 함수
set search_path = public;

create or replace function public.create_entry_with_history(
    p_book_id uuid,
    p_user_id uuid,
    p_entry_date date,
    p_description text,
    p_amount numeric,
    p_category text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_entry entries%rowtype;
begin
    insert into public.entries (book_id, user_id, entry_date, description, amount, category)
    values (
        p_book_id,
        p_user_id,
        p_entry_date,
        p_description,
        p_amount,
        nullif(trim(p_category), '')
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

create or replace function public.update_entry_with_history(
    p_entry_id uuid,
    p_book_id uuid,
    p_user_id uuid,
    p_entry_date date,
    p_description text,
    p_amount numeric,
    p_category text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_current entries%rowtype;
    v_updated entries%rowtype;
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

    update public.entries
    set
        entry_date = p_entry_date,
        description = p_description,
        amount = p_amount,
        category = nullif(trim(p_category), '')
    where id = p_entry_id
    returning * into v_updated;

    return to_jsonb(v_updated);
end;
$$;

create or replace function public.delete_entry_with_history(
    p_entry_id uuid,
    p_book_id uuid,
    p_user_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_current entries%rowtype;
begin
    select *
    into v_current
    from public.entries
    where id = p_entry_id
      and book_id = p_book_id
    for update;

    if not found then
        return null;
    end if;

    insert into public.entry_history (entry_id, book_id, changed_by, action_type, snapshot)
    values (
        v_current.id,
        v_current.book_id,
        p_user_id,
        'deleted',
        to_jsonb(v_current)
    );

    delete from public.entries where id = p_entry_id;

    return to_jsonb(v_current);
end;
$$;

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
