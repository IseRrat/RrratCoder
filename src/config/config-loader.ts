import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { HarnessConfig } from '../types/index';

const DEFAULT_CONFIG: HarnessConfig = {
  llm: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.1,
  },
  agent: {
    maxRounds: 10,
    maxRetries: 3,
    workspaceRoot: './workspace',
    allowedPaths: [],
  },
  guardrails: {
    mode: 'prompt',
    allowedPatterns: [],
  },
};

export function loadConfig(filePath: string): HarnessConfig {
  if (!existsSync(filePath)) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.warn(`配置文件 ${filePath} 不存在，已创建默认配置`);
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const userConfig = JSON.parse(raw) as Partial<HarnessConfig>;
    return mergeWithDefaults(userConfig);
  } catch (err) {
    console.warn(`配置文件解析失败: ${(err as Error).message}，使用默认配置`);
    return { ...DEFAULT_CONFIG };
  }
}

function mergeWithDefaults(user: Partial<HarnessConfig>): HarnessConfig {
  return {
    llm: { ...DEFAULT_CONFIG.llm, ...user.llm },
    agent: {
      ...DEFAULT_CONFIG.agent,
      ...user.agent,
      maxRounds: (user.agent?.maxRounds ?? 0) > 0 ? user.agent!.maxRounds : DEFAULT_CONFIG.agent.maxRounds,
    },
    guardrails: { ...DEFAULT_CONFIG.guardrails, ...user.guardrails },
  };
}
