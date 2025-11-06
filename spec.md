### **최종 기술 명세서 (v3.0 Final & Confirmed)**

# **프로젝트: 공유 가계부 (ShareLedger) 기술 명세서**

- **프로젝트명**: ShareLedger (영문) / 공유 가계부 (한글)
- **한 줄 요약**: 개인 또는 지인과 함께 자산을 관리하고 공유할 수 있는 실시간 PWA 기반 웹 가계부 서비스
- **핵심 기술 스택**: Python FastAPI, React.js, Supabase

## 1. 개요 (Overview)

본 프로젝트는 친구, 연인, 가족 등과 함께 재무를 관리할 수 있는 공유 가계부 웹 애플리케이션을 개발하는 것을 목표로 한다. PC와 모바일 환경에 모두 최적화된 유연한 UI/UX를 제공하며, Supabase의 실시간(Realtime) 기능을 활용하여 여러 사용자가 동시에 작업할 때 데이터가 즉시 동기화되는 경험을 제공한다. PWA(Progressive Web App) 기술을 적용하여 네이티브 앱과 유사한 사용자 경험을 제공하는 것을 지향한다.

## 2. 주요 기능 (Features)

### 2.1. 반응형 UI/UX (Responsive UI/UX)

- PC, 태블릿, 모바일 등 모든 디바이스 환경에서 최적화된 화면을 제공한다.
- 웹 표준을 준수하여 브라우저 호환성을 확보한다.

### 2.2. 사용자 인증 (User Authentication)

- **Supabase Auth**를 활용하여 안전하고 효율적인 인증 시스템을 구축한다.
- **회원가입**: 이메일과 비밀번호 기반의 회원가입 기능을 제공한다.
- **로그인**: 생성된 계정으로 로그인할 수 있으며, JWT(JSON Web Token)를 발급하여 세션을 관리한다.
- **ID/PW 찾기**: 비밀번호 분실 시 **관리자에게 문의하도록 안내**하는 기능을 제공한다.

### 2.3. 가계부 생성 및 관리 (Account Book Management)

- 한 명의 사용자는 여러 개의 독립된 가계부를 생성하고 관리할 수 있다.
- **생성 제한**: 사용자당 **최대 5개**의 가계부를 생성할 수 있다.
- 각 가계부에 대한 이름 변경, 삭제 등 기본적인 CRUD(Create, Read, Update, Delete) 기능을 지원한다.

### 2.4. 가계부 공유 및 협업 (Account Book Sharing & Collaboration)

- 가계부 소유자는 이메일 또는 사용자 ID로 다른 사용자를 초대하여 가계부를 공유할 수 있다.
- **공유 수락 제한**: 초대받은 사용자는 **최대 5개**의 공유 가계부에만 참여할 수 있다.
- **실시간 동기화**: Supabase의 **Realtime Database** 기능을 사용하여, 공유된 가계부의 내용이 변경될 경우 모든 참여자에게 즉시 업데이트 내용이 반영된다.

### 2.5. 수정 이력 및 버전 관리 (Edit History & Version Control)

- 각 가계부 내 데이터(수입/지출 내역)의 모든 변경(추가, 수정, 삭제) 이력을 추적한다.
- **이력 저장**: 가계부별로 **최대 100건**의 최신 변경 이력을 저장한다.
- **데이터 복원(Rollback)**: 사용자는 저장된 100건의 이력 중 원하는 시점을 선택하여 해당 상태로 가계부 데이터를 되돌릴 수 있다.

### 2.6. 데이터 일괄 추가 (Bulk Data Addition)

- 사용자가 엑셀(Excel)이나 구글 시트(Google Sheets)에서 복사한 데이터를 간편하게 붙여넣어 여러 내역을 한 번에 추가할 수 있는 기능을 제공한다.
- **입력 형식**: `날짜`, `내용`, `금액`, `카테고리` 등 미리 정의된 열(column) 순서에 따라 구분된 데이터를 파싱하여 DB에 저장한다.

### 2.7. 반복 내역 자동 추가 (Recurring Transactions)

- 월세, 통신비, 할부금 등 고정적으로 발생하는 수입/지출을 설정하여 자동으로 가계부에 추가하는 기능을 제공한다.
- **기간 설정**:
  - **종료일 미지정**: 구독 서비스처럼 계속되는 항목을 설정할 수 있다.
  - **종료일 지정**: 할부, 대출 상환처럼 정해진 기간 동안만 발생하는 항목을 설정할 수 있다.
- **자동화 방식**: 서버에서 매일 정해진 시간에 스케줄링 작업을 실행하여, 당일에 해당하는 반복 내역을 `entries` 테이블에 자동으로 생성한다.

## 3. 기술 스택 (Tech Stack)

- **Backend**: **Python 3.11**, **FastAPI**
- **Database & BaaS**: **Supabase**
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth
  - **Realtime**: Supabase Realtime Subscriptions
