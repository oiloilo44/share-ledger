-- Migration 0006: Remove recurring_entries table
-- entries 테이블에 통합되므로 recurring_entries 테이블 제거

-- recurring_entries 테이블 제거
DROP TABLE IF EXISTS recurring_entries CASCADE;
