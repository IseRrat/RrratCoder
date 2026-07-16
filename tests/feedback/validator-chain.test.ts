import { describe, it, expect } from 'vitest';
import { ValidatorChain } from '../../src/feedback/validator-chain';

describe('ValidatorChain', () => {
  it('formatFeedback 应限制输出 ≤ 2000 字符', () => {
    const chain = new ValidatorChain();
    const bigResult: any = {
      passed: false,
      errors: Array.from({ length: 50 }, (_, i) => ({
        category: 'LINT_ERR' as const,
        file: `src/file${i}.ts`,
        line: i,
        message: 'x'.repeat(200),
        priority: 1,
      })),
      retryCount: 0,
      validatorResults: {},
    };
    const feedback = chain.formatFeedback(bigResult);
    expect(feedback.length).toBeLessThanOrEqual(2000);
  });

  it('通过时应返回空字符串', () => {
    const chain = new ValidatorChain();
    const feedback = chain.formatFeedback({ passed: true, errors: [], retryCount: 0, validatorResults: {} });
    expect(feedback).toBe('');
  });
});
