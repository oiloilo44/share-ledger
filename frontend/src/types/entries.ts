/**
 * 가계부 내역 관련 타입 정의
 * 백엔드 models/entries.py와 동기화
 */

export type EntryFrequency = 'once' | 'monthly' | 'weekly';

export interface Entry {
  id: string;
  book_id: string;
  user_id: string;
  entry_date: string; // ISO date format (YYYY-MM-DD)
  description: string;
  amount: number; // 단위: 원
  category: string | null;
  end_date: string | null; // ISO date format (YYYY-MM-DD) - 반복 종료일
  frequency: EntryFrequency; // 반복 주기
  day_of_month: number | null; // 월간 반복 날짜 (1-31)
  day_of_week: number | null; // 주간 반복 요일 (0=일요일, 6=토요일)
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface EntryCreate {
  entry_date: string; // ISO date format (YYYY-MM-DD)
  description: string; // 1-200자
  amount: number; // 0이 아닌 값
  category?: string | null; // 최대 80자
  end_date?: string | null; // 반복 종료일
  frequency?: EntryFrequency; // 반복 주기 (기본값: 'once')
  day_of_month?: number | null; // 월간 반복 날짜 (1-31)
  day_of_week?: number | null; // 주간 반복 요일 (0-6)
}

export interface EntryUpdate {
  entry_date: string;
  description: string;
  amount: number;
  category?: string | null;
  end_date?: string | null; // 반복 종료일
  frequency?: EntryFrequency; // 반복 주기 (기본값: 'once')
  day_of_month?: number | null; // 월간 반복 날짜 (1-31)
  day_of_week?: number | null; // 주간 반복 요일 (0-6)
}

/**
 * 전개된 내역 (반복 내역의 특정 발생일 인스턴스)
 */
export interface ExpandedEntry extends Entry {
  original_id: string; // 원본 entry ID
  occurrence_date: string; // 실제 발생 날짜 (ISO date)
  is_projected: boolean; // 미래 내역 여부
}

export enum EntryHistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  RESTORED = 'restored',
}

export interface EntryHistoryItem {
  id: string;
  entry_id: string | null;
  book_id: string;
  changed_by: string | null;
  changed_at: string; // ISO datetime
  action_type: EntryHistoryAction;
  snapshot: Record<string, unknown>;
}

export enum EntryTypeFilter {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface EntryStatsSummary {
  total_income: number;
  total_expense: number;
  net_amount: number;
}

export interface EntryStatsCategory {
  category: string;
  amount: number;
  ratio: number;
}

export interface EntryStatsTrendPoint {
  period: string; // ISO date (YYYY-MM-01)
  income: number;
  expense: number;
}

export interface EntryStatsTopEntry {
  id: string;
  description: string;
  amount: number;
  entry_date: string;
  category: string | null;
}

export interface EntryStatsResponse {
  summary: EntryStatsSummary;
  category_distribution: EntryStatsCategory[];
  trend: EntryStatsTrendPoint[];
  top_expenses: EntryStatsTopEntry[];
  total_entries: number;
}

export interface EntryBulkImportResultItem {
  index: number;
  success: boolean;
  entry?: Entry;
  error?: string;
}

export interface EntryBulkImportResult {
  total: number;
  success_count: number;
  failure_count: number;
  rows: EntryBulkImportResultItem[];
}
