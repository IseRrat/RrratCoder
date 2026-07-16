# SPEC.md — RrratCoder：个人开发者 Coding Agent 运行时框架

> AI4SE 期末项目 · A · Coding Agent Harness  
> Spec-Driven, Subagent-Built, Human-Owned.

---

## 1. 问题陈述

### 1.1 要解决什么问题？

LLM 已能完成大部分编码"思考"——理解需求、生成代码、诊断错误。但一个只会输出文本的 LLM 不等于一个能稳定工作的 Coding Agent。**Agent = LLM + Harness**：LLM 负责"下一步做什么"的决策，Harness 负责决策封装、工具执行、反馈闭环、安全护栏、记忆管理、配置约束这六层工程。

市场上已有 Claude Code、Cursor、GitHub Copilot 等成熟的 Coding Agent，但它们都是封闭的商业产品。本项目的价值不是与它们竞争，而是**通过亲手实现一个精简但完整的 Harness 内核，理解"Agent 工程层"到底在做什么**——把不确定的 LLM 输出封装为确定、可靠、可审计的系统行为。

### 1.2 目标用户

个人开发者，在日常编码工作中通过 CLI 与 Agent 交互，让 Agent 辅助完成：
- 读取和分析代码文件
- 运行构建与测试，根据失败结果自我修正
- 执行受限的 shell 命令

同时通过 WebUI 查看 Agent 运行历史、配置参数和会话记录。

### 1.3 为什么值得做？

- **教育价值**：亲手实现 agent 主循环、反馈闭环、护栏等机制，是理解 Agentic SE 方法论最直接的方式
- **可验证性**：移除 LLM 后用 mock 确定性单测验证每个机制，区分"编码了机制"与"写了提示词"
- **最小可用**：在 Coding 这一垂直领域，每个机制都有最清晰的工程形态（测试 = 反馈，危险命令 = 护栏触发点）

---

## 2. 用户故事

| # | 用户故事 | INVEST 检查 |
|---|---------|------------|
| US1 | 作为开发者，我可以通过 CLI 输入自然语言任务（如"修复 src/utils.ts 中的类型错误"），Agent 自动读取文件、分析问题、修改代码，并在修改后自动运行测试验证，直到测试通过或达到重试上限。 | I✅ N✅ V✅ E✅ S✅ T✅ |
| US2 | 作为开发者，当我看到 Agent 即将执行 `rm -rf /` 或 `git push --force` 等危险命令时，系统必须拦截并弹窗等待我明确审批，绝不自动执行。 | I✅ N✅ V✅ E✅ S✅ T✅ |
| US3 | 作为开发者，我可以通过 `.harness/config.json` 配置 Agent 的行为（最大轮次、重试上限、工作目录边界、允许的工具列表），无需修改源码。 | I✅ N✅ V✅ E✅ S✅ T✅ |
| US4 | 作为开发者，我可以安全地录入、查看（状态模糊显示）、更新和清除我的 DeepSeek API Key，Key 绝不以明文形式出现在源码、Git 历史、日志或终端输出中。 | I✅ N✅ V✅ E✅ S✅ T✅ |
| US5 | 作为开发者，Agent 在执行多轮会话时应记住跨会话的项目约定和历史决策（如"本项目使用 2 空格缩进"），并在下一轮 context 中自动注入，无需我每次重复说明。 | I✅ N✅ V✅ E✅ S✅ T✅ |
| US6 | 作为开发者，我可以通过 Docker 单条命令拉取并启动 Agent，首次运行时系统引导我安全录入 API Key，无需手动编辑配置文件。 | I✅ N✅ V✅ E✅ S✅ T✅ |

---

## 3. 功能规约

### 3.1 模块总览

```
┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  AgentLoop  │  │  Tools   │  │ Feedback★ │  │ Guardrail│  │  Memory  │  │  Config  │
│  主循环     │  │  工具系统  │  │  反馈闭环  │  │  治理护栏  │  │  记忆系统  │  │  配置系统  │
└──────┬──────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                                       │
                               ┌───────┴───────┐
                               │  LLM 抽象层    │
                               │ DeepSeek│Mock │
                               └───────────────┘
```

### 3.2 Agent 主循环（AgentLoop）

**职责**：组织上下文 → 调用 LLM → 解析 Action → 分发执行 → 回灌结果 → 停机判断

**输入**：用户任务描述（字符串）

