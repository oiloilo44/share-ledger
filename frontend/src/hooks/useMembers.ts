/**
 * 가계부 멤버 관리 관련 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../lib/api';
import type { BookMember, BookMemberInvite, BookMemberUpdate } from '../types/books';

/**
 * 가계부 멤버 목록 조회
 */
export function useMembers(bookId: string) {
  return useQuery<BookMember[], Error>({
    queryKey: ['books', bookId, 'members'],
    queryFn: () => booksApi.listMembers(bookId),
    enabled: !!bookId,
  });
}

/**
 * 멤버 초대
 */
export function useInviteMember(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation<BookMember, Error, BookMemberInvite>({
    mutationFn: (data: BookMemberInvite) => booksApi.inviteMember(bookId, data),
    onSuccess: () => {
      // 성공 시 멤버 목록 무효화하여 자동 리프레시
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'members'] });
    },
  });
}

/**
 * 멤버 역할 변경
 */
export function useUpdateMemberRole(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation<BookMember, Error, { memberUserId: string; data: BookMemberUpdate }>({
    mutationFn: ({ memberUserId, data }) => booksApi.updateMemberRole(bookId, memberUserId, data),
    onSuccess: () => {
      // 성공 시 멤버 목록 무효화하여 자동 리프레시
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'members'] });
    },
  });
}

/**
 * 멤버 삭제
 */
export function useRemoveMember(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (memberUserId: string) => booksApi.removeMember(bookId, memberUserId),
    onSuccess: () => {
      // 성공 시 멤버 목록 무효화하여 자동 리프레시
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'members'] });
    },
  });
}
