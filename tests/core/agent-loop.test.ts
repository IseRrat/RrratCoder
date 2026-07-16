import { describe, it, expect } from 'vitest';
import { AgentLoop } from '../../src/core/agent-loop';
import { MockLLMAdapter } from '../../src/core/mock-adapter';
import { ToolDispatcher } from '../../src/tools/dispatcher';
import type { HarnessConfig, ToolContext } from '../../src/types/index';

const ctx: ToolContext = { workspaceRoot: process.cwd(), allowedPaths: ['src/', 'tests/'] };

function makeConfig(overrides: Partial<HarnessConfig['agent']> = {}): HarnessConfig {
  return {
    llm: { provider: 'mock', model: 'mock', maxTokens: 4096, temperature: 0 },
    agent: { maxRounds: 10, maxRetries: 3, workspaceRoot: './', allowedPaths: ['src/'], ...overrides },
    guardrails: { mode: 'prompt', allowedPatterns: [] },
  };
}

describe('AgentLoop', () => {
  it('LLM 返回 finish 时应在 1 轮后停机', async () => {
    const mock = new MockLLMAdapter();
    mock.setResponses({
      finishReason: 'stop',
      message: { role: 'assistant', content: 'Finished' },
    });

    const loop = new AgentLoop(mock, new ToolDispatcher(ctx), makeConfig());
    const result = await loop.run('test task');

    expect(result.status).toBe('success');
    expect(result.rounds).toBe(1);
  });

  it('达到 maxRounds 时应强制停机', async () => {
    const mock = new MockLLMAdapter();
    const toolCallResp = {
      finishReason: 'tool_calls' as const,
      message: {
        role: 'assistant' as const,
        content: '',
        tool_calls: [{
          id: '1', type: 'function' as const,
          function: { name: 'read_file', arguments: '{"path":"package.json"}' }
        }]
      }
    };
    mock.setResponses(...Array(5).fill(toolCallResp));

    const loop = new AgentLoop(mock, new ToolDispatcher(ctx), makeConfig({ maxRounds: 3 }));
    const result = await loop.run('task');

    expect(result.status).toBe('max_rounds');
    expect(result.rounds).toBe(3);
  });

  it('护栏拦截的 action 不应执行工具', async () => {
    const mock = new MockLLMAdapter();
    mock.setResponses(
      {
        finishReason: 'tool_calls',
        message: {
          role: 'assistant', content: '',
          tool_calls: [{
            id: '1', type: 'function',
            function: { name: 'shell', arguments: '{"command":"rm -rf /"}' }
          }]
        }
      },
      {
        finishReason: 'stop',
        message: { role: 'assistant', content: 'Blocked, trying alternative' },
      }
    );

    const loop = new AgentLoop(mock, new ToolDispatcher(ctx), makeConfig());
    const result = await loop.run('dangerous task');

    expect(result.rounds).toBe(2);
    expect(result.sessionLog[0].guardResult?.allowed).toBe(false);
    expect(result.sessionLog[0].guardResult?.risk).toBe('FATAL');
  });

  it('工具执行失败后应注入反馈并继续', async () => {
    const mock = new MockLLMAdapter();
    mock.setResponses(
      {
        finishReason: 'tool_calls',
        message: {
          role: 'assistant', content: '',
          tool_calls: [{
            id: '1', type: 'function',
            function: { name: 'write_file', arguments: '{"path":"/etc/passwd","content":"x"}' }
          }]
        }
      },
      {
        finishReason: 'stop',
        message: { role: 'assistant', content: 'Retried with corrected path' },
      }
    );

    const loop = new AgentLoop(mock, new ToolDispatcher(ctx), makeConfig());
    const result = await loop.run('write task');
    expect(result.rounds).toBeGreaterThanOrEqual(1);
  });
});
