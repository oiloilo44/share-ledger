import { test, expect } from '@playwright/test';

test.describe('인증 기능 테스트', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('회원가입 → 로그인 → 로그아웃 플로우', async ({ page }) => {
    // 회원가입 페이지로 이동
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
    await expect(page.getByRole('heading', { name: 'ShareLedger' })).toBeVisible();

    // 회원가입 폼 작성
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="passwordConfirm"]', testPassword);

    // 회원가입 버튼 클릭
    await page.click('button[type="submit"]');

    // 회원가입 성공 메시지 확인 (이메일 인증 필요 또는 바로 로그인)
    await expect(
      page.getByText(/회원가입이 완료되었습니다/).or(page.getByText(/이메일 인증을 마치신 후/)),
    ).toBeVisible({ timeout: 10000 });

    // 이메일 인증이 필요한 경우 로그인 페이지로 이동
    const needsEmailConfirmation = await page.getByText(/이메일 인증을 마치신 후/).isVisible();
    if (needsEmailConfirmation) {
      await page.click('button:has-text("로그인 페이지로 이동")');
      await expect(page).toHaveURL('/login');
    } else {
      // 바로 로그인된 경우 메인 페이지로 리다이렉트 대기
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page).toHaveURL('/');

      // 로그아웃 테스트
      await page.click('button[aria-label="account menu"]');
      await page.click('text="로그아웃"');
      await expect(page).toHaveURL('/login');
    }
  });

  test('로그인 실패 - 잘못된 비밀번호', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.getByText(/로그인에 실패했습니다/)).toBeVisible({ timeout: 5000 });
  });

  test('로그인 실패 - 빈 필드', async ({ page }) => {
    await page.goto('/login');

    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.getByText('이메일과 비밀번호를 입력해주세요.')).toBeVisible();
  });

  test('회원가입 실패 - 비밀번호 불일치', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="passwordConfirm"]', 'differentPassword');
    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  });

  test('회원가입 실패 - 짧은 비밀번호', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', '12345');
    await page.fill('input[name="passwordConfirm"]', '12345');
    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.getByText('비밀번호는 최소 6자 이상이어야 합니다.')).toBeVisible();
  });

  test('비밀번호 재설정 다이얼로그 열기', async ({ page }) => {
    await page.goto('/login');

    // 비밀번호 재설정 링크 클릭
    await page.click('button:has-text("비밀번호를 잊으셨나요?")');

    // 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('비밀번호 재설정')).toBeVisible();

    // 다이얼로그 닫기
    await page.click('button:has-text("닫기")');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
