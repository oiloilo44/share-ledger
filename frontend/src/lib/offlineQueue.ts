import { entriesApi } from './api';
import type { EntryCreate } from '../types/entries';

const STORAGE_KEY = 'shareledger.offlineQueue';

export interface OfflineEntryPayload extends EntryCreate {
  bookId: string;
  timestamp: number;
}

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readQueue = (): OfflineEntryPayload[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineEntryPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read offline queue', error);
    return [];
  }
};

const writeQueue = (queue: OfflineEntryPayload[]) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to persist offline queue', error);
  }
};

export const enqueueOfflineEntry = (entry: OfflineEntryPayload): number => {
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return queue.length;
};

export const getOfflineQueueCount = (): number => readQueue().length;

export const flushOfflineQueue = async (): Promise<{ success: number; failure: number }> => {
  const queue = readQueue();
  if (!queue.length) {
    return { success: 0, failure: 0 };
  }

  let success = 0;
  const remaining: OfflineEntryPayload[] = [];

  for (const item of queue) {
    try {
      await entriesApi.create(item.bookId, {
        entry_date: item.entry_date,
        description: item.description,
        amount: item.amount,
        category: item.category ?? null,
      });
      success += 1;
    } catch (error) {
      console.error('Failed to replay offline entry', error);
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { success, failure: remaining.length };
};
