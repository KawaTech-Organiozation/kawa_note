import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMobile } from '@/hooks/useMobile';

describe('useMobile', () => {
  beforeEach(() => {
    // Reset window.matchMedia mock before each test
    window.matchMedia.mockClear();
  });

  it('should return false when viewport is larger than 768px', () => {
    window.matchMedia.mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('should return true when viewport is smaller than 768px', () => {
    window.matchMedia.mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });
});
