import { readFileSync, writeFileSync, existsSync, mkdirSync as fsMkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import type { Tool, ToolContext, ToolResult, ToolDef } from '../types/index';

// ===== 工具实现 =====

class ReadFileTool implements Tool {
  name = 'read_file';
  description = '读取指定文件的内容';
  parameters = {
    type: 'object' as const,
    properties: { path: { type: 'string', description: '文件路径（相对于工作目录）' } },
    required: ['path'],
  };

  constructor(private ctx: ToolContext) {}

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = resolve(this.ctx.workspaceRoot, args.path as string);
    if (!existsSync(filePath)) {
      return { success: false, output: '', error: `文件不存在: ${args.path}` };
    }
    try {
      const content = readFileSync(filePath, 'utf-8');
      return { success: true, output: content.slice(0, 8000) };
    } catch (err) {
      return { success: false, output: '', error: `读取失败: ${(err as Error).message}` };
    }
  }
}

class WriteFileTool implements Tool {
  name = 'write_file';
  description = '写入内容到指定文件';
  parameters = {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: '文件路径（相对路径）' },
      content: { type: 'string', description: '要写入的内容' },
    },
    required: ['path', 'content'],
  };

  constructor(private ctx: ToolContext) {}

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const filePath = resolve(this.ctx.workspaceRoot, args.path as string);
    const relPath = args.path as string;
    const allowed = this.ctx.allowedPaths.some(p => relPath.startsWith(p));
    if (!allowed && this.ctx.allowedPaths.length > 0) {
      return { success: false, output: '', error: `路径不在允许列表中: ${relPath}` };
    }
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) fsMkdirSync(dir, { recursive: true });
      writeFileSync(filePath, args.content as string, 'utf-8');
      return { success: true, output: `文件已写入: ${args.path}` };
    } catch (err) {
      return { success: false, output: '', error: `写入失败: ${(err as Error).message}` };
    }
  }
}

class ShellTool implements Tool {
  name = 'shell';
  description = '执行 shell 命令并在执行前经护栏检查';
  parameters = {
    type: 'object' as const,
    properties: { command: { type: 'string', description: '要执行的命令' } },
    required: ['command'],
  };

  constructor(private ctx: ToolContext) {}

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const rawCommand = args.command as string;
    const isWindows = process.platform === 'win32';

    // Windows: wrap in cmd /c so common commands work
    const command = isWindows
      ? `cmd /c "${rawCommand.replace(/"/g, '\\"')}"`
      : rawCommand;

    try {
      const stdout = execSync(command, {
        cwd: this.ctx.workspaceRoot,
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        shell: isWindows ? 'cmd.exe' : '/bin/sh',
      });
      return { success: true, output: stdout.slice(0, 8000) };
    } catch (err: any) {
      const message = err.stderr || err.stdout || err.message || '';
      return { success: false, output: message.slice(0, 8000), error: '命令执行失败' };
    }
  }
}

class GrepTool implements Tool {
  name = 'grep';
  description = '在文件中搜索匹配模式的行';
  parameters = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string', description: '搜索模式（正则或文本）' },
      path: { type: 'string', description: '搜索路径（可选，默认工作目录）' },
    },
    required: ['pattern'],
  };

  constructor(private ctx: ToolContext) {}

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || this.ctx.workspaceRoot;
    const fullPath = resolve(this.ctx.workspaceRoot, searchPath);
    try {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows
        ? `findstr /s /i /n "${pattern}" "${fullPath}\\*" 2>nul`
        : `grep -rn "${pattern}" "${fullPath}" 2>/dev/null`;
      const stdout = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
      return { success: true, output: stdout.slice(0, 8000) || '未找到匹配' };
    } catch (err: any) {
      if (err.status === 1) return { success: true, output: '未找到匹配' };
      return { success: false, output: '', error: `搜索失败: ${err.message}` };
    }
  }
}

// ===== 工具分发器 =====

export class ToolDispatcher {
  private tools: Map<string, Tool> = new Map();

  constructor(ctx: ToolContext) {
    for (const tool of [
      new ReadFileTool(ctx),
      new WriteFileTool(ctx),
      new ShellTool(ctx),
      new GrepTool(ctx),
    ]) {
      this.tools.set(tool.name, tool);
    }
  }

  getToolDefs(): ToolDef[] {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, output: '', error: `未知工具: ${toolName}` };
    }
    try {
      return await tool.execute(args, {} as ToolContext);
    } catch (err) {
      return { success: false, output: '', error: `工具执行异常: ${(err as Error).message}` };
    }
  }
}
