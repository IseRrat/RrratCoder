import type { ClassifiedError } from '../types/index';

export function classifyErrors(
  validatorName: 'lint' | 'typecheck' | 'test',
  output: string
): ClassifiedError[] {
  if (!output.trim()) return [];

  switch (validatorName) {
    case 'lint': return classifyLintOutput(output);
    case 'typecheck': return classifyTypeCheckOutput(output);
    case 'test': return classifyTestOutput(output);
  }
}

function classifyLintOutput(output: string): ClassifiedError[] {
  const errors: ClassifiedError[] = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)\s*$/);
    if (match) {
      errors.push({
        category: 'LINT_ERR',
        line: parseInt(match[1]),
        message: match[4],
        priority: 1,
      });
    }
  }
  return errors;
}

function classifyTypeCheckOutput(output: string): ClassifiedError[] {
  const errors: ClassifiedError[] = [];
  const regex = /(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    errors.push({
      category: 'TYPE_ERR',
      file: match[1],
      line: parseInt(match[2]),
      message: `[${match[4]}] ${match[5]}`,
      priority: 2,
    });
  }
  return errors;
}

function classifyTestOutput(output: string): ClassifiedError[] {
  const errors: ClassifiedError[] = [];
  const failRegex = /FAIL\s+(.+?)\s+>\s+(.+?)\s+>\s+(.+)/g;
  let match;
  while ((match = failRegex.exec(output)) !== null) {
    errors.push({
      category: 'TEST_ERR',
      file: match[1],
      message: `测试失败: ${match[2]} > ${match[3]}`,
      priority: 3,
    });
  }
  // 寻找 AssertionError 补充信息
  for (const line of output.split('\n')) {
    const m = line.match(/AssertionError:\s+(.+)/);
    if (m && errors.length > 0) {
      errors[errors.length - 1].message += ` — ${m[1]}`;
    }
  }
  return errors;
}
