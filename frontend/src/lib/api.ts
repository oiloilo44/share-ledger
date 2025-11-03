/**
 * 백엔드 API 클라이언트
 * Supabase Auth 토큰을 자동으로 포함하여 FastAPI 백엔드와 통신
 */

import { supabase } from './supabase';
import type {
  BookListItem,
  BookCreate,
  BookUpdate,
  BookMember,
  BookMemberInvite,
  BookMemberUpdate,
} from '../types/books';
import type { Entry, EntryCreate, EntryUpdate, EntryHistoryItem } from '../types/entries';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new APIError('인증 토큰이 없습니다. 다시 로그인해주세요.', 401);
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetail: unknown;

    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData;
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (errorDetail && typeof errorDetail === 'object' && 'message' in errorDetail) {
        errorMessage = String(errorDetail.message);
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw new APIError(errorMessage, response.status, errorDetail);
  }

  // 204 No Content 처리
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Books API
export const booksApi = {
  async list(): Promise<BookListItem[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'GET',
      headers,
    });
    return handleResponse<BookListItem[]>(response);
  },

  async create(data: BookCreate): Promise<BookListItem> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<BookListItem>(response);
  },

  async update(bookId: string, data: BookUpdate): Promise<BookListItem> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<BookListItem>(response);
  },

  async delete(bookId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<void>(response);
  },

  async listMembers(bookId: string): Promise<BookMember[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/members`, {
      method: 'GET',
      headers,
    });
    return handleResponse<BookMember[]>(response);
  },

  async inviteMember(bookId: string, data: BookMemberInvite): Promise<BookMember> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<BookMember>(response);
  },

  async updateMemberRole(
    bookId: string,
    memberUserId: string,
    data: BookMemberUpdate,
  ): Promise<BookMember> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/members/${memberUserId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<BookMember>(response);
  },

  async removeMember(bookId: string, memberUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/members/${memberUserId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<void>(response);
  },
};

// Entries API
export const entriesApi = {
  async list(bookId: string): Promise<Entry[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries`, {
      method: 'GET',
      headers,
    });
    return handleResponse<Entry[]>(response);
  },

  async get(bookId: string, entryId: string): Promise<Entry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries/${entryId}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<Entry>(response);
  },

  async create(bookId: string, data: EntryCreate): Promise<Entry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Entry>(response);
  },

  async update(bookId: string, entryId: string, data: EntryUpdate): Promise<Entry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries/${entryId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Entry>(response);
  },

  async delete(bookId: string, entryId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries/${entryId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<void>(response);
  },

  async listHistory(bookId: string): Promise<EntryHistoryItem[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/history`, {
      method: 'GET',
      headers,
    });
    return handleResponse<EntryHistoryItem[]>(response);
  },

  async revertHistory(historyId: string): Promise<Entry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/history/${historyId}/revert`, {
      method: 'POST',
      headers,
    });
    return handleResponse<Entry>(response);
  },
};

export { APIError };
