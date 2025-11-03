/**
 * 가계부 관련 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../lib/api';
import type { BookCreate, BookUpdate } from '../types/books';

const QUERY_KEY = {
  books: ['books'] as const,
  book: (id: string) => ['books', id] as const,
  members: (bookId: string) => ['books', bookId, 'members'] as const,
};

/**
 * 가계부 목록 조회
 */
export function useBooks() {
  return useQuery({
    queryKey: QUERY_KEY.books,
    queryFn: () => booksApi.list(),
  });
}

/**
 * 가계부 생성
 */
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BookCreate) => booksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.books });
    },
  });
}

/**
 * 가계부 수정
 */
export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: BookUpdate }) =>
      booksApi.update(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.books });
    },
  });
}

/**
 * 가계부 삭제
 */
export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => booksApi.delete(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.books });
    },
  });
}

/**
 * 가계부 멤버 목록 조회
 */
export function useBookMembers(bookId: string) {
  return useQuery({
    queryKey: QUERY_KEY.members(bookId),
    queryFn: () => booksApi.listMembers(bookId),
    enabled: !!bookId,
  });
}
