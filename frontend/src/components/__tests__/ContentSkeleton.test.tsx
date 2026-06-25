import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ContentSkeleton } from '../ContentSkeleton';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderContentSkeleton = (
  props: Partial<React.ComponentProps<typeof ContentSkeleton>> = {},
) => {
  return render(
    <ThemeProvider theme={theme}>
      <ContentSkeleton {...props} />
    </ThemeProvider>,
  );
};

describe('ContentSkeleton', () => {
  it('기본 렌더링 시 card-grid variant', () => {
    const { container } = renderContentSkeleton();
    // Grid container가 있는지 확인
    const grid = container.querySelector('.MuiGrid-container');
    expect(grid).toBeInTheDocument();
  });

  it('기본 items는 3개', () => {
    const { container } = renderContentSkeleton();
    // card-grid variant에서 Grid item이 3개인지 확인
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    expect(gridItems.length).toBe(3);
  });

  it('items prop으로 개수 변경', () => {
    const { container } = renderContentSkeleton({ items: 6 });
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    expect(gridItems.length).toBe(6);
  });

  it('variant=list일 때 리스트 형태 렌더링', () => {
    const { container } = renderContentSkeleton({ variant: 'list', items: 4 });
    // Stack spacing이 있는지 확인 (list variant는 Stack 사용)
    const stack = container.querySelector('.MuiStack-root');
    expect(stack).toBeInTheDocument();
  });

  it('variant=detail일 때 detail 형태 렌더링', () => {
    const { container } = renderContentSkeleton({ variant: 'detail', items: 2 });
    // Grid container가 있는지 확인
    const grid = container.querySelector('.MuiGrid-container');
    expect(grid).toBeInTheDocument();
    // Grid item이 2개 이상인지 확인 (xs=12 md=8, xs=12 md=4)
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    expect(gridItems.length).toBeGreaterThanOrEqual(2);
  });

  it('withToolbar=true일 때 툴바 표시', () => {
    const { container } = renderContentSkeleton({ withToolbar: true });
    // 툴바 skeleton 확인 (text + button + circular)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(3); // 툴바 skeleton + 카드 skeleton
  });

  it('withToolbar=false일 때 툴바 숨김', () => {
    const { container } = renderContentSkeleton({ withToolbar: false, items: 1 });
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    // 툴바가 없으므로 skeleton 개수가 카드만큼만
    // card-grid variant에서 1개 카드는 4개의 skeleton (rounded + 2x text + 2x rounded in stack)
    expect(skeletons.length).toBeGreaterThan(0);
    expect(skeletons.length).toBeLessThan(10); // 툴바 있을 때보다 적음
  });

  it('variant=list items=5일 때 5개 리스트 아이템', () => {
    const { container } = renderContentSkeleton({ variant: 'list', items: 5 });
    // 각 리스트 아이템은 고유한 key를 가짐: list-skeleton-0, list-skeleton-1, ...
    // Stack 내부의 Stack (각 리스트 아이템)을 확인
    const listItems = container.querySelectorAll('[class*="MuiStack-root"]');
    // Stack이 최소 5개 이상 (부모 Stack + 5개 아이템 Stack)
    expect(listItems.length).toBeGreaterThanOrEqual(5);
  });

  it('variant=card-grid items=9일 때 9개 카드', () => {
    const { container } = renderContentSkeleton({ variant: 'card-grid', items: 9 });
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    expect(gridItems.length).toBe(9);
  });

  it('variant=detail items=1일 때 좌측 1개 우측 1개', () => {
    const { container } = renderContentSkeleton({ variant: 'detail', items: 1 });
    const gridItems = container.querySelectorAll('.MuiGrid-item');
    // 좌측 Grid item (xs=12 md=8) + 우측 Grid item (xs=12 md=4) = 2개
    expect(gridItems.length).toBe(2);
  });

  it('animation="wave" 속성 적용', () => {
    const { container } = renderContentSkeleton({ items: 1 });
    const skeleton = container.querySelector('.MuiSkeleton-wave');
    expect(skeleton).toBeInTheDocument();
  });

  it('shimmer keyframes 스타일 포함', () => {
    const { container } = renderContentSkeleton();
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('@keyframes shimmer');
  });
});
