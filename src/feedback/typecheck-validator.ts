import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Validator, TypeCheckError } from '../types/index';

export class TypeCheckValidator implements Validator {
  name = 'tsc';

  async validate(workspaceRoot: string): Promise<{ passed: boolean; issues: TypeCheckError[] }> {
    const tsconfig = join(workspaceRoot, 'tsconfig.json');
    if (!existsSync(tsconfig)) return { passed: true, issues: [] };
    try {
      execSync('npx tsc --noEmit', { cwd: workspaceRoot, timeout: 60000, encoding: 'utf-8' });
      return { passed: true, issues: [] };
    } catch (err: any) {
      const output = err.stdout || err.stderr || '';
      const issues: TypeCheckError[] = [];
      const regex = /(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/g;
      let m;
      while ((m = regex.exec(output)) !== null) {
        issues.push({ file: m[1], line: parseInt(m[2]), message: `[${m[4]}] ${m[5]}`, code: parseInt(m[4].slice(2)) });
      }
      return { passed: false, issues };
    }
  }
}