**行为**：
1. 从 Config 加载 `maxRounds`（默认 10）
2. 初始化 `messages[]`（system prompt + 用户任务 + memory 注入）
3. **循环**（每轮）：
   a. 调用 LLM（通过 Adapter），传入 messages + tools 定义
   b. 解析 LLM 返回的 tool_call 或 finish 信号
   c. 如果是 tool_call → 经过 **护栏检查** → 通过则执行 → 结果进入 **反馈闭环** → 回灌给 LLM
   d. 如果是 finish → 停机
4. **停机条件**（任一触发）：
   - LLM 返回 finish 信号
   - 反馈闭环连续 2 轮全绿（当前 task 已完成）
   - 达到 `maxRounds`（强制停机）
   - 用户中断（Ctrl+C）

**输出**：`AgentResult { rounds: number, status: 'success'|'max_rounds'|'interrupted', summary: string }`

**边界条件**：
- `maxRounds = 0` → 立即返回错误
- LLM 返回非法格式 → 捕获异常，注入错误信息重试（不计入 maxRounds 中的 1 次豁免）

**错误处理**：LLM 调用超时（30s）→ 重试 1 次 → 仍失败则停机并报错

### 3.3 LLM 抽象层（LLMAdapter）

**职责**：封装 LLM 提供商差异，支持生产适配器（DeepSeek）与测试适配器（Mock）

**接口**：
```typescript
interface LLMAdapter {
  chat(messages: Message[], tools: ToolDef[]): Promise<LLMResponse>;
}
```

**DeepSeekAdapter**：
- 使用 `openai` npm SDK，baseURL 指向 `https://api.deepseek.com`
- 模型：`deepseek-chat`
- 支持 function calling（OpenAI 兼容格式）
- API Key 从凭据管理器获取（不硬编码）
- Token 用量记录到日志（不记录 Key）

**MockLLMAdapter**：
- 预编排响应序列 `setResponses(...responses)`
- 每次调用 `chat()` 按序返回下一个预设响应
- 用于所有单元测试，脱离真实 LLM

**边界条件**：真实 adapter 在网络不通时抛出 `LLMConnectionError`，由主循环处理重试

### 3.4 工具系统（Tools）

**职责**：提供 Agent 可调用的外部操作能力

**四个工具**：

| 工具 | 参数 | 行为 | 输出 | 安全约束 |
|------|------|------|------|---------|
| `read_file` | `path: string` | 读取文件内容 | 文件文本（max 8000 chars） | 路径必须在 workspaceRoot 内 |
| `write_file` | `path, content` | 写入文件 | 成功/失败 | 路径白名单（仅 src/、tests/） |
| `shell` | `command: string` | 执行 shell 命令 | stdout + stderr（max 8000 chars） | 经护栏检查后才能执行 |
| `grep` | `pattern, path?` | 搜索文件内容 | 匹配行列表 | 路径限制同 read_file |

**接口**：
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(args: any, ctx: ToolContext): Promise<ToolResult>;
}
```

**边界条件**：文件不存在 → 返回错误信息给 LLM；shell 超时 30s → 返回超时错误

### 3.5 反馈闭环（FeedbackLoop）★ Main Contribution

**职责**：对 Agent 的每一次工具执行结果进行客观判定，将结构化反馈回灌给 LLM，驱动自我修正

**输入**：工具执行结果 `ToolResult`

**行为**：

1. **校验器链**（顺序执行）：
   - **Lint 校验器**：在项目目录运行 `npx eslint`，解析输出，提取错误位置和描述
   - **类型校验器**：运行 `npx tsc --noEmit`，解析类型错误
   - **测试校验器**：运行 `npx vitest run`，解析测试结果（通过/失败数量、失败用例详情）

2. **失败分类器**：
   - `LINT_ERR`：语法/风格错误
   - `TYPE_ERR`：类型不匹配
   - `TEST_ERR`：测试断言失败（逻辑错误）
   - 分类后的错误按优先级排序：先语法 → 再类型 → 再逻辑

3. **多轮修正状态机**：

```
IDLE → EXECUTING → VALIDATING → PASS ✅ (继续下一轮)
                               → FAIL ⚠️ → RETRY (max 3)
                                          → 超过maxRetries → 报告FAIL
