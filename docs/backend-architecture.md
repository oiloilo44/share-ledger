# ShareLedger 백엔드 아키텍처

FastAPI 라우터는 HTTP 요청·응답을, 서비스는 장부 접근 권한과 데이터 처리를 담당합니다. Supabase Auth로 사용자를 확인하고, 서버 전용 키로 PostgreSQL 테이블과 RPC를 호출합니다.

## 요청 흐름

1. 브라우저가 Supabase Auth에서 받은 access token을 `Authorization: Bearer …`로 전달합니다.
2. `services/auth.py`의 `get_current_user()`가 Supabase Auth에 토큰을 확인하고 사용자 모델을 반환합니다.
3. 장부·거래 서비스가 소유권 또는 멤버십을 확인합니다.
4. Supabase SDK로 데이터를 조회하거나 SQL RPC로 거래와 이력을 변경합니다. 동기 SDK 호출은 `asyncio.to_thread()`로 분리합니다.
5. 라우터가 Pydantic 응답 모델로 결과를 반환합니다.

## 모듈

| 경로                          | 역할                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `app/main.py`                 | 앱 팩토리, CORS, 예외 처리, 라우터 등록                |
| `app/config.py`               | `SHARELEDGER_` 환경 변수와 실행 디렉터리의 `.env` 로딩 |
| `app/db.py`                   | 캐시된 Supabase 클라이언트와 의존성 제공               |
| `app/routers/auth.py`         | 가입·로그인·로그아웃 API                               |
| `app/routers/books.py`        | 장부와 멤버 관리 API                                   |
| `app/routers/entries.py`      | 거래, CSV 등록용 일괄 입력, 통계, 이력·복원 API        |
| `app/services/`               | 인증 연동, 권한 확인, 조회·변경·집계                   |
| `app/models/`, `app/schemas/` | 요청·응답 모델과 필터                                  |
| `tests/`                      | 의존성을 대체한 단위·라우터 테스트                     |
| `tests/integration/`          | 실제 Supabase 사용자·장부·거래 생성 및 정리            |

`app/routers/recurring.py`와 대응 서비스는 이전 구조의 코드입니다. 현재 앱에는 등록되지 않으며, 반복 정보는 거래 모델의 `frequency`, `end_date`, `day_of_month`, `day_of_week`로 처리합니다.

## 설정과 의존성

- `get_settings()`와 Supabase 클라이언트는 각각 LRU 캐시로 재사용합니다.
- `SHARELEDGER_CORS_ORIGINS` 환경 변수는 JSON 배열로 설정합니다. 예: `["http://localhost:5173"]`.
- `db.py`에는 고정된 Supabase SDK / httpx 조합의 `proxy` 인자 호환 패치가 있습니다. 의존성 버전 변경 시 제거 가능 여부와 클라이언트 초기화를 함께 확인해야 합니다.
- `/health-check`는 클라이언트 생성만 수행합니다. Supabase에 실제 요청을 보내는 준비 상태 검사는 아닙니다.
- 브라우저의 로그인·비밀번호 재설정은 Supabase JS SDK를 직접 사용합니다. 백엔드 `/auth/*` 라우트가 모든 브라우저 인증 요청을 중계하는 구조는 아닙니다.

## 거래와 변경 이력

거래 생성·수정·삭제·복원은 `infra/migrations/`의 RPC 함수를 호출합니다. 거래 변경과 이력 기록을 한 함수에서 처리해 두 작업이 분리되어 실행되는 상황을 줄입니다. 수정 이력에는 변경 전 값이 저장되고, 삭제 이력은 거래가 없어진 뒤에도 스냅샷을 유지합니다.

이력은 장부별 최신 100건을 보관합니다. 일괄 등록은 행별로 처리하고 성공·실패를 반환하므로, 파일 전체가 하나의 트랜잭션으로 롤백되지는 않습니다.

## 현재 경계와 후속 작업

- 장부 접근 검사는 서비스 계층에 있습니다. SQL에는 RLS 정책이나 RPC 실행 권한 제한이 없으므로, 이 검사만으로 직접 DB 접근에 대한 보호가 완성되지는 않습니다.
- 서버 통계와 날짜 필터는 저장된 거래의 `entry_date`를 기준으로 합니다. 브라우저의 월별 반복 전개와 계산 경로를 통합해야 합니다.
- 서비스의 `pg_notify` 호출과 브라우저의 Supabase Broadcast 구독 사이에 전달 계층이 없습니다. 실시간 반영은 추가 구현과 연동 검증이 필요합니다.
- 인증·장부·거래 라우터 테스트는 외부 서비스를 대체합니다. 실제 DB와의 호환성은 테스트 전용 Supabase에서 통합 테스트로 확인해야 합니다.
