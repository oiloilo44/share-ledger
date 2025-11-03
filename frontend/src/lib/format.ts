/**
 * 포맷팅 유틸리티
 */

/**
 * 숫자를 천 단위 콤마가 포함된 문자열로 변환
 * @example formatCurrency(1234567) // "1,234,567"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * 금액을 부호와 함께 표시 (음수는 지출, 양수는 수입)
 * @example formatAmount(-50000) // "-50,000원"
 * @example formatAmount(30000) // "+30,000원"
 */
export function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount)}원`;
}

/**
 * 콤마가 포함된 문자열을 숫자로 변환
 * @example parseCurrency("1,234,567") // 1234567
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d-]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * 숫자만 입력 가능하도록 필터링 (음수 부호 허용)
 * @example sanitizeNumberInput("abc-123def456") // "-123456"
 */
export function sanitizeNumberInput(value: string): string {
  // 첫 번째 문자가 마이너스인 경우 유지, 나머지는 숫자만
  const hasMinusSign = value.startsWith('-');
  const digitsOnly = value.replace(/\D/g, '');
  return hasMinusSign ? `-${digitsOnly}` : digitsOnly;
}

/**
 * 날짜를 한국어 형식으로 포맷
 * @example formatDate("2025-11-03") // "2025년 11월 3일"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 날짜를 짧은 형식으로 포맷
 * @example formatDateShort("2025-11-03") // "11/03"
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * ISO 날짜 문자열을 YYYY-MM-DD 형식으로 변환
 * @example toISODateString(new Date("2025-11-03")) // "2025-11-03"
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