```

4. **上下文注入策略**：
   - 不超过 2000 字符的错误信息注入给 LLM
   - 按优先级截取：前 N 个错误（语法 > 类型 > 测试）
   - 注入格式：`"上次操作后校验失败：\n[LINT_ERR] src/a.ts:3 — Missing semicolon\n[TYPE_ERR] src/b.ts:12 — Type 'string' is not assignable to 'number'"`

**输出**：`FeedbackResult { passed: boolean, errors: ClassifiedError[], retryCount: number }`

**边界条件**：
- 项目没有配置 ESLint → Lint 校验器跳过（不报错）
- 项目没有 tsconfig.json → 类型校验器跳过
- 校验器执行超时 60s → 标记该步为"跳过"并记录

**为什么这是 Main Contribution**：
- 三层校验器都是确定性代码，完全脱离 LLM
- 失败分类逻辑可独立单测（给定 stdout，断言分类结果）
- 修正状态机可单测（配置 maxRetries=2，断言第 3 次失败后停机）
- 上下文注入策略可单测（给定 5000 字符错误，断言输出 ≤ 2000 且按优先级排序）

### 3.6 治理护栏（Guardrail）

**职责**：在危险动作执行前识别并拦截，必要时进入 HITL 审批

**输入**：`ToolCall { toolName, arguments }`

**行为**：
1. 判断操作类型：
   - `shell` → 检查命令是否匹配危险模式
   - `write_file` → 检查路径是否越界
2. 匹配结果：
   - ✅ **安全**：直接放行
   - ⚠️ **危险**：进入 HITL 审批
   - 🔴 **致命**（如 `rm -rf /`）：直接拒绝，不提供审批选项

**危险命令正则库**：
| 模式 | 风险等级 | 处理 |
|------|---------|------|
| `rm\s+-rf\s+/` | 🔴 FATAL | 直接拒绝 |
| `mkfs\.` | 🔴 FATAL | 直接拒绝 |
| `:\(\)\s*\{\s*:\|:` (fork bomb) | 🔴 FATAL | 直接拒绝 |
| `git\s+push\s+--force` (非 main/master) | ⚠️ HIGH | HITL |
| `git\s+push\s+--force.*main\|master` | 🔴 FATAL | 直接拒绝 |
| `curl.*\|.*sh` | ⚠️ HIGH | HITL |
| `chmod\s+777` | ⚠️ MEDIUM | HITL |
| 路径越界 (`../` 跳出 workspaceRoot) | ⚠️ HIGH | HITL |

**HITL 审批流程（CLI）**：
```
⚠️ 危险操作拦截
Command: rm -rf ./build
Risk Level: MEDIUM
[Y] 批准  [N] 拒绝  [S] 添加到白名单
```

**白名单机制**：用户可选 "永远允许此模式"，写入 `config.json` 的 `allowedPatterns`

**输出**：`GuardResult { allowed: boolean, reason?: string }`

**边界条件**：config 中 `dangerousCommands = "auto-deny"` → 所有危险操作自动拒绝，不弹 HITL

### 3.7 记忆系统（Memory）

**职责**：跨会话存储与检索信息，按需注入 context

**输入**：`memory.set(key, value)` / `memory.get(key)` / `memory.query(keyword)`

**行为**：
- **短期记忆**：当前 session 的 `messages[]` 数组（由主循环自动管理，不单独存储）
- **长期记忆**：存储为 `.harness/memory.json`
  ```json
  {
    "conventions": { "indent": "2 spaces", "quotes": "single" },
    "decisions": [
      { "key": "use-fetch-over-axios", "value": "本项目使用 fetch API", "ts": "..." }
    ],
    "projectKnowledge": [
      { "key": "entry-point", "value": "src/index.ts", "ts": "..." }
    ]
  }
  ```
- **检索策略**：构建 system prompt 时，按关键词匹配筛选相关条目（非全量注入），匹配到的条目以 `<project_memory>` 标签追加到 system prompt 末尾

**边界条件**：memory.json 不存在 → 创建空文件；JSON 格式损坏 → 告警并重置为空

### 3.8 配置系统（Config）

**职责**：加载声明式配置，约束 Agent 行为

**配置文件**：`.harness/config.json`

```json
{
  "llm": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "maxTokens": 4096,
    "temperature": 0.1
  },
  "agent": {
    "maxRounds": 10,
    "maxRetries": 3,
    "workspaceRoot": "./",
    "allowedPaths": ["src/", "tests/"]
  },
  "guardrails": {
    "mode": "prompt",
    "allowedPatterns": []
  }
}
```

**行为**：
- 启动时加载 → 失败则使用默认值 + 告警
- 运行时不可热更新（需重启）
- `workspaceRoot` 限定所有工具的文件操作边界

**边界条件**：`maxRounds` 非法值（≤0）→ 回退为默认 10；`allowedPaths` 为空 → 允许操作 workspaceRoot 下所有路径

### 3.9 CLI 入口

**职责**：用户交互界面

**命令**：
- `rrratcoder run "修复 src/utils.ts 中的类型错误"` — 执行单次任务
- `rrratcoder config` — 交互式配置（录入 Key、修改参数）
- `rrratcoder key set|status|clear` — 凭据管理

**行为**：CLI 通过 Commander.js 实现，调用 AgentLoop.run() 执行任务

### 3.10 WebUI 入口

**职责**：查看 Agent 运行状态、历史记录、配置参数

**技术方案**：Express 后端 serve 静态 HTML + 原生 JS（不引入 React/Vue 等重型框架，把精力留给 harness 内核）

**页面**：
- 仪表盘：当前配置摘要、最近会话列表
- 会话详情：某次任务的轮次记录、每轮工具调用和反馈结果
- 配置管理：在线修改 config.json（非 Key 管理，Key 仅通过 CLI 录入）

---

## 4. 非功能性需求

### 4.1 性能

- Agent 主循环单轮响应时间（不含 LLM 调用）：< 50ms
- 校验器链（Lint + TypeCheck + Test）总执行时间：< 120s
- WebUI 页面首次加载：< 2s
- 文件读取工具：< 100ms（< 1MB 文件）

### 4.2 安全（含凭据威胁模型）

**威胁模型**：

| 威胁 | 风险 | 对策 |
|------|------|------|
| API Key 硬编码在源码中 | 🔴 泄露到 Git 仓库 | Key 仅通过凭据管理器存储，源码中无任何 Key 字面量 |
| `.env` 文件提交到 Git | 🟡 明文泄露 | `.gitignore` 排除 `.env`；首次运行引导录入而非手动编辑文件 |
| Key 出现在终端 history | 🟡 通过 `export` 命令泄露 | CLI 使用隐藏输入（password prompt），不经过 shell |
| Key 出现在日志中 | 🟡 日志文件泄露 | 日志中过滤 Key 模式（`sk-...`），替换为 `***` |
| 进程环境变量泄漏 | 🟢 子进程继承环境 | `.env` 仅在启动时加载到内存，不写入 `process.env` 共享 |
| 危险命令自动执行 | 🔴 不可逆破坏 | 护栏拦截 + HITL 审批，致命命令直接拒绝 |
| Agent 操作越界 | 🟡 修改非项目文件 | `write_file` 路径白名单，`shell` 后置反馈检查 |

**凭据存储方案**：
- **主要方案**：Windows Credential Manager（`credential-manager` 或直接调用 Windows API）
- **降级方案**：AES-256 加密文件（用户设定主密码）
- **不推荐但允许**：`.env` 文件（需在 README 中说明其明文风险）

**凭据生命周期**：
1. 首次运行 → 引导用户粘贴 Key（隐藏输入，不回显）
2. 运行时 → 从凭据管理器读取到内存变量（不落盘、不进日志）
3. 查看状态 → 显示 `****-xxxx`（后 4 位脱敏）
4. 更新 → 覆盖存储
5. 清除 → 从凭据管理器中删除

### 4.3 可用性

- CLI 命令命名直观，`--help` 提供完整说明
- WebUI 无需登录（本地运行，信任 localhost）
- 错误信息友好，包含发生位置和建议操作（而非裸堆栈）

### 4.4 可观测性

- 每轮 Agent 循环输出日志（结构化 JSON，可选文件输出）
- 日志级别：`DEBUG`（全量）、`INFO`（关键节点）、`ERROR`（仅异常）
- WebUI "会话详情"页展示完整轮次追踪

---

## 5. 系统架构

### 5.1 组件图

```
┌──────────────────────────────────────────────────────┐
│                    用户入口                           │
│          CLI (Commander.js)  │  WebUI (Express)      │
├──────────────────────────────────────────────────────┤
│                                                       │
│                   Harness 内核                         │
│                                                       │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ AgentLoop │  │  Tools   │  │  FeedbackLoop ★  │  │
│  │ (主循环)   │  │ (工具分发) │  │  (校验器链+分类器) │  │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│        │             │                 │             │
│  ┌─────┴─────┐  ┌────┴─────┐  ┌───────┴──────────┐  │
│  │ Guardrail │  │  Memory  │  │     Config       │  │
│  │ (护栏)    │  │  (记忆)   │  │    (配置加载)     │  │
│  └───────────┘  └──────────┘  └──────────────────┘  │
│        │                                            │
│  ┌─────┴──────────────────────────────────────────┐ │
│  │              LLM 抽象层 (Adapter)               │ │
│  │    DeepSeekAdapter  │  MockLLMAdapter           │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │                              │
├───────────────────────┼──────────────────────────────┤
│                   基础设施                            │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │Credential │  │ ShellExecutor│  │  Logger      │  │
│  │Manager    │  │ (child_process)│  │ (结构化日志)  │  │
│  └───────────┘  └──────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 5.2 数据流

