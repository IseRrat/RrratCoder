import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Validator, LintIssue } from '../types/index';

export class LintValidator implements Validator {
  name = 'eslint';

  async validate(workspaceRoot: string): Promise<{ passed: boolean; issues: LintIssue[] }> {
    const hasConfig = existsSync(join(workspaceRoot, 'eslint.config.js'))
      || existsSync(join(workspaceRoot, 'eslint.config.mjs'))
      || existsSync(join(workspaceRoot, 'eslint.config.ts'))
      || existsSync(join(workspaceRoot, '.eslintrc.json'))
      || existsSync(join(workspaceRoot, '.eslintrc.js'));

    if (!hasConfig) {
      return { passed: true, issues: [] };
    }
    try {
      execSync('npx eslint . --format json', { cwd: workspaceRoot, timeout: 30000 });
      return { passed: true, issues: [] };
    } catch (err: any) {
      try {
        const issues: LintIssue[] = JSON.parse(err.stdout || '[]');
        return { passed: false, issues };
      } catch {
        return { passed: false, issues: [] };
      }
    }
  }
}
