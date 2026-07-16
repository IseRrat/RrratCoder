export interface DangerPattern {
  regex: RegExp;
  risk: 'FATAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

export const DANGER_PATTERNS: DangerPattern[] = [
  { regex: /rm\s+-rf\s+\//, risk: 'FATAL', description: '删除根目录' },
  { regex: /rm\s+-rf\s+\/\*/, risk: 'FATAL', description: '删除所有文件' },
  { regex: /mkfs\./, risk: 'FATAL', description: '格式化磁盘' },
  { regex: /:\(\)\s*\{\s*:\|:/, risk: 'FATAL', description: 'Fork bomb' },
  { regex: />\s*\/dev\/sda/, risk: 'FATAL', description: '覆写磁盘设备' },
  { regex: /git\s+push\s+--force.*(main|master)/, risk: 'FATAL', description: '强制推送主分支' },
  { regex: /git\s+push\s+--force/, risk: 'HIGH', description: '强制推送' },
  { regex: /curl.*\|.*(sh|bash)/, risk: 'HIGH', description: '管道执行远程脚本' },
  { regex: /wget.*\|.*(sh|bash)/, risk: 'HIGH', description: '管道执行远程脚本' },
  { regex: /chmod\s+777/, risk: 'MEDIUM', description: '权限全开' },
  { regex: /chown\s+-R/, risk: 'MEDIUM', description: '递归修改所有者' },
];
