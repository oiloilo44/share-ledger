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
import type {
  Entry,
  EntryBulkImportResult,
  EntryCreate,
  EntryHistoryItem,
  EntryStatsResponse,
  EntryTypeFilter,
  EntryUpdate,
} from '../types/entries';
import type { RecurringEntry, RecurringEntryPayload } from '../types/recurring';

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

export interface EntryListParams {
  fromDate?: string;
  toDate?: string;
  categories?: string[];
  includeUncategorized?: boolean;
  memberIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  type?: EntryTypeFilter;
  search?: string;
}

export interface EntryStatsParams {
  month?: string;
  fromDate?: string;
  toDate?: string;
  topLimit?: number;
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
  async list(bookId: string, params?: EntryListParams): Promise<Entry[]> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.append('from_date', params.fromDate);
    if (params?.toDate) searchParams.append('to_date', params.toDate);
    if (typeof params?.minAmount === 'number')
      searchParams.append('min_amount', String(params.minAmount));
    if (typeof params?.maxAmount === 'number')
      searchParams.append('max_amount', String(params.maxAmount));
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.includeUncategorized) searchParams.append('includeUncategorized', 'true');
    params?.categories?.forEach((category) => searchParams.append('categories', category));
    params?.memberIds?.forEach((memberId) => searchParams.append('memberIds', memberId));
    const queryString = searchParams.toString();

    const response = await fetch(
      `${API_BASE_URL}/books/${bookId}/entries${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers,
      },
    );
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

  async stats(bookId: string, params?: EntryStatsParams): Promise<EntryStatsResponse> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.append('month', params.month);
    if (params?.fromDate) searchParams.append('from_date', params.fromDate);
    if (params?.toDate) searchParams.append('to_date', params.toDate);
    if (typeof params?.topLimit === 'number')
      searchParams.append('top_limit', String(params.topLimit));
    const query = searchParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/books/${bookId}/stats${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers,
      },
    );
    return handleResponse<EntryStatsResponse>(response);
  },

  async bulkImport(bookId: string, rows: EntryCreate[]): Promise<EntryBulkImportResult> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/entries/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rows }),
    });
    return handleResponse<EntryBulkImportResult>(response);
  },
};

export const recurringApi = {
  async list(bookId: string): Promise<RecurringEntry[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/recurring`, {
      method: 'GET',
      headers,
    });
    return handleResponse<RecurringEntry[]>(response);
  },

  async create(bookId: string, payload: RecurringEntryPayload): Promise<RecurringEntry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/recurring`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<RecurringEntry>(response);
  },

  async update(recurringId: string, payload: RecurringEntryPayload): Promise<RecurringEntry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/recurring/${recurringId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<RecurringEntry>(response);
  },

  async retry(recurringId: string): Promise<RecurringEntry> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/recurring/${recurringId}/retry`, {
      method: 'POST',
      headers,
    });
    return handleResponse<RecurringEntry>(response);
  },

  async remove(recurringId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/recurring/${recurringId}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<void>(response);
  },
};

export { APIError };
