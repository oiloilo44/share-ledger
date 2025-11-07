import { test, expect } from '@playwright/test';

test.describe('내역 관리 테스트', () => {
  // 테스트용 사용자 계정
  const testEmail = `entrytest-${Date.now()}@example.com`;
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
    const bookName = `내역 테스트 가계부 ${Date.now()}`;
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

  test('내역 추가 (지출)', async ({ page }) => {
    // 내역 추가 버튼 클릭
    await page.click('button[aria-label="내역 추가"]');

    // 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('새 내역 추가')).toBeVisible();

    // 내역 정보 입력
    await page.fill('input[name="description"]', '테스트 지출');
    await page.fill('input[name="amount"]', '10000');

    // 지출 선택 (기본값이 지출일 수 있음)
    const expenseButton = page.getByRole('button', { name: '지출' }).or(page.getByText('지출'));
    if (await expenseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expenseButton.click();
    }

    // 카테고리 입력 (선택사항)
    const categoryInput = page.locator('input[name="category"]');
    if (await categoryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryInput.fill('식비');
    }

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 다이얼로그가 닫히고 토스트 메시지 확인
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('내역을 추가했습니다.').or(page.getByText('테스트 지출')),
    ).toBeVisible({ timeout: 5000 });

    // 추가된 내역이 목록에 표시되는지 확인
    await expect(page.getByText('테스트 지출')).toBeVisible();
  });

  test('내역 추가 (수입)', async ({ page }) => {
    // 내역 추가 버튼 클릭
    await page.click('button[aria-label="내역 추가"]');

    // 내역 정보 입력
    await page.fill('input[name="description"]', '테스트 수입');
    await page.fill('input[name="amount"]', '50000');

    // 수입 선택
    const incomeButton = page.getByRole('button', { name: '수입' }).or(page.getByText('수입'));
    if (await incomeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await incomeButton.click();
    }

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 추가된 내역 확인
    await expect(page.getByText('테스트 수입')).toBeVisible({ timeout: 5000 });
  });

  test('내역 수정', async ({ page }) => {
    // 먼저 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '수정 전 내역');
    await page.fill('input[name="amount"]', '15000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 내역 클릭 또는 메뉴 열기
    const entryItem = page.getByText('수정 전 내역').first();
    await entryItem.click();

    // 수정 버튼 찾기
    const editButton = page
      .getByRole('button', { name: '수정' })
      .or(page.locator('button[aria-label="내역 수정"]'));
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
    } else {
      // Bottom sheet나 다른 형태의 수정 UI
      await page.click('button[aria-label="내역 메뉴"]').first();
      await page.click('text="수정"');
    }

    // 수정 다이얼로그 확인
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // 새 내용 입력
    await page.fill('input[name="description"]', '수정 후 내역');
    await page.fill('input[name="amount"]', '25000');

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 수정된 내역 확인
    await expect(page.getByText('수정 후 내역')).toBeVisible({ timeout: 5000 });
  });

  test('내역 삭제', async ({ page }) => {
    // 먼저 내역 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '삭제할 내역');
    await page.fill('input[name="amount"]', '20000');
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 내역 클릭
    const entryItem = page.getByText('삭제할 내역').first();
    await entryItem.click();

    // 삭제 버튼 찾기
    const deleteButton = page
      .getByRole('button', { name: '삭제' })
      .or(page.locator('button[aria-label="내역 삭제"]'));
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
    } else {
      // 메뉴에서 삭제
      await page.click('button[aria-label="내역 메뉴"]').first();
      await page.click('text="삭제"');
    }

    // 삭제 확인 다이얼로그
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/정말 삭제하시겠습니까/)).toBeVisible();

    // 삭제 확인
    await page.click('button:has-text("삭제")');

    // 삭제된 내역이 목록에서 사라졌는지 확인
    await expect(page.getByText('삭제할 내역')).not.toBeVisible({ timeout: 5000 });
  });

  test('내역 필터링 (수입/지출)', async ({ page }) => {
    // 수입과 지출 각각 추가
    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '필터 테스트 수입');
    await page.fill('input[name="amount"]', '30000');
    const incomeButton = page.getByRole('button', { name: '수입' }).or(page.getByText('수입'));
    if (await incomeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await incomeButton.click();
    }
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    await page.click('button[aria-label="내역 추가"]');
    await page.fill('input[name="description"]', '필터 테스트 지출');
    await page.fill('input[name="amount"]', '10000');
    const expenseButton = page.getByRole('button', { name: '지출' }).or(page.getByText('지출'));
    if (await expenseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expenseButton.click();
    }
    await page.click('button:has-text("저장")');
    await page.waitForTimeout(1000);

    // 필터 버튼 클릭
    const filterButton = page
      .getByRole('button', { name: '필터' })
      .or(page.locator('button[aria-label="필터"]'));
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();

      // 수입만 필터링
      await page.click('text="수입"');
      await page.waitForTimeout(500);

      // 지출 내역이 보이지 않는지 확인
      await expect(page.getByText('필터 테스트 지출')).not.toBeVisible();
      await expect(page.getByText('필터 테스트 수입')).toBeVisible();
    }
  });

  test('반복 내역 추가 (월간)', async ({ page }) => {
    // 내역 추가 버튼 클릭
    await page.click('button[aria-label="내역 추가"]');

    // 내역 정보 입력
    await page.fill('input[name="description"]', '월간 반복 테스트');
    await page.fill('input[name="amount"]', '5000');

    // 반복 설정 (있는 경우)
    const frequencySelect = page.locator('select[name="frequency"]');
    if (await frequencySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await frequencySelect.selectOption('monthly');
    }

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 추가된 내역 확인
    await expect(page.getByText('월간 반복 테스트')).toBeVisible({ timeout: 5000 });
  });
});
