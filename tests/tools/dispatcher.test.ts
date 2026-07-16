import { describe, it, expect } from 'vitest';
import { ToolDispatcher } from '../../src/tools/dispatcher';
import type { ToolContext } from '../../src/types/index';

const ctx: ToolContext = { workspaceRoot: process.cwd(), allowedPaths: ['src/', 'tests/'] };

describe('ToolDispatcher', () => {
  it('应分发到正确的工具处理函数', async () => {
    const dispatcher = new ToolDispatcher(ctx);
    const result = await dispatcher.execute('write_file', { path: 'tests/tmp-test.txt', content: 'hello' });
    expect(result.success).toBe(true);
  });

  it('未知工具名应返回错误', async () => {
    const dispatcher = new ToolDispatcher(ctx);
    const result = await dispatcher.execute('unknown_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });

  it('write_file 应能创建文件', async () => {
    const dispatcher = new ToolDispatcher(ctx);
    const result = await dispatcher.execute('write_file', {
      path: 'tests/tmp-write-test.txt',
      content: 'hello world'
    });
    expect(result.success).toBe(true);
    expect(result.output).toContain('文件已写入');
  });

  it('getToolDefs 应返回四个工具定义', () => {
    const dispatcher = new ToolDispatcher(ctx);
    const defs = dispatcher.getToolDefs();
    expect(defs).toHaveLength(4);
    const names = defs.map(d => d.function.name);
    expect(names).toContain('read_file');
    expect(names).toContain('write_file');
    expect(names).toContain('shell');
    expect(names).toContain('grep');
  });

  it('shell 应能执行简单命令', async () => {
    const dispatcher = new ToolDispatcher(ctx);
    const result = await dispatcher.execute('shell', { command: 'echo hello' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });
});