```
用户输入 "修复类型错误"
        │
        ▼
   AgentLoop.run()
        │
        ▼
  构建 System Prompt（config 参数 + memory 注入）
        │
        ▼
  ┌─── LLMAdapter.chat(messages, tools) ───┐
  │     │                                   │
  │     ▼                                   │
  │  DeepSeek API (生产) / Mock (测试)       │
  └─────────────────┬───────────────────────┘
                    │
              LLM 返回 tool_call
                    │
                    ▼
            Guardrail.check()
              ┌─────┴─────┐
              ▼           ▼
           安全 ✅      危险 ⚠️ → HITL 审批
              │           │
              └─────┬─────┘
                    ▼
            ToolDispatcher.execute()
                    │
                    ▼
              ToolResult
                    │
                    ▼
            FeedbackLoop.validate()
              ┌─────┴─────┐
              ▼           ▼
           PASS ✅      FAIL ⚠️ → 注入反馈 → 回到 LLM
              │           │
              ▼           │ (retry ≤ maxRetries)
        下一轮或停机       │
                          ▼
                   超过重试上限 → 停机
```

### 5.3 外部依赖

| 依赖 | 用途 | 版本约束 |
|------|------|---------|
| `openai` npm | DeepSeek API 调用（OpenAI 兼容） | ^4.x |
| `commander` | CLI 框架 | ^12.x |
| `express` | WebUI 后端 | ^4.x |
| `vitest` | 测试框架 | ^2.x |
| `typescript` | 类型安全 + tsc 校验器 | ^5.x |
| `eslint` | 代码规范检查 + Lint 校验器 | ^9.x |
| `keytar` 或 Windows API | 凭据安全存储 | 最新 |

