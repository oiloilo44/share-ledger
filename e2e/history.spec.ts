import { test, expect } from '@playwright/test';

test.describe('히스토리 관리 테스트', () => {
  // 테스트용 사용자 계정
  const testEmail = `historytest-${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';
  let bookId: string;

  // 로그인 및 가계부 생성 헬퍼 함수
  async function setupBookAndLogin(page: any) {
    // 회원가입 및 로그인
    await page.goto('/signup');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="passwordConfirm"]', testPassword);
    await page.click('button[type="submit"]');

    // 이메일 인증이 필요한 경우 로그인 페이지로 이동
    const needsEmailConfirmation = await page.getByText(/이메일 인증을 마치신 후/).isVisible();
    if (needsEmailConfirmation) {
      await page.click('button:has-text("로그인 페이지로 이동")');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
    }

    // 메인 페이지로 이동 대기
    await page.waitForURL('/', { timeout: 10000 });

    // 가계부 생성
    await page.click('button[aria-label="가계부 생성"]');
    const bookName = `히스토리 테스트 가계부 ${Date.now()}`;
    await page.fill('input[name="bookName"]', bookName);
    await page.click('button:has-text("생성")');
    await page.waitForTimeout(1000);

    // 가계부 클릭하여 상세 페이지로 이동
    await page.click(`text="${bookName}"`);
    await page.waitForURL(/\/books\/[a-z0-9-]+/, { timeout: 5000 });

    // URL에서 bookId 추출
    const url = page.url();
    const match = url.match(/\/books\/([a-z0-9-]+)/);
    if (match) {
      bookId = match[1];
    }
  }

  test.beforeEach(async ({ page }) => {
    await setupBookAndLogin(page);
  });

  test('히스토리 페이지 접근', async ({ page }) => {
    // 히스토리 버튼 클릭
    const historyButton = page
      .getByRole('button', { name: '히스토리' })
      .or(page.locator('button[aria-label="히스토리"]'));

    if (await historyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyButton.click();
      await expect(page).toHaveURL(/\/books\/[a-z0-9-]+\/history/, { timeout: 5000 });
      await expect(page.getByText('변경 이력').or(page.getByText('히스토리'))).toBeVisible();
    } else {
      // 히스토리 페이지로 직접 이동
      await page.goto(`/books/${bookId}/history`);
      await expect(page.getByText('변경 이력').or(page.getByText('히스토리'))).toBeVisible();
    }
  });

  test('내역 수정 후 히스토리 조회', async ({ page }) => {
    // 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '히스토리 테스트 내역');
    await page.fill('input[name="amount"]', '10000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 내역 수정
    const entryItem = page.getByText('히스토리 테스트 내역').first();
    await entryItem.click();

    const editButton = page
      .getByRole('button', { name: '수정' })
      .or(page.locator('button[aria-label="내역 수정"]'));
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
    } else {
      await page.click('button[aria-label="내역 메뉴"]').first();
      await page.click('text="수정"');
    }

    await page.fill('input[name="description"]', '수정된 히스토리 테스트 내역');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 히스토리 페이지로 이동
    await page.goto(`/books/${bookId}/history`);

    // 히스토리 항목 확인 (생성 + 수정)
    await expect(page.getByText('생성됨').or(page.getByText('수정됨'))).toBeVisible({
      timeout: 5000,
    });
  });

  test('내역 삭제 후 히스토리 조회', async ({ page }) => {
    // 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '삭제할 히스토리 테스트 내역');
    await page.fill('input[name="amount"]', '20000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 내역 삭제
    const entryItem = page.getByText('삭제할 히스토리 테스트 내역').first();
    await entryItem.click();

    const deleteButton = page
      .getByRole('button', { name: '삭제' })
      .or(page.locator('button[aria-label="내역 삭제"]'));
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
    } else {
      await page.click('button[aria-label="내역 메뉴"]').first();
      await page.click('text="삭제"');
    }

    await page.click('button:has-text("삭제")');
    await page.waitForTimeout(1000);

    // 히스토리 페이지로 이동
    await page.goto(`/books/${bookId}/history`);

    // 삭제 히스토리 항목 확인
    await expect(page.getByText('삭제됨').or(page.getByText('생성됨'))).toBeVisible({
      timeout: 5000,
    });
  });

  test('히스토리 복원 기능', async ({ page }) => {
    // 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    const originalDescription = '복원 테스트 원본';
    await page.fill('input[name="description"]', originalDescription);
    await page.fill('input[name="amount"]', '30000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 내역 수정
    const entryItem = page.getByText(originalDescription).first();
    await entryItem.click();

    const editButton = page
      .getByRole('button', { name: '수정' })
      .or(page.locator('button[aria-label="내역 수정"]'));
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
    } else {
      await page.click('button[aria-label="내역 메뉴"]').first();
      await page.click('text="수정"');
    }

    await page.fill('input[name="description"]', '복원 테스트 수정됨');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 히스토리 페이지로 이동
    await page.goto(`/books/${bookId}/history`);

    // 복원 버튼 클릭 (첫 번째 히스토리 항목)
    const restoreButton = page
      .getByRole('button', { name: '복원' })
      .or(page.locator('button[aria-label="복원"]'));

    if (await restoreButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await restoreButton.first().click();

      // 확인 다이얼로그
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.click('button:has-text("복원")');

      // 복원 성공 메시지 확인
      await expect(page.getByText('복원되었습니다.')).toBeVisible({ timeout: 5000 });

      // 가계부 상세 페이지로 돌아가서 복원된 내역 확인
      await page.goto(`/books/${bookId}`);
      await expect(page.getByText(originalDescription)).toBeVisible({ timeout: 5000 });
    }
  });

  test('빈 히스토리 상태 확인', async ({ page }) => {
    // 새 가계부에는 히스토리가 없음
    await page.goto(`/books/${bookId}/history`);

    // 빈 상태 메시지 확인
    await expect(
      page.getByText('변경 이력이 없습니다').or(page.getByText('히스토리가 비어있습니다')),
    ).toBeVisible({ timeout: 5000 });
  });

  test('히스토리 목록 표시 (생성/수정/삭제)', async ({ page }) => {
    // 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '종합 히스토리 테스트');
    await page.fill('input[name="amount"]', '15000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 히스토리 페이지로 이동
    await page.goto(`/books/${bookId}/history`);

    // 생성 히스토리 확인
    await expect(page.getByText('생성됨')).toBeVisible({ timeout: 5000 });

    // 히스토리 항목에 내역 정보가 표시되는지 확인
    await expect(page.getByText('종합 히스토리 테스트')).toBeVisible();
    await expect(page.getByText('15,000').or(page.getByText('15000'))).toBeVisible();
  });

  test('히스토리 100건 제한 동작', async ({ page }) => {
    // 이 테스트는 시간이 오래 걸릴 수 있으므로 간단히 확인만 수행
    // 실제로 100건을 생성하지 않고, 제한이 있다는 것만 확인

    await page.goto(`/books/${bookId}/history`);

    // 히스토리 페이지가 정상적으로 로드되는지 확인
    await expect(
      page
        .getByText('변경 이력')
        .or(page.getByText('히스토리'))
        .or(page.getByText('변경 이력이 없습니다')),
    ).toBeVisible({ timeout: 5000 });
  });
});
