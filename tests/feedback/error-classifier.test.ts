import { describe, it, expect } from 'vitest';
import { classifyErrors } from '../../src/feedback/error-classifier';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('ErrorClassifier', () => {
  it('应正确分类 ESLint 输出为 LINT_ERR', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'eslint-output.txt'), 'utf-8');
    const errors = classifyErrors('lint', output);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].category).toBe('LINT_ERR');
    expect(errors[0].line).toBe(3);
  });

  it('应正确分类 tsc 输出为 TYPE_ERR', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'tsc-output.txt'), 'utf-8');
    const errors = classifyErrors('typecheck', output);
    expect(errors.length).toBe(2);
    expect(errors[0].category).toBe('TYPE_ERR');
    expect(errors[0].file).toContain('utils.ts');
    expect(errors[1].file).toContain('helper.ts');
  });

  it('应正确分类 vitest 输出为 TEST_ERR', () => {
    const output = fs.readFileSync(path.join(FIXTURES, 'vitest-output.txt'), 'utf-8');
    const errors = classifyErrors('test', output);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].category).toBe('TEST_ERR');
  });

  it('应给 TYPE_ERR 比 TEST_ERR 更高优先级', () => {
    const typeErrs = classifyErrors('typecheck', fs.readFileSync(path.join(FIXTURES, 'tsc-output.txt'), 'utf-8'));
    const testErrs = classifyErrors('test', fs.readFileSync(path.join(FIXTURES, 'vitest-output.txt'), 'utf-8'));
    expect(typeErrs[0].priority).toBeLessThan(testErrs[0].priority);
  });

  it('空输入应返回空数组', () => {
    expect(classifyErrors('lint', '')).toEqual([]);
  });
});
