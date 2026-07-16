import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/config-loader';
import * as path from 'path';
import * as os from 'os';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('ConfigLoader', () => {
  it('应该加载有效配置文件', () => {
    const config = loadConfig(path.join(FIXTURES, 'valid-config.json'));
    expect(config.agent.maxRounds).toBe(10);
    expect(config.agent.maxRetries).toBe(3);
    expect(config.guardrails.mode).toBe('prompt');
  });

  it('配置文件不存在时返回默认值', () => {
    const config = loadConfig(path.join(os.tmpdir(), 'rrratcoder-test-nonexistent', 'config.json'));
    expect(config.agent.maxRounds).toBe(10);
    expect(config.agent.maxRetries).toBe(3);
  });

  it('maxRounds 为 0 时回退默认值', () => {
    const config = loadConfig(path.join(FIXTURES, 'invalid-config.json'));
    expect(config.agent.maxRounds).toBe(10);
  });

  it('使用自定义值覆盖默认值', () => {
    const config = loadConfig(path.join(FIXTURES, 'valid-config.json'));
    expect(config.llm.model).toBe('deepseek-chat');
    expect(config.agent.allowedPaths).toEqual(['src/', 'tests/']);
  });
});
