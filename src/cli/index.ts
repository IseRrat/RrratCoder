import { Command } from 'commander';
import { CredentialManager } from '../credentials/credential-manager';
import { loadConfig } from '../config/config-loader';
import { DeepSeekAdapter } from '../core/deepseek-adapter';
import { ToolDispatcher } from '../tools/dispatcher';
import { AgentLoop } from '../core/agent-loop';
import type { ToolContext } from '../types/index';
import { join } from 'path';

const program = new Command();

program
  .name('rrratcoder')
  .description('个人开发者 Coding Agent')
  .version('1.0.0');

program.command('run')
  .argument('<task>', '任务描述')
  .action(async (task: string) => {
    const config = loadConfig('.harness/config.json');
    const cm = new CredentialManager();

    let apiKey: string;
    try {
      const password = process.env.RRRATCODER_PASSWORD || '';
      if (!password) {
        console.log('未设置主密码。请设置环境变量 RRRATCODER_PASSWORD 或运行 key set');
        process.exit(1);
      }
      cm.init(password);
      apiKey = cm.retrieve();
    } catch {
      console.log('未找到存储的凭据，请先运行: rrratcoder key set');
      process.exit(1);
    }

    const ctx: ToolContext = {
      workspaceRoot: config.agent.workspaceRoot,
      allowedPaths: config.agent.allowedPaths,
    };

    const llm = new DeepSeekAdapter(apiKey);
    const tools = new ToolDispatcher(ctx);
    const loop = new AgentLoop(llm, tools, config);

    console.log(`执行任务: ${task}`);
    const result = await loop.run(task);
    console.log(`状态: ${result.status} | 轮次: ${result.rounds}`);
    console.log(result.summary);
  });

program.command('key')
  .argument('<action>', 'set|status|clear')
  .action((action: string) => {
    const cm = new CredentialManager();

    switch (action) {
      case 'set': {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question('请输入主密码: ', (password: string) => {
          cm.init(password);
          readline.question('请输入 DeepSeek API Key: ', (key: string) => {
            cm.store(key);
            console.log('API Key 已安全存储');
            readline.close();
          });
        });
        break;
      }
      case 'status':
        console.log(`凭据状态: ${cm.status()}`);
        break;
      case 'clear':
        cm.clear();
        console.log('凭据已清除');
        break;
      default:
        console.log('用法: rrratcoder key set|status|clear');
    }
  });

program.command('config')
  .action(() => {
    const config = loadConfig('.harness/config.json');
    console.log(JSON.stringify(config, null, 2));
  });

program.parse();
