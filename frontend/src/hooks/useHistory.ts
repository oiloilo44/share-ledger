/**
 * 가계부 내역 히스토리 관련 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '../lib/api';
import type { Entry, EntryHistoryItem } from '../types/entries';

/**
 * 가계부 히스토리 목록 조회
 */
export function useHistory(bookId: string) {
  return useQuery<EntryHistoryItem[], Error>({
    queryKey: ['entries', bookId, 'history'],
    queryFn: () => entriesApi.listHistory(bookId),
    enabled: !!bookId,
  });
}

/**
 * 히스토리 복원 (revert)
 */
export function useRevertHistory(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation<Entry, Error, string>({
    mutationFn: (historyId: string) => entriesApi.revertHistory(historyId),
    onSuccess: () => {
      // 성공 시 관련 쿼리 무효화하여 자동 리프레시
      queryClient.invalidateQueries({ queryKey: ['entries', bookId] });
      queryClient.invalidateQueries({ queryKey: ['entries', bookId, 'history'] });
    },
  });
}
