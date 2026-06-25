# ShareLedger 백엔드 아키텍처

## 개요

- 프레임워크: FastAPI
- 언어: Python 3.11
- 주요 의존성: `fastapi`, `supabase`, `pydantic-settings`
- 구성 파일 위치: `backend/app/`

## 모듈 구조

| 모듈               | 책임                                                     |
| ------------------ | -------------------------------------------------------- |
| `config.py`        | 환경 변수 로딩, CORS 설정 등 전역 설정 관리              |
| `db.py`            | Supabase Python 클라이언트 초기화 및 FastAPI 의존성 주입 |
| `services/auth.py` | Supabase Auth REST API 연동, 토큰 검증 의존성 제공       |
| `routers/auth.py`  | 인증 관련 라우터(`/auth/*`) 및 요청/응답 스키마 연결     |
| `schemas/auth.py`  | 인증 도메인 전용 Pydantic 스키마 정의                    |
| `main.py`          | FastAPI 인스턴스 생성, 미들웨어/라우터/예외 핸들러 등록  |

### config.py

- `Settings` 클래스는 Pydantic Settings를 사용해 환경 변수를 로드한다.
- 기본 `.env`, `backend/.env` 파일을 모두 탐색하며, `SHARELEDGER_` 접두사를 사용한다.
- `cors_origins`는 콤마 구분 문자열을 리스트로 자동 변환한다.
- `get_settings()` 함수는 LRU 캐시로 인스턴스를 재사용한다.

### db.py

- Supabase REST URL과 server key를 기반으로 `create_client()`를 호출한다.
- `_build_supabase_client()`는 최초 한 번만 초기화되고 이후 캐시된 인스턴스를 반환한다.
- `get_supabase_client()`는 FastAPI 의존성에서 재사용될 수 있도록 별도 함수로 제공한다.
- Supabase Python SDK가 사용하는 `gotrue` 클라이언트가 최신 httpx에서 `proxy` 인자를 지원하지 않는 문제를 우회하기 위해 런타임에 패치한다.

### main.py

- `create_app()`에서 FastAPI 앱을 생성하고 CORS 미들웨어를 설정한다.
- `/health-check` 엔드포인트는 Supabase 클라이언트 초기화 가능 여부를 확인하면서 상태를 응답한다.
- 공통 예외 핸들러:
  - `RequestValidationError`: 422 상태 코드와 상세 오류 목록 반환.
  - 일반 `Exception`: 로그 기록 후 500 상태 코드와 표준 메시지 반환.
- `routers/auth.py`의 라우터를 포함해 인증 관련 엔드포인트를 노출한다.

### services/auth.py

- Supabase Auth REST 엔드포인트(`/auth/v1/*`)를 호출하기 위해 `httpx.AsyncClient`를 사용한다.
- 회원가입, 로그인, 로그아웃, 토큰 기반 사용자 조회 기능을 제공한다.
- FastAPI 의존성 `get_current_user`를 통해 Bearer 토큰을 검증하고 사용자 정보를 반환한다.

### schemas/auth.py

- Supabase Auth 응답을 내부 모델(`AuthSession`, `SupabaseUser`)로 매핑한다.
- 요청 본문(`SignUpRequest`, `SignInRequest`, `SignOutRequest`)과 정적 응답(`PasswordHelpResponse`)을 정의한다.

## 의존성 흐름

1. `main.py` → `config.py`: 앱 생성 시 환경 설정을 로드해 CORS, 리스너 설정에 사용.
2. `main.py` → `db.py`: 헬스 체크 및 향후 라우터에서 Supabase 클라이언트 의존성으로 활용.
3. `main.py` → `routers/auth.py` → `services/auth.py`: 인증 라우트에서 Supabase Auth 연동 서비스를 호출한다.
4. `services/auth.py` → `config.py`: Supabase Auth REST 호출에 필요한 URL과 server key를 읽어온다.

## 향후 확장 시 고려사항

- 서비스/라우터 모듈 추가 시 의존성 주입을 위해 `get_supabase_client()`를 FastAPI `Depends`로 사용한다.
- 인증, 가계부, 내역 등 도메인 서비스는 `services/` 디렉터리로 분리하고, 라우터는 `routers/` 디렉터리에 위치시킨다.
- 배경 작업(예: 반복 내역 생성)은 Supabase Edge Function 혹은 별도 워커 모듈과 연동한다.