---

## 6. 数据模型

### 6.1 核心实体

```
Message {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

ToolCall {
  id: string
  type: "function"
  function: {
    name: string           // "read_file" | "write_file" | "shell" | "grep"
    arguments: string      // JSON string
  }
}

ToolResult {
  tool_call_id: string
  success: boolean
  output: string           // max 8000 chars
  error?: string
}

LLMResponse {
  finishReason: "stop" | "tool_calls" | "length" | "error"
  message: Message
  usage?: { promptTokens: number; completionTokens: number }
}

AgentResult {
  taskId: string
  status: "success" | "max_rounds" | "interrupted" | "error"
  rounds: number
  summary: string
  sessionLog: RoundRecord[]
}

RoundRecord {
  round: number
  llmCall: { input: Message[], output: LLMResponse }
  toolCall?: ToolCall
  toolResult?: ToolResult
  guardrail?: GuardResult
  feedback?: FeedbackResult
  timestamp: string
}
```

### 6.2 配置实体

```
Config {
  llm: { provider, model, maxTokens, temperature }
  agent: { maxRounds, maxRetries, workspaceRoot, allowedPaths }
  guardrails: { mode, allowedPatterns }
}
```

### 6.3 记忆实体

```
MemoryStore {
  conventions: Record<string, string>     // key-value 约定
  decisions: DecisionRecord[]             // 历史决策
  projectKnowledge: KnowledgeRecord[]     // 项目知识
}

DecisionRecord { key, value, timestamp }
KnowledgeRecord { key, value, timestamp }
```

### 6.4 反馈实体

```
FeedbackResult {
  passed: boolean
  errors: ClassifiedError[]
  retryCount: number
  validatorResults: {
    lint?: { passed: boolean; issues: LintIssue[] }
    typeCheck?: { passed: boolean; errors: TypeCheckError[] }
    test?: { passed: boolean; failures: TestFailure[] }
  }
}

ClassifiedError {
  category: "LINT_ERR" | "TYPE_ERR" | "TEST_ERR"
  file?: string
  line?: number
  message: string
  priority: number         // 1=最优先
}
```

