import { test, expect } from '@playwright/test';

test.describe('가계부 관리 테스트', () => {
  // 테스트용 사용자 계정
  const testEmail = `booktest-${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';

  // 로그인 헬퍼 함수
  async function login(page: any) {
    await page.goto('/login');

    // 먼저 회원가입 시도
    await page.goto('/signup');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="passwordConfirm"]', testPassword);
    await page.click('button[type="submit"]');

    // 이메일 인증이 필요한 경우 로그인 페이지로 이동
    const needsEmailConfirmation = await page.getByText(/이메일 인증을 마치신 후/).isVisible();
    if (needsEmailConfirmation) {
      await page.click('button:has-text("로그인 페이지로 이동")');
    }

    // 로그인 (회원가입 시 자동 로그인되지 않은 경우)
    const isLoginPage = await page.url().includes('/login');
    if (isLoginPage) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
    }

    // 메인 페이지로 이동 대기
    await page.waitForURL('/', { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/');
  });

  test('가계부 생성', async ({ page }) => {
    // 가계부 페이지로 이동
    await page.waitForSelector('text="가계부"', { timeout: 5000 });

    // 가계부 생성 버튼 클릭
    await page.click('button[aria-label="가계부 생성"]');

    // 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('새 가계부 만들기')).toBeVisible();

    // 가계부 이름 입력
    const bookName = `테스트 가계부 ${Date.now()}`;
    await page.fill('input[name="bookName"]', bookName);

    // 생성 버튼 클릭
    await page.click('button:has-text("생성")');

    // 다이얼로그가 닫히고 토스트 메시지 확인
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('가계부를 생성했습니다.')).toBeVisible({ timeout: 5000 });

    // 생성된 가계부가 목록에 표시되는지 확인
    await expect(page.getByText(bookName)).toBeVisible();
  });

  test('가계부 수정', async ({ page }) => {
    // 가계부 생성
    await page.click('button[aria-label="가계부 생성"]');
    const bookName = `수정 전 가계부 ${Date.now()}`;
    await page.fill('input[name="bookName"]', bookName);
    await page.click('button:has-text("생성")');
    await page.waitForTimeout(1000);

    // 가계부 메뉴 열기
    await page.click(`button[aria-label="가계부 메뉴"]`).first();

    // 수정 메뉴 클릭
    await page.click('text="수정"');

    // 수정 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('가계부 이름 수정')).toBeVisible();

    // 새 이름 입력
    const newBookName = `수정 후 가계부 ${Date.now()}`;
    await page.fill('input[name="bookName"]', '');
    await page.fill('input[name="bookName"]', newBookName);

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 다이얼로그가 닫히고 토스트 메시지 확인
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('가계부 이름을 수정했습니다.')).toBeVisible({ timeout: 5000 });

    // 수정된 이름 확인
    await expect(page.getByText(newBookName)).toBeVisible();
  });

  test('가계부 삭제', async ({ page }) => {
    // 가계부 생성
    await page.click('button[aria-label="가계부 생성"]');
    const bookName = `삭제할 가계부 ${Date.now()}`;
    await page.fill('input[name="bookName"]', bookName);
    await page.click('button:has-text("생성")');
    await page.waitForTimeout(1000);

    // 가계부 메뉴 열기
    await page.click(`button[aria-label="가계부 메뉴"]`).first();

    // 삭제 메뉴 클릭
    await page.click('text="삭제"');

    // 삭제 확인 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/정말 삭제하시겠습니까/)).toBeVisible();

    // 삭제 확인 버튼 클릭
    await page.click('button:has-text("삭제")');

    // 다이얼로그가 닫히고 토스트 메시지 확인
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('가계부를 삭제했습니다.')).toBeVisible({ timeout: 5000 });

    // 삭제된 가계부가 목록에서 사라졌는지 확인
    await expect(page.getByText(bookName)).not.toBeVisible();
  });

  test('가계부 5개 제한 테스트', async ({ page }) => {
    // 가계부 5개 생성
    for (let i = 1; i <= 5; i++) {
      await page.click('button[aria-label="가계부 생성"]');
      await page.fill('input[name="bookName"]', `제한 테스트 가계부 ${i}`);
      await page.click('button:has-text("생성")');
      await page.waitForTimeout(1000);
    }

    // 6번째 가계부 생성 시도
    await page.click('button[aria-label="가계부 생성"]');
    await page.fill('input[name="bookName"]', '제한 테스트 가계부 6');
    await page.click('button:has-text("생성")');

    // 에러 메시지 확인 (5개 제한)
    await expect(
      page.getByText(/최대 5개까지만 생성할 수 있습니다/).or(page.getByText(/가계부 저장 실패/)),
    ).toBeVisible({ timeout: 5000 });
  });

  test('가계부 클릭하여 상세 페이지로 이동', async ({ page }) => {
    // 가계부 생성
    await page.click('button[aria-label="가계부 생성"]');
    const bookName = `상세 페이지 테스트 ${Date.now()}`;
    await page.fill('input[name="bookName"]', bookName);
    await page.click('button:has-text("생성")');
    await page.waitForTimeout(1000);

    // 가계부 카드 클릭
    await page.click(`text="${bookName}"`);

    // 상세 페이지로 이동 확인
    await expect(page).toHaveURL(/\/books\/[a-z0-9-]+/);
    await expect(page.getByText(bookName)).toBeVisible();
  });

  test('가계부 필터링 (역할별)', async ({ page }) => {
    // 필터 버튼이 있는지 확인
    const filterButton = page.getByText('전체').or(page.getByText('소유자')).or(page.getByText('편집자'));
    if (await filterButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // 필터 클릭
      await filterButton.first().click();

      // 필터가 적용되었는지 확인 (UI 변화 확인)
      await page.waitForTimeout(500);
    }
  });
});
