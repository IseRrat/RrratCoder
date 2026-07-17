import express from 'express';

const app = express();
app.use(express.json());

// ===== API Endpoints =====
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/info', (_req, res) => {
  res.json({
    name: 'RrratCoder',
    version: '1.0.0',
    description: '个人开发者 Coding Agent Harness — Agent = LLM + Harness',
    modules: ['agent-loop', 'tools', 'feedback', 'guardrail', 'memory', 'config', 'credentials'],
    mainContribution: '反馈闭环 (Feedback Loop)',
    repo: 'https://github.com/IseRrat/RrratCoder',
    ci: 'https://github.com/IseRrat/RrratCoder/actions',
    tests: '56 tests · 13 files · 100% pass',
  });
});

// ===== Root: inline HTML dashboard =====
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RrratCoder Dashboard</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f0f2f5; color:#333; min-height:100vh }
    header { background:#1a1a2e; color:#fff; padding:1.5rem 2rem }
    header h1 { font-size:1.5rem }
    header p { opacity:.7; margin-top:.25rem; font-size:.9rem }
    main { max-width:900px; margin:2rem auto; padding:0 1rem }
    .card { background:#fff; padding:1.5rem; margin-bottom:1rem; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,.08) }
    .card h2 { font-size:1.1rem; margin-bottom:1rem; color:#1a1a2e; border-bottom:2px solid #e0e0e0; padding-bottom:.5rem }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem }
    .stat { text-align:center; padding:1rem; background:#f8f9fa; border-radius:6px }
    .stat .value { font-size:2rem; font-weight:700; color:#1a1a2e }
    .stat .label { font-size:.8rem; color:#888; margin-top:.25rem }
    .tags { display:flex; flex-wrap:wrap; gap:.5rem }
    .tag { background:#e8f4fd; color:#1a73e8; padding:.25rem .75rem; border-radius:20px; font-size:.8rem }
    .tag.hl { background:#fff3e0; color:#e65100; font-weight:600 }
    .links { display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem }
    .links a { color:#1a73e8; text-decoration:none }
    .links a:hover { text-decoration:underline }
    footer { text-align:center; padding:1.5rem; font-size:.8rem; color:#999 }
  </style>
</head>
<body>
  <header>
    <h1>RrratCoder Dashboard</h1>
    <p>个人开发者 Coding Agent Harness — Agent = LLM + Harness</p>
  </header>
  <main>
    <div class="card">
      <h2>系统状态</h2>
      <div class="grid">
        <div class="stat"><div class="value" id="status">—</div><div class="label">运行状态</div></div>
        <div class="stat"><div class="value" id="uptime">—</div><div class="label">运行时间 (秒)</div></div>
        <div class="stat"><div class="value">v1.0.0</div><div class="label">版本</div></div>
      </div>
    </div>
    <div class="card">
      <h2>Harness 模块</h2>
      <div class="tags" id="modules"><span class="tag">加载中...</span></div>
    </div>
    <div class="card">
      <h2>Main Contribution</h2>
      <p id="mc" class="tag hl" style="display:inline-block;padding:.5rem 1rem;border-radius:4px;font-size:1rem">加载中...</p>
      <div class="links">
        <a href="https://github.com/IseRrat/RrratCoder" target="_blank">GitHub</a>
        <a href="https://github.com/IseRrat/RrratCoder/actions" target="_blank">CI/CD</a>
        <a href="/api/health" target="_blank">Health API</a>
      </div>
    </div>
    <div class="card">
      <h2>测试</h2>
      <p id="tests">加载中...</p>
    </div>
  </main>
  <footer>RrratCoder · AI4SE Final Project · TypeScript + DeepSeek</footer>
  <script>
    fetch('/api/health')
      .then(r=>r.json())
      .then(d=>{
        document.getElementById('status').textContent = d.status==='ok' ? '✅ 正常' : '❌ 异常';
        document.getElementById('uptime').textContent = Math.floor(d.uptime||0);
      })
      .catch(()=>document.getElementById('status').textContent='❌ 离线');
    fetch('/api/info')
      .then(r=>r.json())
      .then(d=>{
        document.getElementById('modules').innerHTML = d.modules.map(m=>'<span class="tag">'+m+'</span>').join('');
        document.getElementById('mc').textContent = '★ '+d.mainContribution;
        document.getElementById('tests').textContent = d.tests;
      })
      .catch(()=>{});
  </script>
</body>
</html>`);
});

// Catch-all: 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'not found', tip: 'Visit / for the dashboard' });
});

export default app;
