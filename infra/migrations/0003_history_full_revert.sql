-- 히스토리 복원 시 전체 가계부 상태를 지정 시점으로 되돌리기 위한 함수 개선
set search_path = public;

create or replace function public.upsert_entry_from_snapshot(
    p_snapshot jsonb,
    p_fallback_user_id uuid
) returns public.entries
language plpgsql
security definer
as $$
declare
    v_entry public.entries%rowtype;
    v_entry_id uuid;
    v_book_id uuid;
    v_user_id uuid;
    v_entry_date date;
    v_amount numeric;
    v_category text;
    v_created_at timestamptz;
    v_updated_at timestamptz;
begin
    if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
        raise exception '복원에 필요한 데이터가 없습니다.'
            using errcode = '22023';
    end if;

    v_entry_id := (p_snapshot ->> 'id')::uuid;
    if v_entry_id is null then
        raise exception '복원에 필요한 내역 ID가 없습니다.'
            using errcode = '22023';
    end if;

    v_book_id := (p_snapshot ->> 'book_id')::uuid;
    if v_book_id is null then
        raise exception '복원에 필요한 가계부 ID가 없습니다.'
            using errcode = '22023';
    end if;

    v_user_id := coalesce((p_snapshot ->> 'user_id')::uuid, p_fallback_user_id);
    if v_user_id is null then
        raise exception '복원에 필요한 사용자 ID가 없습니다.'
            using errcode = '22023';
    end if;

    v_entry_date := (p_snapshot ->> 'entry_date')::date;
    if v_entry_date is null then
        raise exception '복원에 필요한 날짜가 없습니다.'
            using errcode = '22023';
    end if;

    v_amount := (p_snapshot ->> 'amount')::numeric;
    if v_amount is null then
        raise exception '복원에 필요한 금액이 없습니다.'
            using errcode = '22023';
    end if;

    v_category := nullif(trim(coalesce(p_snapshot ->> 'category', '')), '');
    v_created_at := coalesce((p_snapshot ->> 'created_at')::timestamptz, timezone('utc', now()));
    v_updated_at := coalesce((p_snapshot ->> 'updated_at')::timestamptz, timezone('utc', now()));

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
        v_user_id,
        v_entry_date,
        coalesce(p_snapshot ->> 'description', ''),
        v_amount,
        v_category,
        v_created_at,
        v_updated_at
    )
    on conflict (id) do update
    set
        book_id = excluded.book_id,
        user_id = excluded.user_id,
        entry_date = excluded.entry_date,
        description = excluded.description,
        amount = excluded.amount,
        category = excluded.category,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    returning * into v_entry;

    return v_entry;
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
    v_restored public.entries%rowtype;
    v_state_json jsonb;
    v_states jsonb[] := array[]::jsonb[];
    v_upsert_ids uuid[] := array[]::uuid[];
    v_state_entry_id uuid;
    v_state_action text;
    v_state_snapshot jsonb;
begin
    select id, book_id, entry_id, action_type, snapshot, changed_at
    into v_history
    from public.entry_history
    where id = p_history_id;

    if not found then
        raise exception '존재하지 않는 히스토리 항목입니다.'
            using errcode = 'P0002';
    end if;

    v_snapshot := v_history.snapshot;
    if v_snapshot is null then
        raise exception '복원에 필요한 스냅샷이 없습니다.'
            using errcode = '22023';
    end if;

    v_entry_id := coalesce((v_snapshot ->> 'id')::uuid, v_history.entry_id);
    if v_entry_id is null then
        raise exception '복원에 필요한 내역 ID가 없습니다.'
            using errcode = '22023';
    end if;

    v_book_id := (v_snapshot ->> 'book_id')::uuid;
    if v_book_id is null then
        v_book_id := v_history.book_id;
    end if;

    -- 복원 대상 시점(포함)까지의 최신 스냅샷을 항목별로 수집
    for v_state_json in
        select jsonb_build_object(
            'entry_id',
            entry_state.entry_id,
            'action_type',
            entry_state.action_type,
            'snapshot',
            entry_state.snapshot
        )
        from (
            select distinct on (coalesce(h.entry_id, (h.snapshot ->> 'id')::uuid))
                coalesce(h.entry_id, (h.snapshot ->> 'id')::uuid) as entry_id,
                h.action_type,
                h.snapshot
            from public.entry_history h
            where h.book_id = v_book_id
              and (
                  h.changed_at < v_history.changed_at
                  or (h.changed_at = v_history.changed_at and h.id <= v_history.id)
              )
            order by coalesce(h.entry_id, (h.snapshot ->> 'id')::uuid), h.changed_at desc, h.id desc
        ) as entry_state
    loop
        v_states := array_append(v_states, v_state_json);
    end loop;

    -- 대상 시점에 존재해야 하는 항목을 모두 복구
    if v_states is not null and array_length(v_states, 1) is not null then
        foreach v_state_json in array v_states loop
            v_state_entry_id := (v_state_json ->> 'entry_id')::uuid;
            v_state_action := v_state_json ->> 'action_type';
            v_state_snapshot := v_state_json -> 'snapshot';

            if v_state_entry_id is null then
                continue;
            end if;

            if v_state_snapshot is null then
                continue;
            end if;

            perform public.upsert_entry_from_snapshot(v_state_snapshot, p_user_id);
            v_upsert_ids := array_append(v_upsert_ids, v_state_entry_id);
        end loop;
    end if;

    -- 대상 시점에 존재하지 않는 항목 제거
    if v_upsert_ids is null or array_length(v_upsert_ids, 1) is null then
        delete from public.entries where book_id = v_book_id;
    else
        delete from public.entries
        where book_id = v_book_id
          and not (id = any(v_upsert_ids));
    end if;

    select *
    into v_restored
    from public.entries
    where id = v_entry_id
    limit 1;

    if not found then
        raise exception '복원 가능한 내역이 없습니다.'
            using errcode = 'P0002';
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
