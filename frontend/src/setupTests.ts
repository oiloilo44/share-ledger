import '@testing-library/jest-dom';
import { beforeEach, expect, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://dummy.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'dummy-public-anon-key');
vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const installStorage = () => {
  const storage = createMemoryStorage();
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
};

installStorage();

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dummy.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'dummy-public-anon-key');
  vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
  localStorage.clear();
});

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
