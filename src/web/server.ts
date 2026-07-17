import express from 'express';
import { join, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { CredentialManager } from '../credentials/credential-manager';
import { loadConfig } from '../config/config-loader';
import { DeepSeekAdapter } from '../core/deepseek-adapter';
import { ToolDispatcher } from '../tools/dispatcher';
import { AgentLoop } from '../core/agent-loop';
import type { ToolContext } from '../types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ===== Key Management =====
const CRED_PATH = join(homedir(), '.rrratcoder', 'credentials.enc');

app.get('/api/key/status', (_req, res) => {
  const cm = new CredentialManager(CRED_PATH);
  const configured = cm.hasPlain();
  res.json({
    configured,
    status: configured ? '已配置' : '未配置',
    hint: configured ? 'API Key 已存储，可直接执行任务' : '请先设置 DeepSeek API Key',
  });
});

app.post('/api/key/set', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    res.status(400).json({ error: '请提供 apiKey（DeepSeek API Key）' });
    return;
  }
  if (!apiKey.startsWith('sk-')) {
    res.status(400).json({ error: 'API Key 格式不正确，DeepSeek Key 应以 sk- 开头' });
    return;
  }
  try {
    const cm = new CredentialManager(CRED_PATH);
    cm.storePlain(apiKey);
    res.json({ ok: true, message: 'API Key 已存储' });
  } catch (err: any) {
    res.status(500).json({ error: `存储失败: ${err.message}` });
  }
});

app.post('/api/key/clear', (_req, res) => {
  try {
    const cm = new CredentialManager(CRED_PATH);
    cm.clearPlain();
    res.json({ ok: true, message: '凭据已清除' });
  } catch (err: any) {
    res.status(500).json({ error: `清除失败: ${err.message}` });
  }
});

// ===== Workspace =====
function getWorkspaceDir(): string {
  const config = loadConfig('.harness/config.json');
  let ws = config.agent.workspaceRoot;
  // 迁移旧配置：默认 ./ 改为 ./workspace
  if (ws === './' || ws === '.') ws = './workspace';
  return pathResolve(ws);
}

app.get('/api/workspace', (_req, res) => {
  const ws = getWorkspaceDir();
  const exists = existsSync(ws);
  res.json({ path: ws, exists });
});

app.post('/api/workspace', (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath) {
    res.status(400).json({ error: '请提供 path（新工作目录路径）' });
    return;
  }
  try {
    // 更新配置文件
    const configPath = '.harness/config.json';
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    config.agent = config.agent || {};
    config.agent.workspaceRoot = newPath;
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 创建目录
    const target = pathResolve(newPath);
    if (!existsSync(target)) mkdirSync(target, { recursive: true });

    res.json({ ok: true, path: target, message: '工作目录已更新' });
  } catch (err: any) {
    res.status(500).json({ error: `设置失败: ${err.message}` });
  }
});

app.post('/api/workspace/create', (_req, res) => {
  try {
    const ws = getWorkspaceDir();
    if (!existsSync(ws)) mkdirSync(ws, { recursive: true });
    res.json({ ok: true, path: ws });
  } catch (err: any) {
    res.status(500).json({ error: `创建失败: ${err.message}` });
  }
});

// ===== Task Execution =====
app.post('/api/run', async (req, res) => {
  const { task } = req.body;
  if (!task) {
    res.status(400).json({ error: '请提供 task（任务描述）' });
    return;
  }

  try {
    const cm = new CredentialManager(CRED_PATH);
    const apiKey = cm.retrievePlain();

    const config = loadConfig('.harness/config.json');
    const workspaceRoot = getWorkspaceDir();

    // 自动创建工作目录
    if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
    const ctx: ToolContext = {
      workspaceRoot,
      allowedPaths: config.agent.allowedPaths,
    };

    const llm = new DeepSeekAdapter(apiKey);
    const tools = new ToolDispatcher(ctx);
    const loop = new AgentLoop(llm, tools, config);

    const result = await loop.run(task);

    // 提取产出文件清单
    const filesCreated: string[] = [];
    const seen = new Set<string>();
    (result.sessionLog || []).forEach(rec => {
      if (rec.toolCall?.function?.name === 'write_file') {
        try {
          const args = JSON.parse(rec.toolCall.function.arguments);
          if (args.path && !seen.has(args.path)) {
            seen.add(args.path);
            filesCreated.push(args.path);
          }
        } catch {}
      }
    });

    res.json({ ok: true, result: { ...result, workspaceRoot, filesCreated } });
  } catch (err: any) {
    res.status(500).json({ error: `执行失败: ${err.message}` });
  }
});

// ===== Info =====
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/info', (_req, res) => {
  const cm = new CredentialManager(CRED_PATH);
  const configured = cm.hasPlain();
  res.json({
    name: 'RrratCoder',
    version: '1.0.0',
    description: '个人开发者 Coding Agent Harness — Agent = LLM + Harness',
    modules: ['agent-loop', 'tools', 'feedback', 'guardrail', 'memory', 'config', 'credentials'],
    mainContribution: '反馈闭环 (Feedback Loop)',
    repo: 'https://github.com/IseRrat/RrratCoder',
    ci: 'https://github.com/IseRrat/RrratCoder/actions',
    tests: '56 tests · 13 files · 100% pass',
    keyConfigured: configured,
  });
});

app.listen(PORT, () => {
  console.log(`RrratCoder WebUI running at http://localhost:${PORT}`);
});
