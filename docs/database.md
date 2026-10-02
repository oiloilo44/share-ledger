# ShareLedger 데이터베이스 스키마

이 문서는 `infra/migrations/0001_init.sql`부터 `0007_fix_recurring_end_date.sql`까지 적용한 상태를 기준으로 합니다. 마이그레이션은 새 개발용 Supabase 프로젝트에서 번호 순서대로 적용합니다.

## 주요 테이블

| 테이블          | 주요 필드                                                                          | 용도                                    |
| --------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| `users`         | `id`, `email`, `full_name`, `avatar_url`                                           | `auth.users`에 연결된 앱 사용자 프로필  |
| `account_books` | `id`, `owner_id`, `name`                                                           | 장부와 소유자                           |
| `book_members`  | `book_id`, `user_id`, `role`, `joined_at`                                          | 장부별 멤버십. 역할은 `owner`, `editor` |
| `entries`       | `id`, `book_id`, `user_id`, `entry_date`, `description`, `amount`, `category`      | 수입·지출과 반복 설정                   |
| `entry_history` | `id`, `entry_id`, `book_id`, `changed_by`, `changed_at`, `action_type`, `snapshot` | 변경 시점의 JSON 스냅샷                 |

사용자·장부·거래의 갱신 시각은 공통 트리거에서 갱신합니다. `entries.amount`의 SQL 타입은 `numeric(14,2)`이지만 API는 원 단위 정수로 다룹니다. 양수는 수입, 음수는 지출이며 0은 허용하지 않습니다.

`users.id`는 `auth.users.id`를 참조합니다. 현재 서비스는 장부 생성 시 사용자 프로필을 upsert하며, 이메일로 멤버를 추가할 때는 이 프로필 테이블을 조회합니다. 따라서 Supabase Auth 가입만 끝낸 계정이 곧바로 초대 대상에 나타나는 것은 아닙니다.

## 반복 내역

현재 반복 정보는 `entries`에 저장합니다.

| 필드           | 의미                                                      |
| -------------- | --------------------------------------------------------- |
| `frequency`    | `once`, `monthly`, `weekly`                               |
| `entry_date`   | 단건 거래일 또는 반복 시작일                              |
| `end_date`     | 단건은 거래일, 반복은 종료일. 반복의 `NULL`은 종료일 없음 |
| `day_of_month` | 월간 반복 날짜, 1~31                                      |
| `day_of_week`  | 주간 반복 요일, 0(일요일)~6(토요일)                       |

`0005`에서 이 필드를 추가했고, `0006`에서 기존 `recurring_entries` 테이블을 삭제했습니다. `0007`은 종료일 없는 반복을 허용하도록 변경합니다. 초기 마이그레이션의 반복 테이블과 중복 방지 트리거는 현재 구조에 그대로 적용되지 않습니다.

브라우저가 선택한 월의 발생 내역을 계산하므로 매번 거래 행을 만드는 스케줄러는 없습니다. 서버의 통계·기간 필터·복원과 클라이언트 전개의 경계 조건은 추가 검증이 필요합니다.

## RPC와 제약

- `create_entry_with_history`, `update_entry_with_history`, `delete_entry_with_history`: 거래 변경과 이력 기록
- `restore_entry_from_history`: 저장된 스냅샷에서 거래 복원
- `prune_entry_history`: 장부별 최신 이력 100건 유지
- `enforce_book_limits`: 사용자당 소유 장부 최대 5개
- `enforce_member_limits`: 사용자당 멤버십 최대 5개. 소유자도 멤버십에 포함
- `set_updated_at`: 갱신 시각 자동 변경

이력의 `entry_id`는 거래 삭제 시 `NULL`이 될 수 있으며 스냅샷은 남습니다. 사용자나 장부 삭제에는 관련 데이터의 연쇄 삭제가 설정되어 있으므로 개발용 데이터로 검증해야 합니다.

## 보안과 마이그레이션 주의 사항

- 현재 마이그레이션에는 RLS 정책과 RPC 실행 권한 제한이 없습니다. 서버의 멤버십 검사와 별개로 DB 직접 접근 경로를 검토해야 합니다.
- 일부 RPC는 `security definer`로 선언되어 있습니다. 배포 전 함수 실행 권한, 호출자 검증, `search_path`를 검토해야 합니다.
- 마이그레이션은 되돌리기 스크립트를 제공하지 않습니다. 특히 `0006`은 기존 반복 테이블을 삭제하므로 운영 데이터에 그대로 적용하지 마세요.
- PostgreSQL `pg_notify`용 RPC는 Supabase Broadcast 전달 계층을 대신하지 않습니다. `0004`만 적용했다고 브라우저 실시간 동기화가 완성되는 것은 아닙니다.