---

## 7. 凭据与分发设计

### 7.1 凭据存储方案

**首选方案**：Windows Credential Manager
- 通过 Node.js 调用系统 API（`node-credential` 或直接 `child_process` 调 PowerShell `Set-Credential`）
- Target name：`RrratCoder/DeepSeekAPI`

**降级方案**：AES-256-GCM 加密文件
- 主密码由用户首次运行时设定（通过 CLI 隐藏输入）
- Key 文件存储在 `~/.rrratcoder/credentials.enc`
- 启动时需要输入主密码解密（可缓存到本次进程生命周期）

**引导流程**：
1. 首次运行 → 检测到无凭据 → `rrratcoder key set` 引导录入
2. 粘贴 Key → 隐藏输入 → 写入凭据管理器
3. 确认 "API Key 已安全存储"

**查看/更新/清除**：
- `rrratcoder key status` → 显示脱敏信息（`****-xxxx`）
- `rrratcoder key set` → 覆盖更新
- `rrratcoder key clear` → 从凭据管理器中删除

**在 SPEC 中已说明**：`.env` 明文风险（见 4.2 威胁模型），不建议作为主要方案。

### 7.2 分发设计

**选择形态**：Docker 容器镜像

**理由**：
- 跨平台一致运行环境
- 单条命令启动
- 内置 Node.js 运行时，无需用户安装
- 可与 GitHub Actions CI 流水线集成自动构建

**分发流程**：
1. CI 中 `docker build -t rrratcoder .`
2. 推送到公开 registry（Docker Hub 或 GitHub Container Registry）
3. 用户 `docker pull` + `docker run`

**Dockerfile 关键设计**：
- 基于 `node:22-alpine`（最小体积）
- 安装 ESLint、TypeScript（校验器链依赖）
- 暴露端口 3000（WebUI）
- Volume 挂载 `~/.rrratcoder/` 持久化配置和记忆
- `ENTRYPOINT ["node", "dist/cli.js"]`

**已知限制**：
- 容器内 ESLint/tsc 需要挂载用户项目代码
- Windows Credential Manager 在 Docker 容器内不可用 → **自动降级**为 AES-256-GCM 加密文件方案（检测到无 Credential Manager 时自动切换，README 中说明）
- 首次运行需在容器内交互输入 Key（需要 `-it` 模式）

### 7.3 Key 在目标机上的安全配置

**Docker 运行方式**：
```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.rrratcoder:/root/.rrratcoder \
  -p 3000:3000 \
  rrratcoder key set   # 首次：引导录入 Key
```

Key 存储在主机的 `~/.rrratcoder/credentials.enc`（加密文件），不进入镜像层。

---

## 8. 技术选型与理由

| 层面 | 选择 | 理由 |
|------|------|------|
| **语言** | TypeScript 5.x | 业界主流 Coding Agent（Claude Code、Cursor、Copilot）均使用 TS；全栈统一语言；类型安全降低 harness 内核 bug 率；Vitest 原生支持 |
| **运行时** | Node.js 22 LTS | 文件系统、子进程、CLI 生态最成熟 |
| **LLM 供应商** | DeepSeek（OpenAI 兼容） | 成本极低（百万 token 几分钱 vs OpenAI 几美元）；function calling 与 OpenAI 完全兼容，可用 `openai` SDK；符合"控制成本"要求 |
| **CLI 框架** | Commander.js | 轻量、成熟、学习成本低，满足 CLI 交互需求 |
| **WebUI 后端** | Express 4.x | 最成熟的 Node.js HTTP 框架，serve 静态文件 + 少量 API 路由即可 |
| **WebUI 前端** | 原生 HTML/JS（无框架） | 本项目核心是 Harness 内核，WebUI 仅做状态展示，不应占用过多开发精力 |
| **测试** | Vitest | 快、TS 原生、mock 机制灵活 |
| **CI/CD** | GitHub Actions | CI 配置文件格式需确认：§4.8 提及 GitHub Actions，§五.6 要求 `.gitlab-ci.yml`。本 SPEC 按 GitHub Actions 设计，最终以助教确认格式为准 |
| **LLM SDK** | `openai` npm（baseURL 指向 DeepSeek） | 无需额外 SDK，一行配置切换供应商 |
| **分发** | Docker | 跨平台、CI 集成简单、单条命令运行 |
| **凭据存储** | Windows Credential Manager + AES 加密文件降级 | 首选系统级安全存储，Docker 内降级为文件加密 |
| **设计系统** | 未使用 Open Design | 本项目 WebUI 为辅助型状态面板（3 个简单页面、无复杂交互），核心交付物是 Harness 内核 CLI，Open Design 要求豁免 |

