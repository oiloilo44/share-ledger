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
import { useAuthStore } from '../stores/authStore';
import type { Entry } from '../types/entries';

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
    staleTime: 1000 * 30, // 30초 동안은 fresh한 데이터로 간주 (불필요한 refetch 방지)
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
 * 내역 생성 (낙관적 업데이트)
 */
export function useCreateEntry(bookId: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (data: EntryCreate) => entriesApi.create(bookId, data),
    onMutate: async (newEntry) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ['entries', bookId] });

      // 이전 데이터 스냅샷 저장
      const previousQueries = new Map();
      queryClient
        .getQueriesData<Entry[]>({ queryKey: ['entries', bookId] })
        .forEach(([key, data]) => {
          previousQueries.set(key, data);
        });

      // 낙관적 업데이트: 임시 ID로 새 항목 추가
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticEntry: Entry = {
        id: tempId,
        book_id: bookId,
        user_id: currentUser?.id ?? 'unknown',
        ...newEntry,
        category: newEntry.category ?? null,
        end_date: newEntry.end_date ?? null,
        frequency: newEntry.frequency ?? 'once',
        day_of_month: newEntry.day_of_month ?? null,
        day_of_week: newEntry.day_of_week ?? null,
        created_at: now,
        updated_at: now,
      };

      // 모든 entries 쿼리에 낙관적으로 추가 (올바른 위치에 삽입, 정렬 안함)
      queryClient.setQueriesData<Entry[]>(
        { queryKey: ['entries', bookId] },
        (old: Entry[] | undefined) => {
          if (!old || old.length === 0) return [optimisticEntry];

          // 올바른 위치를 찾아 삽입 (기존 순서는 유지)
          let insertIndex = 0;
          for (let i = 0; i < old.length; i++) {
            const current = old[i];
            const dateCompare = optimisticEntry.entry_date.localeCompare(current.entry_date);

            if (dateCompare > 0) {
              // 새 항목이 더 최신 날짜 → 현재 위치에 삽입
              insertIndex = i;
              break;
            } else if (dateCompare === 0) {
              // 같은 날짜면 created_at으로 비교 (더 최근이 위)
              if (optimisticEntry.created_at > current.created_at) {
                insertIndex = i;
                break;
              }
            }
            insertIndex = i + 1;
          }

          const newList = [...old];
          newList.splice(insertIndex, 0, optimisticEntry);
          return newList;
        },
      );

      return { previousQueries, tempId };
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: (newEntry, _variables, context) => {
      // 성공 시 임시 데이터를 실제 데이터로 교체 (정렬은 유지)
      queryClient.setQueriesData<Entry[]>(
        { queryKey: ['entries', bookId] },
        (old: Entry[] | undefined) => {
          if (!old) return [newEntry];

          // 임시 ID를 가진 항목을 실제 데이터로 교체
          return old.map((entry) => (entry.id === context?.tempId ? newEntry : entry));
        },
      );
    },
    // onSettled 제거: 실시간 동기화는 useRealtimeBookSync가 처리
  });
}

/**
 * 내역 수정 (낙관적 업데이트)
 */
export function useUpdateEntry(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: EntryUpdate }) =>
      entriesApi.update(bookId, entryId, data),
    onMutate: async ({ entryId, data }) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ['entries', bookId] });

      // 이전 데이터 스냅샷 저장
      const previousQueries = new Map();
      queryClient
        .getQueriesData<Entry[]>({ queryKey: ['entries', bookId] })
        .forEach(([key, queryData]) => {
          previousQueries.set(key, queryData);
        });

      // 낙관적 업데이트: 기존 항목 수정
      queryClient.setQueriesData<Entry[]>(
        { queryKey: ['entries', bookId] },
        (old: Entry[] | undefined) => {
          if (!old) return old;
          return old.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  ...data,
                  category: data.category ?? null,
                  updated_at: new Date().toISOString(),
                }
              : entry,
          );
        },
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: (updatedEntry) => {
      // 성공 시 서버 응답으로 데이터 교체 (정렬은 유지)
      queryClient.setQueriesData<Entry[]>(
        { queryKey: ['entries', bookId] },
        (old: Entry[] | undefined) => {
          if (!old) return [updatedEntry];
          return old.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry));
        },
      );
    },
    // onSettled 제거: 실시간 동기화는 useRealtimeBookSync가 처리
  });
}

/**
 * 내역 삭제 (낙관적 업데이트)
 */
export function useDeleteEntry(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => entriesApi.delete(bookId, entryId),
    onMutate: async (entryId) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ['entries', bookId] });

      // 이전 데이터 스냅샷 저장
      const previousQueries = new Map();
      queryClient
        .getQueriesData<Entry[]>({ queryKey: ['entries', bookId] })
        .forEach(([key, data]) => {
          previousQueries.set(key, data);
        });

      // 낙관적 업데이트: 항목 제거
      queryClient.setQueriesData<Entry[]>(
        { queryKey: ['entries', bookId] },
        (old: Entry[] | undefined) => {
          if (!old) return old;
          return old.filter((entry) => entry.id !== entryId);
        },
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    // onSettled 제거: 실시간 동기화는 useRealtimeBookSync가 처리
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
