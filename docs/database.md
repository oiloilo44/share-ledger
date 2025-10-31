# ShareLedger 데이터베이스 스키마

## 개요

- 초기 마이그레이션: `infra/migrations/0001_init.sql`
- 모든 타임스탬프는 `UTC` 기준으로 저장하며, `updated_at` 컬럼은 공통 트리거로 자동 갱신된다.

## 테이블 정의

### users

- `id (uuid, PK)` — Supabase `auth.users`의 기본 키와 동일하며, 삭제 시 관련 데이터도 함께 제거된다.
- `email (text, unique)` — 사용자 이메일. 애플리케이션 계층에서 Supabase Auth 정보와 동기화한다.
- `full_name (text)` — 표시 이름.
- `avatar_url (text)` — 프로필 이미지 경로.
- `created_at (timestamptz)` — 행 생성 시각.
- `updated_at (timestamptz)` — 행 갱신 시각. `set_timestamp_on_users` 트리거로 자동 갱신.

### account_books

- `id (uuid, PK)` — 가계부 식별자.
- `owner_id (uuid, FK → users.id)` — 가계부 소유자. 삭제 시 종속 데이터가 함께 제거된다.
- `name (text)` — 가계부 이름.
- `created_at / updated_at (timestamptz)` — 생성·갱신 시각. `set_timestamp_on_account_books` 트리거 적용.
- 인덱스: `account_books_owner_idx(owner_id)`

### book_members

- `book_id (uuid, FK → account_books.id)` — 가계부 식별자.
- `user_id (uuid, FK → users.id)` — 참여자.
- `role (text)` — `'owner'` 또는 `'editor'`.
- `joined_at (timestamptz)` — 참여 시각.
- 기본 키: `(book_id, user_id)`  
  인덱스: `book_members_user_idx(user_id)`

### entries

- `id (uuid, PK)` — 내역 식별자.
- `book_id (uuid, FK → account_books.id)` — 소속 가계부.
- `user_id (uuid, FK → users.id)` — 변경 수행자.
- `entry_date (date)` — 거래 일자.
- `description (text)` — 설명.
- `amount (numeric(14,2))` — 금액. `0`은 허용되지 않음.
- `category (text)` — 사용자 정의 카테고리.
- `created_at / updated_at (timestamptz)` — 생성·갱신 시각. `set_timestamp_on_entries` 트리거 적용.
- 인덱스: `entries_book_idx(book_id)`, `entries_user_idx(user_id)`, `entries_date_idx(entry_date)`

### entry_history

- `id (uuid, PK)` — 이력 식별자.
- `entry_id (uuid, FK → entries.id, nullable)` — 원본 내역. 삭제된 내역도 추적하기 위해 `NULL` 허용.
- `book_id (uuid, FK → account_books.id)` — 가계부 기준 이력.
- `changed_by (uuid, FK → users.id, nullable)` — 변경 사용자.
- `changed_at (timestamptz)` — 변경 시각.
- `action_type (text)` — `'created'`, `'updated'`, `'deleted'`, `'restored'`.
- `snapshot (jsonb)` — 변경 시점의 스냅샷 데이터.
- 인덱스: `entry_history_book_idx(book_id, changed_at desc)`

### recurring_entries

- `id (uuid, PK)` — 반복 내역 설정 식별자.
- `book_id (uuid, FK → account_books.id)` — 대상 가계부.
- `user_id (uuid, FK → users.id)` — 설정 생성자.
- `description (text)` — 항목 설명.
- `amount (numeric(14,2))` — 금액. `0` 불가.
- `category (text)` — 카테고리.
- `frequency (text)` — `'monthly'` 또는 `'weekly'`.
- `day_of_month (int, nullable)` — 월 반복 시 1~31.
- `day_of_week (int, nullable)` — 주 반복 시 0(일)~6(토).
- `start_date (date)` — 반복 시작일.
- `end_date (date, nullable)` — 반복 종료일.
- `last_created_date (date, nullable)` — 마지막 생성 시점.
- `created_at / updated_at (timestamptz)` — 생성·갱신 시각. `set_timestamp_on_recurring_entries` 트리거 적용.
- 인덱스: `recurring_entries_book_idx(book_id)`, `recurring_entries_user_idx(user_id)`
- 제약: `end_date >= start_date`, 주기에 맞는 스케줄(`recurring_schedule_valid`) 유지.

## 함수 및 트리거

- `set_updated_at()`
  - 적용 테이블: `users`, `account_books`, `entries`, `recurring_entries`
  - 역할: 갱신 시 `updated_at` 컬럼을 현재 UTC 시각으로 자동 업데이트.

- `enforce_book_limits()` / `enforce_book_limit_trigger`
  - 대상: `account_books` (BEFORE INSERT/UPDATE OF owner_id)
  - 목적: 사용자당 가계부 생성 개수를 최대 5개로 제한.

- `enforce_member_limits()` / `enforce_member_limit_trigger`
  - 대상: `book_members` (BEFORE INSERT/UPDATE OF user_id)
  - 목적: 사용자가 참여할 수 있는 공유 가계부를 최대 5개로 제한.

- `prune_entry_history()` / `prune_entry_history_trigger`
  - 대상: `entry_history` (AFTER INSERT)
  - 목적: 가계부별 최신 100건만 유지하고 초과분은 즉시 삭제.

- `check_recurring_conflict()` / `check_recurring_conflict_trigger`
  - 대상: `recurring_entries` (BEFORE INSERT/UPDATE)
  - 목적: 동일한 주기·설명·카테고리로 날짜 범위가 겹치는 설정을 차단.

## 비고

- `recurring_entries`의 주간 반복을 지원하기 위해 `day_of_week` 컬럼을 추가했다. 주간 반복 시 `day_of_month`는 `NULL`, 월간 반복 시 `day_of_week`는 `NULL`이어야 한다.
- 초기 스키마는 Supabase RLS 비활성 상태를 전제로 하며, 이후 보안 정책 수립 시 별도 마이그레이션이 필요하다.
