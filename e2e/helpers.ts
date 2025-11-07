import { Page } from '@playwright/test';

/**
 * 회원가입 및 로그인 헬퍼 함수
 */
export async function signupAndLogin(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="passwordConfirm"]', password);
  await page.click('button[type="submit"]');

  // 이메일 인증이 필요한 경우 로그인 페이지로 이동
  const needsEmailConfirmation = await page
    .getByText(/이메일 인증을 마치신 후/)
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (needsEmailConfirmation) {
    await page.click('button:has-text("로그인 페이지로 이동")');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
  }

  // 메인 페이지로 이동 대기
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * 가계부 생성 헬퍼 함수
 */
export async function createBook(page: Page, bookName: string): Promise<string | null> {
  await page.goto('/');
  await page.click('button[aria-label="가계부 생성"]');
  await page.fill('input[name="bookName"]', bookName);
  await page.click('button:has-text("생성")');
  await page.waitForTimeout(1000);

  // 가계부 클릭하여 상세 페이지로 이동
  await page.click(`text="${bookName}"`);
  await page.waitForURL(/\/books\/[a-z0-9-]+/, { timeout: 5000 });

  // URL에서 bookId 추출
  const url = page.url();
  const match = url.match(/\/books\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * 내역 추가 헬퍼 함수
 */
export async function addEntry(
  page: Page,
  description: string,
  amount: string,
  type: 'income' | 'expense' = 'expense',
) {
  await page.click('button[aria-label="내역 추가"]');
  await page.fill('input[name="description"]', description);
  await page.fill('input[name="amount"]', amount);

  const typeButton = page.getByRole('button', { name: type === 'income' ? '수입' : '지출' });
  if (await typeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await typeButton.click();
  }

  await page.click('button:has-text("저장")');
  await page.waitForTimeout(1000);
}

/**
 * 로그아웃 헬퍼 함수
 */
export async function logout(page: Page) {
  await page.click('button[aria-label="account menu"]');
  await page.click('text="로그아웃"');
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * 랜덤 이메일 생성
 */
export function generateTestEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

/**
 * 테스트용 비밀번호
 */
export const TEST_PASSWORD = 'testPassword123!';
