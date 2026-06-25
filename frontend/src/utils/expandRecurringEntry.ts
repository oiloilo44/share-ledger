/**
 * 반복 내역 전개 로직
 *
 * entries 테이블에 저장된 범위 정보를 기반으로
 * 특정 월/기간의 실제 발생 내역을 프론트엔드에서 계산합니다.
 */

import type { Entry, ExpandedEntry } from '../types/entries';

/**
 * 특정 월의 모든 내역을 전개합니다.
 *
 * @param entries - 원본 내역 목록
 * @param yearMonth - 대상 월 (형식: "YYYY-MM")
 * @returns 전개된 내역 목록 (날짜순 정렬)
 *
 * @example
 * const entries = [
 *   { frequency: 'monthly', day_of_month: 10, entry_date: '2025-01-01', end_date: '2026-12-31', ... }
 * ];
 * const expanded = expandEntriesForMonth(entries, '2025-11');
 * // 결과: [{ occurrence_date: '2025-11-10', is_projected: false, ... }]
 */
export function expandEntriesForMonth(entries: Entry[], yearMonth: string): ExpandedEntry[] {
  const expanded: ExpandedEntry[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const entry of entries) {
    if (entry.frequency === 'once') {
      // 단건: entry_date가 해당 월이면 추가
      if (entry.entry_date.startsWith(yearMonth)) {
        expanded.push({
          ...entry,
          original_id: entry.id,
          occurrence_date: entry.entry_date,
          is_projected: entry.entry_date > today,
        });
      }
    } else if (entry.frequency === 'monthly' && entry.day_of_month !== null) {
      // 월간 반복: 해당 월의 day_of_month 계산
      const targetDate = `${yearMonth}-${String(entry.day_of_month).padStart(2, '0')}`;

      // 날짜 유효성 검증 (예: 2월 30일 같은 잘못된 날짜 방지)
      const dateObj = new Date(targetDate);
      const isInRange = entry.end_date === null ? true : targetDate <= entry.end_date;

      if (
        dateObj.getMonth() === parseInt(yearMonth.split('-')[1]) - 1 &&
        targetDate >= entry.entry_date &&
        isInRange
      ) {
        expanded.push({
          ...entry,
          original_id: entry.id,
          occurrence_date: targetDate,
          is_projected: targetDate > today,
        });
      }
    } else if (entry.frequency === 'weekly' && entry.day_of_week !== null) {
      // 주간 반복: 해당 월의 모든 day_of_week 계산
      const [year, month] = yearMonth.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === entry.day_of_week) {
          const dateStr = d.toISOString().split('T')[0];
          const isInRange = entry.end_date === null ? true : dateStr <= entry.end_date;

          if (dateStr >= entry.entry_date && isInRange) {
            expanded.push({
              ...entry,
              original_id: entry.id,
              occurrence_date: dateStr,
              is_projected: dateStr > today,
            });
          }
        }
      }
    }
  }

  return expanded.sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
}

/**
 * 날짜 범위의 모든 내역을 전개합니다.
 *
 * @param entries - 원본 내역 목록
 * @param startDate - 시작 날짜 (ISO 형식: "YYYY-MM-DD")
 * @param endDate - 종료 날짜 (ISO 형식: "YYYY-MM-DD")
 * @returns 전개된 내역 목록 (날짜순 정렬)
 *
 * @example
 * const expanded = expandEntriesForDateRange(entries, '2025-01-01', '2025-12-31');
 */
export function expandEntriesForDateRange(
  entries: Entry[],
  startDate: string,
  endDate: string,
): ExpandedEntry[] {
  // 범위 내 모든 월 생성
  const months: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // 각 월별로 전개 후 병합
  const allExpanded = months.flatMap((month) => expandEntriesForMonth(entries, month));

  // 범위 필터링
  return allExpanded.filter((e) => e.occurrence_date >= startDate && e.occurrence_date <= endDate);
}

/**
 * 실제 지출만 계산 (오늘까지)
 *
 * @param entries - 원본 내역 목록
 * @returns 총 금액
 */
export function calculateActualTotal(entries: Entry[]): number {
  const today = new Date().toISOString().split('T')[0];
  const expanded = expandEntriesForDateRange(entries, '1970-01-01', today);
  return expanded.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * 예정 포함 지출 계산 (특정 날짜까지)
 *
 * @param entries - 원본 내역 목록
 * @param untilDate - 종료 날짜 (ISO 형식: "YYYY-MM-DD")
 * @returns 총 금액
 */
export function calculateProjectedTotal(entries: Entry[], untilDate: string): number {
  const expanded = expandEntriesForDateRange(entries, '1970-01-01', untilDate);
  return expanded.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * 다음 발생 날짜 계산 (반복 내역용)
 *
 * @param entry - 반복 내역
 * @returns 다음 발생 날짜 (ISO 형식) 또는 null (종료됨)
 */
export function getNextOccurrenceDate(entry: Entry): string | null {
  if (entry.frequency === 'once') {
    return null; // 단건은 다음 발생이 없음
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // end_date가 있고 종료된 경우
  if (entry.end_date !== null) {
    const endDate = new Date(entry.end_date);
    if (today > endDate) {
      return null; // 종료된 반복 내역
    }
  }

  if (entry.frequency === 'monthly' && entry.day_of_month !== null) {
    // 월간 반복: 이번 달 또는 다음 달의 day_of_month
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), entry.day_of_month);

    const isThisMonthValid = entry.end_date === null || thisMonth <= new Date(entry.end_date);
    if (thisMonth >= today && isThisMonthValid) {
      return thisMonth.toISOString().split('T')[0];
    }

    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, entry.day_of_month);
    const isNextMonthValid = entry.end_date === null || nextMonth <= new Date(entry.end_date);

    if (isNextMonthValid) {
      return nextMonth.toISOString().split('T')[0];
    }
  } else if (entry.frequency === 'weekly' && entry.day_of_week !== null) {
    // 주간 반복: 이번 주 또는 다음 주의 day_of_week
    const currentDay = today.getDay();
    const daysUntilNext = (entry.day_of_week - currentDay + 7) % 7 || 7; // 0이면 7일 후

    const nextOccurrence = new Date(today);
    nextOccurrence.setDate(today.getDate() + daysUntilNext);

    const isValid = entry.end_date === null || nextOccurrence <= new Date(entry.end_date);
    if (isValid) {
      return nextOccurrence.toISOString().split('T')[0];
    }
  }

  return null;
}