- **Frontend**: **React.js**, **MUI (Material-UI)**
  - **PWA (Progressive Web App)**: Service Worker, Web App Manifest 등을 적용하여 홈 화면 바로가기 추가, 오프라인 지원 등 네이티브 앱과 유사한 경험을 제공한다.
- **Deployment & CI/CD**:
  - **배포 환경**: 개인 **Ubuntu 서버** 환경에서 **Docker**를 사용하여 컨테이너 기반으로 배포한다.
  - **CI/CD 파이프라인**: **GitHub Actions**를 사용하여 Git 리포지토리 `main` 브랜치에 코드가 푸시(push)될 때마다 테스트, 빌드, Docker 이미지 생성 및 서버 배포 과정을 자동화한다.

## 4. 시스템 운영 및 유지보수 (System Operations & Maintenance)

### 4.1. Supabase 프로젝트 활성 상태 유지 (Keep-Alive)

- **목적**: Supabase 무료 플랜에서 7일간 활동이 없을 경우 프로젝트가 자동으로 '일시 중지'되는 것을 방지한다.
- **구현**:
  - **GitHub Actions**의 스케줄링 기능(`schedule cron`)을 사용한다.
  - **매 3일마다** 정해진 시간에 백엔드 서버의 특정 API 엔드포인트(예: `/health-check`)에 간단한 GET 요청을 보내는 워크플로우를 실행한다.
  - 이를 통해 프로젝트의 활동 기록을 남겨 자동 중지를 방지하고 서비스의 연속성을 보장한다.

## 5. 데이터베이스 스키마

| 테이블명 (Table)      | 컬럼 (Column)                                                                                                                                                                           | 설명                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **users**             | `id`, `email`, `created_at`, ...                                                                                                                                                        | 사용자 정보 (Supabase Auth 스키마 활용)                                        |
| **account_books**     | `id`, `owner_id` (FK), `name`, `created_at`                                                                                                                                             | 가계부 기본 정보                                                               |
| **book_members**      | `book_id` (FK), `user_id` (FK), `role` (`TEXT`), `joined_at`                                                                                                                            | 가계부 공유 멤버 정보.<br>**role**: 'Owner' 또는 'Editor'                      |
| **entries**           | `id`, `book_id` (FK), `user_id` (FK), `date`, `description`, `amount`, `category` (`TEXT`), `created_at`, `updated_at`                                                                  | 가계부 수입/지출 내역.<br>**category**: 사용자가 자유롭게 입력하는 텍스트 필드 |
| **entry_history**     | `id`, `entry_id` (FK), `book_id` (FK), `changed_by` (FK), `changed_at`, `action_type`, `snapshot` (JSONB)                                                                               | 내역 변경 이력 (버전 관리용)                                                   |
| **recurring_entries** | `id`, `book_id` (FK), `user_id` (FK), `description`, `amount`, `category`, `frequency` ('monthly', 'weekly'), `day_of_month`, `start_date`, `end_date` (NULL 가능), `last_created_date` | 반복 내역 설정 정보                                                            |

## 6. API 엔드포인트 설계

| Method | Endpoint                             | 설명                                   |
| ------ | ------------------------------------ | -------------------------------------- |
| POST   | `/auth/signup`                       | 회원가입                               |
| POST   | `/auth/login`                        | 로그인                                 |
| POST   | `/auth/logout`                       | 로그아웃                               |
| GET    | `/books`                             | 내 가계부 및 공유받은 가계부 목록 조회 |
| POST   | `/books`                             | 새 가계부 생성                         |
| GET    | `/books/{book_id}`                   | 특정 가계부 상세 정보 조회             |
| PUT    | `/books/{book_id}`                   | 가계부 정보 수정                       |
| DELETE | `/books/{book_id}`                   | 가계부 삭제                            |
| POST   | `/books/{book_id}/members`           | 가계부에 멤버 초대                     |
| DELETE | `/books/{book_id}/members/{user_id}` | 가계부에서 멤버 제외                   |
| GET    | `/books/{book_id}/entries`           | 가계부 내역 조회                       |
| POST   | `/books/{book_id}/entries`           | 새 내역 추가                           |
| POST   | `/books/{book_id}/entries/bulk`      | 엑셀 데이터로 내역 일괄 추가           |
| PUT    | `/entries/{entry_id}`                | 내역 수정                              |
| DELETE | `/entries/{entry_id}`                | 내역 삭제                              |
| GET    | `/books/{book_id}/history`           | 가계부 변경 이력 조회                  |
| POST   | `/history/{history_id}/revert`       | 특정 이력 시점으로 복원                |
| GET    | `/books/{book_id}/recurring`         | 가계부의 반복 내역 설정 목록 조회      |
| POST   | `/books/{book_id}/recurring`         | 새 반복 내역 설정 추가                 |
| PUT    | `/recurring/{recurring_id}`          | 반복 내역 설정 수정                    |
| DELETE | `/recurring/{recurring_id}`          | 반복 내역 설정 삭제                    |
| GET    | `/health-check`                      | 시스템 상태 확인 및 Keep-Alive용       |
