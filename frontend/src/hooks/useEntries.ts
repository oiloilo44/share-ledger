/**
 * 가계부 내역 관련 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi, type EntryListParams, type EntryStatsParams } from '../lib/api';
import type {
  EntryBulkImportResult,
  EntryCreate,
  EntryStatsResponse,
  EntryUpdate,
} from '../types/entries';

const QUERY_KEY = {
  entries: (bookId: string, filterKey: string) => ['entries', bookId, filterKey] as const,
  entry: (bookId: string, entryId: string) => ['entries', bookId, entryId] as const,
  history: (bookId: string) => ['entries', bookId, 'history'] as const,
  stats: (bookId: string, paramsKey: string) => ['entries', bookId, 'stats', paramsKey] as const,
};

/**
 * 가계부 내역 목록 조회
 */
export function useEntries(bookId: string, filters?: EntryListParams) {
  const filterKey = filters ? JSON.stringify(filters) : 'default';
  return useQuery({
    queryKey: QUERY_KEY.entries(bookId, filterKey),
    queryFn: () => entriesApi.list(bookId, filters),
    enabled: !!bookId,
  });
}

/**
 * 단일 내역 조회
 */
export function useEntry(bookId: string, entryId: string) {
  return useQuery({
    queryKey: QUERY_KEY.entry(bookId, entryId),
    queryFn: () => entriesApi.get(bookId, entryId),
    enabled: !!bookId && !!entryId,
  });
}

/**
 * 내역 생성
 */
export function useCreateEntry(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EntryCreate) => entriesApi.create(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
    },
  });
}

/**
 * 내역 수정
 */
export function useUpdateEntry(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: EntryUpdate }) =>
      entriesApi.update(bookId, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
    },
  });
}

/**
 * 내역 삭제
 */
export function useDeleteEntry(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => entriesApi.delete(bookId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
    },
  });
}

/**
 * 내역 히스토리 조회
 */
export function useEntryHistory(bookId: string) {
  return useQuery({
    queryKey: QUERY_KEY.history(bookId),
    queryFn: () => entriesApi.listHistory(bookId),
    enabled: !!bookId,
  });
}

/**
 * 히스토리 복원
 */
export function useRevertHistory(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId: string) => entriesApi.revertHistory(historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.history(bookId) });
    },
  });
}

export function useEntryStats(bookId: string, params?: EntryStatsParams) {
  const paramsKey = params ? JSON.stringify(params) : 'default';
  return useQuery<EntryStatsResponse>({
    queryKey: QUERY_KEY.stats(bookId, paramsKey),
    queryFn: () => entriesApi.stats(bookId, params),
    enabled: !!bookId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useBulkImportEntries(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation<EntryBulkImportResult, unknown, EntryCreate[]>({
    mutationFn: (rows) => entriesApi.bulkImport(bookId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
    },
  });
}
