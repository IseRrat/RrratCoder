import { describe, it, expect } from 'vitest';
import { RetryState } from '../../src/feedback/retry-state';

describe('RetryState', () => {
  it('maxRetries=3 时第4次应不可重试', () => {
    const state = new RetryState(3);
    expect(state.canRetry).toBe(true);
    state.increment(); // 1
    expect(state.canRetry).toBe(true);
    state.increment(); // 2
    expect(state.canRetry).toBe(true);
    state.increment(); // 3
    expect(state.canRetry).toBe(false);
  });

  it('reset 后应恢复可重试', () => {
    const state = new RetryState(2);
    state.increment();
    state.increment();
    expect(state.canRetry).toBe(false);
    state.reset();
    expect(state.canRetry).toBe(true);
    expect(state.current).toBe(0);
  });

  it('默认 maxRetries=3', () => {
    const state = new RetryState();
    expect(state.canRetry).toBe(true);
    state.increment();
    state.increment();
    state.increment();
    expect(state.canRetry).toBe(false);
  });
});
