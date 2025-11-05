import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recurringApi } from '../lib/api';
import type { RecurringEntry, RecurringEntryPayload } from '../types/recurring';

const QUERY_KEY = {
  list: (bookId: string) => ['recurring', bookId] as const,
};

export function useRecurringEntries(bookId: string) {
  return useQuery<RecurringEntry[]>({
    queryKey: QUERY_KEY.list(bookId),
    queryFn: () => recurringApi.list(bookId),
    enabled: !!bookId,
  });
}

export function useCreateRecurringEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecurringEntryPayload) => recurringApi.create(bookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.list(bookId) });
    },
  });
}

export function useUpdateRecurringEntry(recurringId: string, bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecurringEntryPayload) => recurringApi.update(recurringId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.list(bookId) });
    },
  });
}

export function useRetryRecurringEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => recurringApi.retry(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.list(bookId) });
    },
  });
}

export function useDeleteRecurringEntry(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => recurringApi.remove(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.list(bookId) });
    },
  });
}
