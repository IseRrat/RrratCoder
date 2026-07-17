# RrratCoder

> 个人开发者 Coding Agent 运行时框架  
> **Agent = LLM + Harness** — 把只会"思考"的 LLM 封装成能稳定工作的编码助手

[![Unit Tests](https://github.com/IseRrat/RrratCoder/actions/workflows/unit-test.yml/badge.svg)](https://github.com/IseRrat/RrratCoder/actions/workflows/unit-test.yml)

---

## 项目简介

RrratCoder 是一个从零实现的 Coding Agent Harness，将 LLM 的"决策能力"封装为可靠运行的工程系统。它不寄生在任何现成 Agent 框架之上——主循环、工具分发、反馈闭环、治理护栏、记忆管理全部自己编码。

**核心能力：**
- 📝 读写代码文件、执行 shell 命令、搜索代码
- ✅ 自动运行 ESLint / TypeScript 类型检查 / Vitest 测试，并根据失败结果自我修正
- 🛡️ 危险命令拦截 + 人工审批（HITL），防止 rm -rf / 等误操作
- 🧠 跨会话记忆项目约定和历史决策
- 🔐 API Key 安全存储（加密文件 + Windows Credential Manager）
- 🐳 Docker 一键部署

**技术栈：** TypeScript 5.x + Node.js 22 + DeepSeek（OpenAI 兼容）+ Commander.js + Express + Vitest

---

## 快速开始

### 前置要求

- **Node.js** ≥ 22
- **Docker**（可选，用于容器化运行）
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com/)）

### 本地安装

```bash
git clone https://github.com/IseRrat/RrratCoder.git
cd rrratcoder
npm install
npm run build
```

### 配置 API Key

```bash
# 安全录入 Key（隐藏输入，不落盘、不进日志）
npm start key set
```

Key 存储在 `~/.rrratcoder/credentials.enc`（AES-256-GCM 加密），不会以明文形式出现在源码、Git 历史或日志中。

### 执行任务

```bash
npm start run "修复 src/utils.ts 中的类型错误"
```

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `rrratcoder run <任务>` | 执行编码任务 |
| `rrratcoder key set` | 安全录入/更新 API Key |
| `rrratcoder key status` | 查看凭据状态（脱敏显示） |
| `rrratcoder key clear` | 清除凭据 |
| `rrratcoder config` | 交互式配置 |

---

## Docker 分发

```bash
# 构建镜像
docker build -t rrratcoder .

# 运行（挂载项目代码 + 凭据目录）
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.rrratcoder:/root/.rrratcoder \
  -p 3000:3000 \
  rrratcoder key set   # 首次：录入 Key

# 执行任务
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.rrratcoder:/root/.rrratcoder \
  rrratcoder run "你的编码任务"
```

### Key 在 Docker 中的存储方式

Docker 容器内无法使用 Windows Credential Manager，**自动降级**为 AES-256-GCM 加密文件方案。Key 存储在宿主机 `~/.rrratcoder/credentials.enc`，通过 Volume 挂载进容器，不进入镜像层。

---

## 目录结构

```
rrratcoder/
├── src/
│   ├── core/                  # 主循环 + LLM 适配器
│   │   ├── agent-loop.ts      # Agent 主循环
│   │   ├── deepseek-adapter.ts
│   │   ├── mock-adapter.ts    # 测试用 Mock LLM
│   │   └── llm-adapter.ts     # 抽象层接口
│   ├── tools/                 # 工具系统
│   │   ├── dispatcher.ts      # 工具分发器
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── shell.ts
│   │   └── grep.ts
│   ├── feedback/              # 反馈闭环 ★ Main Contribution
│   │   ├── validator-chain.ts  # 校验器链（Lint→TypeCheck→Test）
│   │   ├── lint-validator.ts
│   │   ├── typecheck-validator.ts
│   │   ├── test-validator.ts
│   │   ├── error-classifier.ts # 失败分类器
│   │   └── retry-state.ts      # 多轮修正状态机
│   ├── guard/                 # 治理护栏
│   │   ├── guardrail.ts
│   │   └── patterns.ts
│   ├── memory/                # 记忆系统
│   │   └── memory-store.ts
│   ├── config/                # 配置系统
│   │   └── config-loader.ts
│   ├── credentials/           # 凭据管理
│   │   └── credential-manager.ts
│   ├── cli/                   # CLI 入口
│   │   └── index.ts
│   ├── web/                   # WebUI
│   │   ├── server.ts
│   │   └── public/index.html
│   └── types/
│       └── index.ts           # 共享类型定义
├── tests/                     # 单元测试（Mock LLM 驱动）
│   ├── core/
│   ├── tools/
│   ├── feedback/
│   ├── guard/
│   ├── memory/
│   ├── fixtures/              # 测试 fixture（ESLint/tsc/vitest 输出样例）
│   └── integration/
│       └── harness-mechanism-demo.test.ts  # 机制演示
├── Dockerfile
├── .github/workflows/unit-test.yml
├── SPEC.md                    # 设计文档
├── PLAN.md                    # 实现计划
├── SPEC_PROCESS.md            # 规约过程记录
├── AGENT_LOG.md               # Agent 协作日志
└── REFLECTION.md              # 反思报告
```

---

## 安全边界

### API Key 安全

| 威胁 | 对策 |
|------|------|
| Key 硬编码在源码 | ❌ 绝不出现 — Key 仅通过凭据管理器读取到内存 |
| `.env` 文件提交到 Git | `.gitignore` 排除；首次运行 CLI 引导录入，无需手写文件 |
| Key 出现在终端 history | CLI 使用隐藏输入（password prompt），不经过 shell |
| Key 出现在日志 | 日志中过滤 `sk-` 模式，替换为 `***` |
| Docker 镜像层泄露 | Key 存储在宿主机 Volume 挂载，不进入镜像 |

### 操作安全

- **护栏拦截**：危险命令（rm -rf /、mkfs、git push --force main、curl|sh）执行前自动拦截
- **路径越界检测**：写文件操作限制在 workspaceRoot 白名单内
- **HITL 审批**：中等风险操作弹窗等待人工确认

### 已知限制

| 限制 | 说明 |
|------|------|
| 平台 | 主要支持 Windows（凭据存储优先方案），Linux/macOS 使用加密文件降级方案 |
| 架构 | Node.js 22+，TypeScript 5.x |
| ESLint/tsc 依赖 | 校验器需要项目已配置 ESLint 和 tsconfig.json，未配置则优雅跳过 |
| Docker 凭据 | 容器内仅支持加密文件方案，不支持 Windows Credential Manager |
| WebUI | 极简状态面板（3 个页面），非完整管理后台 |

---

## 部署与 CI/CD

### 线上部署 (Vercel)

WebUI 已部署到 Vercel（免费额度）：

🔗 **线上地址：[https://rrratcoder.vercel.app](https://rrratcoder.vercel.app)**

> 即开即用，无冷启动延迟

部署配置：[`vercel.json`](./vercel.json)

```json
// Vercel Serverless：所有请求路由到 api/index.js Express 应用
// 零构建步骤，Express 内联 HTML Dashboard
```

API 端点：
- 健康检查：[`/api/health`](https://rrratcoder.vercel.app/api/health)
- 项目信息：[`/api/info`](https://rrratcoder.vercel.app/api/info)

### Docker 部署

```bash
# 构建镜像
docker build -t rrratcoder .

# WebUI 模式（默认）
docker run -p 3000:3000 rrratcoder

# CLI 模式
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.rrratcoder:/root/.rrratcoder \
  rrratcoder run "你的编码任务"
```

---

## 开发

```bash
# 安装依赖
npm install

# 运行测试（一键命令）
npm test

# 监听模式
npm run test:watch

# 编译
npm run build
```

**测试策略：**
- 所有 Harness 核心机制使用 Mock LLM 驱动的确定性单元测试
- 不依赖网络与真实 LLM——`npm test` 在任何环境下均可运行

---

## 设计文档

| 文档 | 说明 |
|------|------|
| [SPEC.md](./SPEC.md) | 完整设计规约（11 章节，含领域与机制设计） |
| [PLAN.md](./PLAN.md) | 详细实现计划（16 个 Task，含代码和验证步骤） |
| [SPEC_PROCESS.md](./SPEC_PROCESS.md) | Brainstorming 过程记录与反思 |

---

## 第三方库

| 库 | 用途 | 许可证 |
|----|------|--------|
| [openai](https://github.com/openai/openai-node) | LLM API 调用（baseURL 指向 DeepSeek） | Apache-2.0 |
| [commander](https://github.com/tj/commander.js) | CLI 框架 | MIT |
| [express](https://github.com/expressjs/express) | WebUI 后端 | MIT |
| [typescript](https://github.com/microsoft/TypeScript) | 类型检查 | Apache-2.0 |
| [vitest](https://github.com/vitest-dev/vitest) | 测试框架 | MIT |
| [eslint](https://github.com/eslint/eslint) | 代码规范 | MIT |

---

## 许可

MIT
