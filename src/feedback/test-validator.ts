import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Validator, TestFailure } from '../types/index';

export class TestValidator implements Validator {
  name = 'vitest';

  async validate(workspaceRoot: string): Promise<{ passed: boolean; issues: TestFailure[] }> {
    // 只有存在 vitest 配置或测试文件时才运行，否则跳过
    const hasConfig = existsSync(join(workspaceRoot, 'vitest.config.ts'))
      || existsSync(join(workspaceRoot, 'vitest.config.js'))
      || existsSync(join(workspaceRoot, 'vitest.config.mts'));

    if (!hasConfig) {
      return { passed: true, issues: [] };
    }

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
