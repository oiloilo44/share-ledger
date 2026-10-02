# Supabase 개발 환경 설정

ShareLedger는 Supabase Auth와 PostgreSQL을 사용합니다. 공개 저장소에는 실제 프로젝트 URL이나 키가 필요하지 않으며, 로컬 `.env`는 Git에서 제외합니다.

## 1. 개발 프로젝트와 스키마

운영 데이터가 없는 별도의 Supabase 프로젝트를 준비합니다. SQL Editor에서 다음 파일을 번호 순서대로 한 번씩 실행합니다.

1. `infra/migrations/0001_init.sql`: 사용자, 장부, 멤버, 거래, 이력의 초기 스키마
2. `infra/migrations/0002_entry_history_rpc.sql`: 거래와 이력 처리 함수
3. `infra/migrations/0003_history_full_revert.sql`: 이력 복원 함수
4. `infra/migrations/0004_realtime_pg_notify.sql`: 알림용 RPC
5. `infra/migrations/0005_recurring_range_based.sql`: 거래 테이블에 반복 필드 통합
6. `infra/migrations/0006_remove_recurring_entries.sql`: 이전 반복 테이블 삭제
7. `infra/migrations/0007_fix_recurring_end_date.sql`: 종료일 없는 반복 지원

이 스크립트들은 기존 DB를 안전하게 초기화하는 명령이 아닙니다. `0006`은 이전 반복 테이블의 데이터를 삭제하며, 현재 SQL에는 RLS 정책이나 RPC 실행 권한 제한이 없습니다. 실제 개인정보와 금융 데이터는 저장하지 마세요.

## 2. 환경 변수

저장소 루트에서 예제를 복사합니다.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend

```dotenv
SHARELEDGER_ENVIRONMENT=development
SHARELEDGER_SUPABASE_URL=https://your-project.supabase.co
SHARELEDGER_SUPABASE_SERVER_KEY=your-server-only-service-role-key
SHARELEDGER_CORS_ORIGINS='["http://localhost:5173"]'
```

서버 키는 백엔드에만 둡니다. 백엔드는 실행 디렉터리의 `.env`를 읽으므로 `backend/`에서 시작합니다.

### Frontend

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_API_URL=http://localhost:8000
```

프런트엔드에는 같은 프로젝트의 anon key만 넣습니다. `VITE_` 변수는 빌드 결과에 포함되므로 비밀 값을 저장하면 안 됩니다. 값을 바꾼 뒤에는 개발 서버를 다시 시작합니다.

## 3. Auth 설정

- 로컬 앱 주소는 `http://localhost:5173`입니다. 이메일 확인·OAuth 반환 주소로 사용할 수 있도록 Supabase Auth의 Site URL과 Redirect URLs를 설정합니다.
- 비밀번호 재설정은 `http://localhost:5173/reset-password`로 돌아오므로 해당 주소도 허용 목록에 추가합니다.
- 이메일 확인이 활성화되어 있으면 가입 후 확인 메일을 처리해야 로그인할 수 있습니다.
- Google/Kakao 로그인 버튼은 공급자 설정이 끝난 프로젝트에서만 동작합니다. 기본 개발 확인에는 이메일·비밀번호 로그인을 사용할 수 있습니다.

멤버 추가는 `public.users`의 이메일을 찾는 방식이며 초대 메일을 보내지 않습니다. 현재 코드에서는 장부를 생성할 때 프로필이 동기화됩니다. 두 계정으로 공유 흐름을 확인하려면 각 계정에서 장부를 한 번 생성한 뒤 이메일로 멤버를 추가합니다.

## 4. 검증 범위

먼저 로컬 서버를 실행하고 회원가입, 장부 생성, 거래 추가·수정, 이력 조회 순서로 확인합니다. `/health-check`는 SDK 클라이언트 생성만 검사하므로 실제 연결 검증을 대신하지 않습니다.

통합 테스트는 테스트 전용 프로젝트의 환경 변수를 설정한 뒤 실행합니다.

```bash
cd backend
uv run pytest -m integration -rs
```

테스트는 사용자·장부·거래를 생성한 뒤 정리를 시도합니다. 중간 실패로 데이터가 남을 수 있으므로 운영 프로젝트에서는 실행하지 않습니다. 예제 값이나 네트워크 문제로 건너뛰었다면 `skipped` 사유를 확인하세요.

실시간 알림, 반복 거래 통계, 오프라인 동기화의 현재 제약은 [README](../README.md#제약과-보완-과제)에 정리했습니다.
