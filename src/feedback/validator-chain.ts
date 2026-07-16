import { classifyErrors } from './error-classifier';
import { LintValidator } from './lint-validator';
import { TypeCheckValidator } from './typecheck-validator';
import { TestValidator } from './test-validator';
import type { FeedbackResult, Validator } from '../types/index';

export class ValidatorChain {
  private validators: Validator[];

  constructor() {
    this.validators = [
      new LintValidator(),
      new TypeCheckValidator(),
      new TestValidator(),
    ];
  }

  async run(workspaceRoot: string): Promise<FeedbackResult> {
    const result: FeedbackResult = {
      passed: true,
      errors: [],
      retryCount: 0,
      validatorResults: {},
    };

    for (const validator of this.validators) {
      const validation = await validator.validate(workspaceRoot);
      if (validator.name === 'eslint') result.validatorResults.lint = validation as any;
      else if (validator.name === 'tsc') result.validatorResults.typeCheck = validation as any;
      else if (validator.name === 'vitest') result.validatorResults.test = validation as any;

      if (!validation.passed) {
        result.passed = false;
        const classified = classifyErrors(
          validator.name === 'eslint' ? 'lint' : validator.name === 'tsc' ? 'typecheck' : 'test',
          JSON.stringify(validation.issues)
        );
        result.errors.push(...classified);
      }
    }

    result.errors.sort((a, b) => a.priority - b.priority);
    return result;
  }

  formatFeedback(result: FeedbackResult): string {
    if (result.passed) return '';

    const errorsByCat: Record<string, string[]> = {};
    for (const err of result.errors.slice(0, 10)) {
      const cat = err.category;
      if (!errorsByCat[cat]) errorsByCat[cat] = [];
      errorsByCat[cat].push(`[${cat}] ${err.file || ''}:${err.line || ''} — ${err.message}`);
    }

    let feedback = '上次操作后校验失败：\n';
    for (const [cat, msgs] of Object.entries(errorsByCat)) {
      feedback += msgs.map(m => `  ${m}`).join('\n') + '\n';
    }
    return feedback.slice(0, 2000);
  }
}
