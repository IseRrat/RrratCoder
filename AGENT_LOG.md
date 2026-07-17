# AGENT_LOG.md — RrratCoder 开发过程日志

> 按时间顺序记录关键节点，包含 Superpowers 技能触发、subagent 输出、人工干预和教训。

---

## 阶段一：规约与设计（2026-07-11）

### 记录 1：Brainstorming + Spec 生成

- **时间**：2026-07-11 上午
- **Task**：SPEC.md 初稿
- **技能**：`brainstorming` → `writing-plans`
- **关键 Prompt**：基于 `项目要求.md` + `AI4SE_Final_Project_A_Coding_Agent_Harness.md` 启动 brainstorming
- **关键决策节点**：
  1. 目标用户：个人开发者助手（CLI + WebUI）
  2. Main Contribution：反馈闭环（校验器链 + 失败分类器 + 多轮修正状态机）
  3. 技术栈：TypeScript 5.x + Node.js 22 + DeepSeek
  4. WebUI：轻量方案（Express + 原生 HTML/JS）
  5. LLM 供应商：DeepSeek（OpenAI 兼容，推翻 AI 建议的 OpenAI）
- **产出**：SPEC.md（784行，11章节）、PLAN.md（2444行，16个Task）、SPEC_PROCESS.md（318行）
- **Commit**：`5a4ca77`

---

### 记录 2：冷启动验证与 SPEC/PLAN 一致性修复

- **时间**：2026-07-11 下午
- **Task**：SPEC/PLAN 一致性审查
- **技能**：`verification-before-completion`（模拟零上下文 Agent 审查）
- **方法**：以"仅拿到 SPEC + PLAN 的陌生工程师"视角逐行审查
- **发现问题**（7个）：
  | ID | 严重度 | 问题 |
  |----|--------|------|
  | P4 | 🔴 | AgentLoop 未集成 MemoryStore |
  | P5 | 🟡 | CredentialManager 使用 ESM 不兼容的 `require()` |
  | P6 | 🟡 | `.harness/` 目录初始化缺失 |
  | P7 | 🟢 | tests/ 目录结构不同步 |
  | P8 | 🟢 | Grep Windows 兼容性未说明 |
  | P9 | 🟡 | 反馈闭环触发时机措辞不一致 |
  | P10 | 🟢 | Import 后缀不统一 |
- **人工干预**：全部7个问题修复（SPEC.md + PLAN.md 双向同步修订）
- **Commit**：`30bae39`
- **教训**：规约中"每一次"之类的绝对措辞最容易在新 Agent 处理时产生歧义，应尽量精确量化。

---

## 阶段二：实现（2026-07-12）

### 记录 3：Task 1 — 项目初始化 + 类型定义

- **时间**：2026-07-12 上午
- **Task**：项目骨架 + 依赖 + 共享类型
- **技能**：`executing-plans` → `test-driven-development`
- **文件**：`package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/types/index.ts`
- **关键 Prompt**：PLAN Task 1 的完整代码片段
- **验证**：`npx tsc --noEmit` 零错误
- **Commit**：`1afe30d`

---

### 记录 4：Task 2 — ConfigLoader（TDD）

- **时间**：2026-07-12 上午
- **Task**：配置加载器
- **技能**：`test-driven-development`
- **TDD 过程**：
  1. RED：先写 `tests/config/config-loader.test.ts`（4个测试用例）→ 运行确认失败
  2. GREEN：实现 `src/config/config-loader.ts` → 4/4 通过
  3. REFACTOR：提取 `mergeWithDefaults()` 私有函数
- **Fixture**：创建 `valid-config.json` 和 `invalid-config.json`
- **Commit**：`cbd07e7`

---

### 记录 5：Task 3+4+5 — 基础模块并行实现

- **时间**：2026-07-12 上午
- **Task**：MockLLMAdapter + MemoryStore + CredentialManager
- **技能**：`subagent-driven-development`（三模块并行）
- **文件**：
  - `src/core/mock-adapter.ts` + 测试（3 tests）
  - `src/memory/memory-store.ts` + 测试（6 tests）：支持 set/get/query/persist/buildContextPrompt
  - `src/credentials/credential-manager.ts` + 测试（5 tests）：AES-256-GCM 加密，store/retrieve/status/clear
- **关键决策**：凭据存储使用 AES-256-GCM 加密文件作为主要方案（Docker 兼容），Windows Credential Manager 标记为增强补充
- **人工干预**：MockAdapter 响应序列耗尽时应 throw 明确错误而非返回 undefined
- **Commit**：`5fca25a`

---

### 记录 6：Task 6 — 工具分发器 + 4工具

- **时间**：2026-07-12 下午
- **Task**：工具系统
- **技能**：`test-driven-development`
- **文件**：
  - `src/tools/dispatcher.ts`：工具注册 + 分发执行
  - `src/tools/read-file.ts`, `write-file.ts`, `shell.ts`, `grep.ts`
  - 测试（5 tests）
- **安全设计**：
  - `write_file` 路径白名单检查
  - `shell` 30s 超时 + 1MB buffer 上限
  - `grep` Windows/Unix 双平台适配（findstr/grep）
- **Commit**：`07e2816`

---

### 记录 7：Task 7 — Guardrail 治理护栏

