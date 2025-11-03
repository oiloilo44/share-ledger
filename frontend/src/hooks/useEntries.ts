/**
 * 가계부 내역 관련 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '../lib/api';
import type { EntryCreate, EntryUpdate } from '../types/entries';

const QUERY_KEY = {
  entries: (bookId: string) => ['entries', bookId] as const,
  entry: (bookId: string, entryId: string) => ['entries', bookId, entryId] as const,
  history: (bookId: string) => ['entries', bookId, 'history'] as const,
};

/**
 * 가계부 내역 목록 조회
 */
export function useEntries(bookId: string) {
  return useQuery({
    queryKey: QUERY_KEY.entries(bookId),
    queryFn: () => entriesApi.list(bookId),
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.entries(bookId) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.entries(bookId) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.entries(bookId) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.entries(bookId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.history(bookId) });
    },
  });
}
