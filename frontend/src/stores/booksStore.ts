/**
 * 가계부 상태 관리 스토어
 * 선택된 가계부 ID를 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type BooksState = {
  selectedBookId: string | null;

  // Actions
  setSelectedBook: (bookId: string | null) => void;
  clearSelectedBook: () => void;
};

export const useBooksStore = create<BooksState>()(
  persist(
    (set) => ({
      selectedBookId: null,

      setSelectedBook: (bookId) => set({ selectedBookId: bookId }),
      clearSelectedBook: () => set({ selectedBookId: null }),
    }),
    {
      name: 'books-store',
    },
  ),
);
