import { describe, it, expect } from 'vitest';
import { MockLLMAdapter } from '../../src/core/mock-adapter';

describe('MockLLMAdapter', () => {
  it('应按序返回预设响应', async () => {
    const mock = new MockLLMAdapter();
    mock.setResponses(
      {
        finishReason: 'tool_calls',
        message: { role: 'assistant', content: '', tool_calls: [{
          id: '1', type: 'function',
          function: { name: 'read_file', arguments: '{"path":"a.ts"}' }
        }] }
      },
      {
        finishReason: 'stop',
        message: { role: 'assistant', content: '任务完成' }
      }
    );

    const r1 = await mock.chat([{ role: 'user', content: 'hello' }], []);
    expect(r1.finishReason).toBe('tool_calls');
    expect(r1.message.tool_calls![0].function.name).toBe('read_file');

    const r2 = await mock.chat([{ role: 'user', content: 'hello' }], []);
    expect(r2.finishReason).toBe('stop');
    expect(r2.message.content).toBe('任务完成');
  });

  it('响应用完时应抛出错误', async () => {
    const mock = new MockLLMAdapter();
    mock.setResponses({
      finishReason: 'stop',
      message: { role: 'assistant', content: 'done' }
    });

    await mock.chat([], []);
    await expect(mock.chat([], [])).rejects.toThrow('MockLLMAdapter: 没有更多预设响应');
  });

  it('应实现 LLMAdapter 接口的 chat 方法', () => {
    const mock = new MockLLMAdapter();
    expect(typeof mock.chat).toBe('function');
  });
});
