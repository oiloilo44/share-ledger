/**
 * 가계부 내역 관련 타입 정의
 * 백엔드 models/entries.py와 동기화
 */

export interface Entry {
  id: string;
  book_id: string;
  user_id: string;
  entry_date: string; // ISO date format (YYYY-MM-DD)
  description: string;
  amount: number; // 단위: 원
  category: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface EntryCreate {
  entry_date: string; // ISO date format (YYYY-MM-DD)
  description: string; // 1-200자
  amount: number; // 0이 아닌 값
  category?: string | null; // 최대 80자
}

export interface EntryUpdate {
  entry_date: string;
  description: string;
  amount: number;
  category?: string | null;
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
