import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/info', (_req, res) => {
  res.json({
    name: 'RrratCoder',
    version: '1.0.0',
    description: '个人开发者 Coding Agent Harness',
    modules: ['agent-loop', 'tools', 'feedback', 'guardrail', 'memory', 'config', 'credentials'],
    mainContribution: '反馈闭环 (Feedback Loop)',
  });
});

app.listen(PORT, () => {
  console.log(`RrratCoder WebUI running at http://localhost:${PORT}`);
});
