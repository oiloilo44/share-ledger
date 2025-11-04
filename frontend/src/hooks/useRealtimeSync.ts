/**
 * Supabase Realtime 동기화 hooks
 * 백엔드에서 pg_notify로 발행한 이벤트를 구독하여 자동 리프레시
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/toastStore';

/**
 * 가계부 변경 이벤트를 실시간으로 구독
 * 내역, 히스토리, 멤버 변경 시 자동으로 데이터 리프레시
 */
export function useRealtimeBookSync(bookId: string | undefined) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (!bookId) return;

    // Realtime 채널 구독
    const channel = supabase.channel(`realtime:books:${bookId}`);

    // PostgreSQL Broadcast 이벤트 구독
    channel
      .on('broadcast', { event: 'entry_changed' }, () => {
        // 내역 목록 무효화하여 자동 리프레시
        queryClient.invalidateQueries({ queryKey: ['books', bookId, 'entries'] });
        queryClient.invalidateQueries({ queryKey: ['books', bookId, 'history'] });
        showToast('내역이 변경되었습니다', 'info');
      })
      .on('broadcast', { event: 'member_changed' }, () => {
        // 멤버 목록 무효화하여 자동 리프레시
        queryClient.invalidateQueries({ queryKey: ['books', bookId, 'members'] });
        showToast('멤버가 변경되었습니다', 'info');
      })
      .subscribe();

    // 클린업: 컴포넌트 언마운트 시 구독 해제
    return () => {
      channel.unsubscribe();
    };
  }, [bookId, queryClient, showToast]);
}

/**
 * 가계부 목록 변경 이벤트를 실시간으로 구독
 * 가계부 생성/수정/삭제 시 자동으로 목록 리프레시
 */
export function useRealtimeBooksListSync() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    // 전역 가계부 목록 변경 채널 구독
    const channel = supabase.channel('realtime:books');

    channel
      .on('broadcast', { event: 'book_changed' }, () => {
        // 가계부 목록 무효화하여 자동 리프레시
        queryClient.invalidateQueries({ queryKey: ['books'] });
        showToast('가계부 목록이 변경되었습니다', 'info');
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, showToast]);
}
