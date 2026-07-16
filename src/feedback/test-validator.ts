import { execSync } from 'child_process';
import type { Validator, TestFailure } from '../types/index';

export class TestValidator implements Validator {
  name = 'vitest';

  async validate(workspaceRoot: string): Promise<{ passed: boolean; issues: TestFailure[] }> {
    try {
      execSync('npx vitest run', { cwd: workspaceRoot, timeout: 60000, encoding: 'utf-8' });
      return { passed: true, issues: [] };
    } catch (err: any) {
      const output = err.stdout || err.stderr || '';
      const issues: TestFailure[] = [];
      const failRegex = /FAIL\s+(.+?)\s+>\s+(.+?)\s+>\s+(.+)/g;
      let m;
      while ((m = failRegex.exec(output)) !== null) {
        issues.push({ testName: `${m[2]} > ${m[3]}`, message: `文件: ${m[1]}` });
      }
      return { passed: false, issues };
    }
  }
}
