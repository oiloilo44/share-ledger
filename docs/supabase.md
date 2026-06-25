# Supabase Setup

ShareLedger는 Supabase Auth와 Postgres를 사용합니다. 공개 저장소에는 실제 프로젝트 ID, 조직 ID, URL, 키를 포함하지 않습니다.

## Required Values

Backend:

- `SHARELEDGER_SUPABASE_URL`
- `SHARELEDGER_SUPABASE_SERVER_KEY`
- `SHARELEDGER_CORS_ORIGINS`

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

## Notes

- service role key는 서버에서만 사용합니다.
- 클라이언트에는 anon key만 노출합니다.
- 실환경 연동 테스트는 별도 Supabase 프로젝트를 만든 뒤 로컬 `.env`에서만 값을 주입합니다.
