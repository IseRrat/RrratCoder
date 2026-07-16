import { describe, it, expect } from 'vitest';
import { classifyErrors } from '../../src/feedback/error-classifier';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('机制演示②：反馈闭环使 agent 收到反馈', () => {
  it('ESLint 输出应被分类为 LINT_ERR', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'eslint-output.txt'), 'utf-8');
    const errors = classifyErrors('lint', output);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every(e => e.category === 'LINT_ERR')).toBe(true);
  });

  it('tsc 输出应被分类为 TYPE_ERR 并解析文件信息', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'tsc-output.txt'), 'utf-8');
    const errors = classifyErrors('typecheck', output);
    expect(errors).toHaveLength(2);
    expect(errors[0].file).toContain('utils.ts');
    expect(errors[0].message).toContain('TS2322');
  });

  it('vitest 输出应被分类为 TEST_ERR', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'vitest-output.txt'), 'utf-8');
    const errors = classifyErrors('test', output);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('测试失败');
  });

  it('优先级: TYPE_ERR(2) < TEST_ERR(3) — 类型错误更优先', () => {
    const typeErrs = classifyErrors('typecheck', fs.readFileSync(path.join(FIXTURES, 'tsc-output.txt'), 'utf-8'));
    const testErrs = classifyErrors('test', fs.readFileSync(path.join(FIXTURES, 'vitest-output.txt'), 'utf-8'));
    expect(typeErrs[0].priority).toBeLessThan(testErrs[0].priority);
  });
});