---

## 9. 验收标准

| 功能 | "完成"的客观判定 |
|------|-----------------|
| 主循环 | 给定 mock LLM（3 轮后返回 finish），Agent 恰好运行 3 轮后停机；给定 mock LLM（永不 finish），Agent 在 maxRounds 后停机 |
| LLM 抽象层 | DeepSeekAdapter 可加载 Key 并成功调用 API；MockLLMAdapter 可按序返回预设响应 |
| 工具系统 | `write_file` 写入文件后 `read_file` 可读到相同内容；`grep` 能匹配到目标行 |
| 反馈闭环 | Mock: 注入 ESLint 错误输出 → 断言分类为 LINT_ERR；Mock: 注入测试失败 → 断言 LLM 收到反馈后改变下一步 action；超过 maxRetries(3) → 强制停机 |
| 治理护栏 | `guardrail({toolName: "shell", arguments: {command: "rm -rf /"}})` → 返回 DENIED |
| HITL | CLI 模式下危险命令被拦截并弹窗（需手动测试或 mock stdin） |
| 记忆系统 | `memory.set("indent", "2 spaces")` → 下一轮 system prompt 包含该值 |
| 配置系统 | 修改 `config.json` 中 `maxRounds=5` → 重启后 Agent 最多跑 5 轮 |
| 凭据安全 | API Key 不在源码/Git/日志/终端中出现；`key status` 只显示脱敏格式 |
| 分发 | `docker build && docker run` → Agent 可执行任务 |
| 一键测试 | `npm test` 运行所有单元测试（mock LLM，零网络依赖）且全部通过 |
| CI | push 触发 GitHub Actions，`unit-test` job 通过 |

---

## 10. 风险与未决问题

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DeepSeek API 不稳定或限流 | Agent 主循环卡住 | LLM 调用超时 30s + 1 次重试；降级到本地 mock 跟踪日志 |
| TypeScript 编译项目（tsc）为大型项目时太慢 | 校验器链超时 | 校验器超时 60s（可配置），超时标记为"跳过"而非失败 |
| Docker 容器内凭据管理不可用 | 用户无法安全存储 Key | 降级为 AES 加密文件 + 主密码方案；README 说明 |
| ESLint/tsc 作为校验器，但用户项目可能未配置 | 校验器报错退出 | 检测配置文件存在性，缺失时优雅跳过 |
| 反馈闭环的修正循环可能无限重试 | Agent 卡死 | `maxRetries=3` 硬限制，超限后报告 FAIL 并停机 |
| CI 配置文件命名矛盾（要求 `.gitlab-ci.yml` 但又提到 GitHub Actions） | CI 格式可能不对 | 以助教最终确认的格式为准；优先实现 GitHub Actions + `.github/workflows/unit-test.yml` |

---

## 11. 领域与机制设计（A 类额外章节）

### 11.1 Coding 领域的四类机制

| 机制类别 | Coding 领域的具体形态 |
|---------|---------------------|
| **动作 / 工具** | 读写文件（代码生成与修改）、执行 shell（构建/测试运行）、内容搜索（代码定位） |
| **客观反馈信号** | Lint（ESLint 输出）→ 语法/风格 → 确定；TypeCheck（tsc）→ 类型正确性 → 确定；Test（Vitest）→ 功能正确性 → 确定。三者均为**客观、可解析、可回灌**的确定性信号 |
| **危险动作** | 危险 shell 命令（rm -rf /、mkfs、fork bomb、curl|sh、git push --force to main）、文件路径越界（写出 workspaceRoot） |
| **记忆** | 项目编码约定（缩进、引号风格）、历史技术决策（如"用 fetch 不用 axios"）、项目结构知识（入口文件、关键模块） |

### 11.2 重点维度：反馈闭环（Main Contribution）

