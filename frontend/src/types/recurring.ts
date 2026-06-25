export enum RecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface RecurringEntry {
  id: string;
  book_id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  last_created_date: string | null;
  created_at: string;
  updated_at: string;
  next_occurrence: string | null;
  is_active: boolean;
}

export interface RecurringEntryPayload {
  description: string;
  amount: number;
  category?: string | null;
  frequency: RecurringFrequency;
  day_of_month?: number | null;
  day_of_week?: number | null;
  start_date: string;
  end_date?: string | null;
}
