import type { GuardResult } from '../types/index';
import { DANGER_PATTERNS } from './patterns';

export function guardrail(
  toolName: string,
  args: Record<string, unknown>,
  allowedPatterns: string[] = []
): GuardResult {
  // 白名单检查
  if (toolName === 'shell') {
    const cmd = (args.command as string) || '';
    for (const pattern of allowedPatterns) {
      if (cmd.includes(pattern)) {
        return { allowed: true, risk: 'LOW', reason: '匹配白名单模式' };
      }
    }

    for (const dp of DANGER_PATTERNS) {
      if (dp.regex.test(cmd)) {
        return { allowed: false, risk: dp.risk, reason: dp.description };
      }
    }
  }

  // 路径越界检查
  if (toolName === 'write_file' || toolName === 'read_file') {
    const path = (args.path as string) || '';
    if (path.includes('..')) {
      return { allowed: false, risk: 'HIGH', reason: `路径越界: ${path}` };
    }
  }

  return { allowed: true, risk: 'SAFE' };
}
