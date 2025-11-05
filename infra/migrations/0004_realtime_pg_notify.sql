-- 실시간 동기화를 위한 pg_notify RPC 함수 생성
set check_function_bodies = off;
set search_path = public;

-- pg_notify를 Supabase RPC로 호출할 수 있도록 wrapper 함수 생성
create or replace function public.pg_notify(
    channel text,
    payload text
)
returns void
language plpgsql
security definer
as $$
begin
    -- PostgreSQL 내장 pg_notify 함수 호출
    perform pg_notify(channel, payload);
end;
$$;

comment on function public.pg_notify(text, text) is
'Supabase RPC로 호출 가능한 pg_notify wrapper 함수. 실시간 이벤트 발행에 사용됨.';
