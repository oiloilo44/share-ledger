import '@testing-library/jest-dom';
import { expect } from 'vitest';

// Emotion CSS 클래스명의 동적 해시를 정규화하는 스냅샷 serializer
// 스냅샷에서 css-{hash}- 형태의 클래스명을 css-HASH-로 정규화하여
// 스타일 변경 시에도 스냅샷이 깨지지 않도록 합니다
expect.addSnapshotSerializer({
  test: (val) => {
    // 문자열이고 emotion css 클래스가 포함된 경우에만 처리
    return typeof val === 'string' && /css-[a-z0-9]+-/.test(val);
  },
  serialize: (val, config, indentation, depth, refs, printer) => {
    // Emotion CSS 해시를 정규화 (css-{hash}- -> css-HASH-)
    const normalized = (val as string).replace(/css-[a-z0-9]+-/g, 'css-HASH-');
    return printer(normalized, config, indentation, depth, refs);
  },
});