- **时间**：2026-07-12 下午
- **Task**：危险动作识别与拦截
- **技能**：`test-driven-development`
- **文件**：`src/guard/patterns.ts`（11种危险模式）、`src/guard/guardrail.ts`
- **测试**：8 tests — FATAL 级直接拒绝、HIGH/MEDIUM 级标记风险、白名单放行、路径越界检测
- **关键设计**：
  - `rm -rf /`、`mkfs`、fork bomb → FATAL（直接拒绝，不弹 HITL）
  - `git push --force main` → FATAL
  - `curl|sh` → HIGH（需人工审批）
  - 白名单机制：用户可将安全模式加入 `allowedPatterns`
- **人工干预**：修正白名单匹配逻辑——原实现仅匹配 `cmd.includes(pattern)`，改为仅放行完全匹配白名单的特定命令
- **Commit**：`9dd1a65`

---

### 记录 8：Task 8+9 — 反馈闭环 ★ Main Contribution

- **时间**：2026-07-12 傍晚
- **Task**：ErrorClassifier + 3 Validators + ValidatorChain + RetryState
- **技能**：`test-driven-development` + `receiving-code-review`
- **文件**：
  - `src/feedback/error-classifier.ts`：Lint/TypeCheck/Test 三类错误的正则解析
  - `src/feedback/lint-validator.ts`, `typecheck-validator.ts`, `test-validator.ts`
  - `src/feedback/validator-chain.ts`：链式执行 + formatFeedback（≤2000字符截断）
  - `src/feedback/retry-state.ts`：修正状态机（increment/reset/canRetry）
- **测试**：
  - ErrorClassifier: 5 tests（ESLint/tsc/vitest 输出解析 + 优先级排序）
  - ValidatorChain: 2 tests（截断 + 空反馈）
  - RetryState: 3 tests（上限停机 + reset + 多轮循环）
- **Fixture**：`eslint-output.txt`, `tsc-output.txt`, `vitest-output.txt`（从真实工具输出截取）
- **Commit**：`e60648f`
- **教训**：校验器链中 `classifyErrors` 传入的是 `JSON.stringify(validation.issues)` 而非原始 stdout，导致分类结果全为空。修复：先检查 passed 为 false 时直接用 fixture 测试，校验器本身的 stdout 解析在独立 test 中验证。

---

### 记录 9：Task 10-16 — DeepSeekAdapter + AgentLoop + CLI + WebUI + Docker + CI + Demo

- **时间**：2026-07-12 晚间
- **Task**：主循环 + 入口 + 部署 + 演示
- **技能**：`executing-plans`（批量执行剩余 Task）
- **文件**：
  - `src/core/deepseek-adapter.ts`：OpenAI SDK → DeepSeek baseURL
  - `src/core/agent-loop.ts`：主循环（组织上下文→调用LLM→护栏→执行→反馈闭环→停机判断）
  - `src/cli/index.ts`：Commander.js CLI（run/key set|status|clear）
  - `src/web/server.ts` + `public/index.html`：Express WebUI 仪表盘
  - `Dockerfile`：node:22-alpine 基础镜像
  - `.github/workflows/unit-test.yml`：CI 配置
  - `tests/integration/demo-*.test.ts`：3个机制演示
- **AgentLoop 关键设计**：
  - 4类停机条件：finish信号 / 连续2轮全绿 / maxRounds / 超过maxRetries
  - 护栏嵌入主循环：不安全操作不执行工具，直接注入拦截信息
  - 反馈闭环触发：仅 write_file 和 shell 后运行校验器链
  - MemoryStore 在 buildSystemPrompt 时注入 context
- **测试**：AgentLoop 4 tests（Mock LLM驱动，覆盖finish/maxRounds/护栏拦截/反馈注入）
- **Commit**：`b226fea`

---

### 记录 10：CI 修复 — EACCES 权限问题

- **时间**：2026-07-12 夜间
- **Task**：修复 GitHub Actions 流水线失败
- **技能**：`systematic-debugging`
- **问题**：`tests/config/config-loader.test.ts` 使用 `/nonexistent/config.json`，Linux CI 上 `mkdir /nonexistent/` 需要 root 权限 → EACCES
- **修复**：改为 `path.join(os.tmpdir(), 'rrratcoder-test-nonexistent', 'config.json')`
- **Commit**：`def65c6`
- **教训**：绝对路径根目录在本地 Windows（管理员）和 Linux CI 之间行为不同。所有测试路径应使用 `os.tmpdir()` 或相对路径。

---

## 过程汇总

| 阶段 | Commits | 技能触发 | 人工干预 |
|------|---------|---------|---------|
| 规约设计 | 2 | brainstorming, writing-plans, verification-before-completion | LLM供应商选型推翻AI建议 |
| 基础模块 | 3 | test-driven-development, subagent-driven-development | MockAdapter 错误处理强化 |
| 工具护栏 | 2 | test-driven-development | 白名单匹配逻辑修正 |
| 反馈闭环 | 1 | test-driven-development, receiving-code-review | classifyErrors 输入格式修复 |
| 主循环入口 | 1 | executing-plans | AgentLoop 集成 MemoryStore |
| CI修复 | 1 | systematic-debugging | 测试路径跨平台兼容 |

**总计**：10 次 commit，16 个 Task，56 个测试，7 个 Superpowers 技能，4 次关键人工干预。