**选择理由**：
- 反馈闭环天然由**确定性代码**构成——每个校验器本质是"跑命令 → 解析输出 → 判定 pass/fail → 分类错误"，与 LLM 智能完全无关
- 三个校验器链 + 失败分类器 + 多轮修正状态机 + 上下文注入策略，层层递进，工程深度足够
- 最契合 A.4(C) 评分标准："移除 LLM 后用 mock 仍能单测验证"
- 在 Coding Agent 这一垂直领域，反馈闭环是最核心的差异化能力——一个不能"知道自己错了并修正"的 Agent 毫无实际价值

**编码实现路径**（呼应 §A.4）：

1. **校验器链**（对应"机制必须是代码"）：每个校验器是独立函数，输入文件路径 → 执行命令 → 解析 → 返回 `{passed, errors[]}`。三者通过 `ValidatorChain` 类串联执行，失败不短路（收集所有错误后再分类）
2. **失败分类器**（对应"不是提示词"）：`ClassifyError(stdout: string): ClassifiedError[]` 函数，纯字符串解析和正则匹配，完全确定性
3. **修正状态机**（对应"主循环的一部分"）：集成到 AgentLoop 中，状态转换由 `retryCount` 计数器驱动
4. **Mock 单测**（对应"移除 LLM 后仍可验证"）：所有上述函数输入 Mock 的 ESLint/tsc/vitest 输出字符串，断言分类结果和状态转换

### 11.3 各维度最低实现基准

| 维度 | 最低可运行实现 | 是否可 Mock 单测 |
|------|-------------|----------------|
| 决策/主循环 | 3 轮后收到 finish → 停机 | ✅ mock 编排响应序列 |
| 工具 | read_file, write_file, shell, grep 四个工具可调用 | ✅ mock 工具 handler |
| 反馈（★深）| Test 校验器可捕获 vitest 失败并回灌 | ✅ mock 命令输出 |
| 护栏 | `rm -rf /` 被正则匹配并拒绝 | ✅ 直接构造 action |
| 记忆 | 跨轮次 set/get 一个 key-value | ✅ mock LLM 触发读写 |
| 配置 | config.json 的 maxRounds 生效 | ✅ 注入不同 config |

---

## 附录：目录结构

```
rrratcoder/
├── .harness/                 # 运行时数据（不提交 Git）
│   ├── config.json
│   └── memory.json
├── src/
│   ├── core/
│   │   ├── agent-loop.ts     # 主循环
│   │   ├── llm-adapter.ts    # LLM 抽象层接口
│   │   ├── deepseek-adapter.ts
│   │   └── mock-adapter.ts
│   ├── tools/
│   │   ├── dispatcher.ts     # 工具分发器
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── shell.ts
│   │   └── grep.ts
│   ├── feedback/
│   │   ├── validator-chain.ts    # 校验器链
│   │   ├── lint-validator.ts
│   │   ├── typecheck-validator.ts
│   │   ├── test-validator.ts
│   │   ├── error-classifier.ts   # 失败分类器
│   │   └── retry-state.ts        # 修正状态机
│   ├── guard/
│   │   ├── guardrail.ts       # 护栏引擎
│   │   └── patterns.ts        # 危险模式库
│   ├── memory/
│   │   └── memory-store.ts    # 记忆存取
│   ├── config/
│   │   └── config-loader.ts   # 配置加载
│   ├── credentials/
│   │   └── credential-manager.ts  # 凭据管理
│   ├── cli/
│   │   └── index.ts           # CLI 入口
│   ├── web/
│   │   ├── server.ts          # Express 后端
│   │   └── public/
│   │       └── index.html     # WebUI 页面
│   └── types/
│       └── index.ts           # 共享类型定义
├── tests/
│   ├── core/
│   │   ├── agent-loop.test.ts
│   │   └── mock-adapter.test.ts
│   ├── tools/
│   │   └── dispatcher.test.ts
│   ├── feedback/
│   │   ├── validator-chain.test.ts
│   │   ├── error-classifier.test.ts
│   │   └── retry-state.test.ts
│   ├── guard/
│   │   └── guardrail.test.ts
│   ├── memory/
│   │   └── memory-store.test.ts
│   └── fixtures/              # 测试用 mock 数据
│       ├── eslint-output.txt
│       ├── tsc-output.txt
│       └── vitest-output.txt
├── Dockerfile
├── .gitlab-ci.yml           # 或 .github/workflows/
├── package.json
├── tsconfig.json
├── SPEC.md
├── PLAN.md
├── SPEC_PROCESS.md
├── AGENT_LOG.md
├── README.md
└── REFLECTION.md
```
