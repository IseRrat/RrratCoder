import { describe, it, expect } from 'vitest';
import { RetryState } from '../../src/feedback/retry-state';

describe('机制演示③：重试状态机 (main contribution 深度)', () => {
  it('maxRetries=3 时第3次可重试，第4次不可重试', () => {
    const state = new RetryState(3);
    expect(state.current).toBe(0);
    expect(state.canRetry).toBe(true);

    state.increment();
    expect(state.current).toBe(1);
    expect(state.canRetry).toBe(true);

    state.increment();
    expect(state.current).toBe(2);
    expect(state.canRetry).toBe(true);

    state.increment();
    expect(state.current).toBe(3);
    expect(state.canRetry).toBe(false);
  });

  it('单次修正后 reset 恢复可重试', () => {
    const state = new RetryState(3);
    state.increment();
    state.increment();
    state.increment();
    expect(state.canRetry).toBe(false);

    state.reset();
    expect(state.current).toBe(0);
    expect(state.canRetry).toBe(true);
  });

  it('多轮循环中的状态转换', () => {
    const state = new RetryState(3);

    // Round 1: 校验失败 → increment
    state.increment();
    expect(state.canRetry).toBe(true);

    // Round 2: 校验通过 → reset
    state.reset();
    expect(state.canRetry).toBe(true);
    expect(state.current).toBe(0);

    // Round 3-5: 连续三次失败
    state.increment(); // 1
    state.increment(); // 2
    state.increment(); // 3
    expect(state.canRetry).toBe(false);
  });
});
