# SPEC_PROCESS.md — 规约与计划生成过程文档

> 记录与 Superpowers 协作生成 SPEC.md 和 PLAN.md 的全过程

---

## 一、Brainstorming 关键节点

### 节点 1：目标用户与核心场景抉择

**智能体追问**：这个 Harness 的定位是什么？直接决定了架构重心。给了三个清晰选项：

- A. 个人开发者助手（本地 CLI + WebUI）
- B. CI/CD 自动化修复器
- C. 团队代码审查协作者

**我的决策**：选择 A。根据作业文档要求，这是最合适的定位——Coding Agent Harness 面向个人开发者场景，CLI 交互 + WebUI 查看状态，无需多用户协作的复杂度。

**采纳 AI 建议**：是的，AI 将模糊的"Harness"概念具象化为三个清晰选项，降低了决策成本。

---

### 节点 2：Main Contribution 维度选择

**智能体追问**：六个维度都要最低实现，但必须选一个深入。给出三个建议：

- A. 治理护栏（多层危险动作识别 + HITL 状态机）
- B. 反馈闭环（校验器链 + 失败分类器 + 多轮修正状态机）
- C. 工具/扩展系统（插件化注册 + 工具编排）

**我的决策**：选择 B（反馈闭环）。理由：
1. A.4(C) 评分标准的核心判据是"移除 LLM 后仍可单测验证"——反馈闭环天然由确定性代码构成（校验器链解析 stdout → 分类 → 注入），最容易满足这一硬标准
2. 在 Coding 领域，反馈信号（测试/lint/类型检查）是最客观、最确定的
3. 工程深度层次清晰：校验器链 → 失败分类 → 修正状态机 → 上下文注入策略

**修正**：AI 介绍了后对 B 的描述让我更清晰了"什么是代码、什么是提示词"的界线。

---

### 节点 3：技术栈选型

**智能体追问**：TypeScript vs Python vs Go，并提供了业界主流 Coding Agent 的统计——Claude Code、Cursor、Copilot、Cline 全部用 TS。

**我的决策**：TypeScript。AI 提供的业界数据是关键说服点——"业界共识"比理论分析更有说服力。

**采纳 AI 建议**：AI 建议 Docker 分发抹平平台差异，简化跨平台问题。

---

### 节点 4：LLM 供应商选择

**最初想法**：选 OpenAI

**AI 提问**：A（OpenAI）、B（Anthropic）、C（双供应商），推荐 A

**我推翻 AI 建议**：选择 DeepSeek。当时想到 DeepSeek 提供 OpenAI 兼容 API，成本极低（百万 token 几分钱 vs 几美元），完全符合作业"控制成本"要求

**AI 修正后确认**：DeepSeek 是 OpenAI API 兼容的，可以直接用 `openai` npm SDK，只需改 `baseURL`。这反而简化了 LLM 抽象层设计——不需要多供应商适配，一个 OpenAI 兼容接口搞定。

---

### 节点 5：WebUI 技术选择

**AI 建议**：轻量方案（Express + 原生 HTML/JS），不引入 React/Vue 等重型框架。核心理由：WebUI 是辅助功能，核心是 Harness 内核。

**我的决策**：同意。把精力集中在反馈闭环和 harness 内核上。

**反思**：这是一个很好的 YAGNI 实践——WebUI 有 React 当然更好，但在本项目评分体系中，Harness 内核的深度才是评分重点。

---

## 二、至少 3 轮关键迭代

### 第 1 轮：从"做项目"到"做设计"

**对话节选**：
> AI："这个 Harness 的定位直接决定了架构重心。以下哪种最接近你的设想？"
> 我："根据作业文档要求，是 A"

**处理决策**：AI 将模糊的"我要做 Coding Agent Harness"转化为可编码的具体场景，避免了"先写代码再说"的陷阱。

---

### 第 2 轮：深入理解 Mock 的作用

**对话节选**：
> 我："mock的作用是什么"
> AI：（详细解释 mock 如何隔离 LLM 的不确定性，给出有 mock/无 mock 的对比示例）
> 我："这个测试是生产环境的测试 还是开发环境的测试"
> AI：（解释开发环境、CI 环境、生产环境的测试分层策略）

**处理决策**：这两轮追问暴露了我最初对"机制必须是代码"的理解不够深入。AI 用对比示例让我清楚知道：代码版的 `guardrail(action)` 和提示词版的"不要执行危险命令"的差异不在功能上（两者都能拦截），而在**可验证性**上。

**修订**：以此加深了对 SPEC 中验收标准的写法——每个验收标准都要能被 mock LLM 独立验证。

---

### 第 3 轮：SPEC 自审

**对话节选**：
> AI："自审查结果：发现 3 个需修正的问题：P1 Open Design 声明不充分、P2 CI 配置名矛盾、P3 Docker 凭据降级逻辑不清晰"

**处理决策**：三个问题全部修复：
1. Open Design 豁免说明补充："WebUI 为辅助型状态面板，核心交付物是 Harness 内核 CLI"
2. CI 配置名矛盾在技术选型表和技术风险中双处标注
3. Docker 凭据降级从"降级为加密文件方案"改为"**自动降级**（检测到无 Credential Manager 时自动切换）"

---

## 三、AI 建议采纳 vs 推翻

### 采纳的建议

| 建议 | 出处 | 理由 |
|------|------|------|
| TypeScript 技术栈 | 节点3 | 业界主流 Coding Agent 的共识选择 |
| 反馈闭环作为 Main Contribution | 节点2 | 天然由确定性代码构成，最契合 A.4(C) |
| WebUI 用轻量方案 | 节点5 | YAGNI，避免喧宾夺主 |
| Docker 凭据自动降级 | 节点4 | 提升用户体验，减少 README 中手动配置步骤 |
| 校验器链 2000 字符截断 | PLAN | 防止撑爆 LLM context，实用且可单测 |

### 推翻/修正的

| 建议 | 原始建议 | 我的修正 | 理由 |
|------|---------|---------|------|
| LLM 供应商 | OpenAI | DeepSeek | 成本可控（百万 token 几分钱），OpenAI 兼容无需额外 SDK |
| 记忆系统 | 简单文件存储 | 增加关键词检索 + context 注入 | 虽然是最低实现，但检索能力是"按需注入"的基础 |

---

## 四、反思：Brainstorming 技能的优劣

### 做得好的地方

1. **一次只问一个问题**：每个问题都是选择题（2-3 个选项），避免了"你想做什么"这种开放式问题导致的分析瘫痪
2. **分段展示设计**：架构概览 → 逐模块展开 → 逐个确认，节奏控制得当，不会一下子丢出 20 页设计让人拒接
3. **硬性 Gate**：明确声明"在向用户展示设计并获得批准之前，绝对不要编写任何实现代码"，这在 AI 协作中极为重要
4. **自审环节**：写完 SPEC 后主动执行自审并发现 3 个问题，这在人类写文档时也经常被忽略

### 让我不满的地方

1. **没有主动获取外部上下文**：在这个过程中，我只获取了需求文档，但没有主动去获取 Superpowers 官方文档作为参考。如果 AI 能主动说"让我先看看 Superpowers 文档中关于 harness 设计的最佳实践"，可能会发现有价值的约束或建议
2. **技术栈建议偏向现有知识**：我推荐的业界数据（Claude Code、Cursor 等用 TS）来自我自己的知识，没有通过实际搜索验证。如果 AI 能搜索确认，说服力会更强
3. **PLAN 中 Mock 的覆盖率**：虽然每个模块都设计了 mock 单测，但没有明确"待定 mock 覆盖矩阵"来跟踪哪些机制已覆盖、哪些未覆盖

### 如果重做

- 在 brainstorming 开始前，先用 WebSearch 搜索"building a coding agent harness from scratch"等相关资料，获取第一手经验
- 在写完 PLAN 后，增加一个"Mock 覆盖矩阵"（每个机制的测试覆盖率目标）
- 对记忆系统的最低实现可以再精简——初步设计有点超过"最低"的边界

---

## 五、冷启动验证（模拟零上下文 Agent 审查）

> 未实际切换 Agent，而是以"零上下文工程师"视角逐行审查 SPEC + PLAN，发现以下问题。
> 这等价于冷启动验证的核心目标：**暴露 spec 中未明文写下的隐性假设**。

### 审查方法

模拟一个仅拿到 SPEC.md + PLAN.md、无任何对话历史的工程师，从 Task 1 开始逐 task 推进。在每个"会卡住"的位置记录：
- 哪个 task 受阻？
- 缺少什么信息？
- 是 SPEC 写漏了还是 PLAN 实现偏离了？

---

### 发现 1（P4）：AgentLoop 未集成 MemoryStore

**受阻位置**：Task 11（AgentLoop 实现）

**现象**：SPEC §3.7 明确要求"构建 system prompt 时注入记忆"，但 PLAN Task 15 的 `AgentLoop.buildSystemPrompt()` 完全未调用 `MemoryStore`。一个零上下文工程师在实现完 MemoryStore 后，会发现 AgentLoop 根本没用到它，进而困惑"记忆系统怎么接入主循环"。

**根因**：SPEC 写清楚了 **要做什么**（注入记忆），但 PLAN 的实现代码 **没做**。属于 PLAN 偏离 SPEC。

**修订**：AgentLoop 的 `buildSystemPrompt()` 需要增加 `memory.buildContextPrompt()` 调用（已在 Task 4 实现），追加到 system prompt 末尾。

**修订前后 diff**：
```diff
  private buildSystemPrompt(): string {
+   const memPrompt = this.memory.buildContextPrompt();
    return `你是一个 Coding Agent...
-   工作目录: ${this.config.agent.workspaceRoot}`;
+   工作目录: ${this.config.agent.workspaceRoot}
+   ${memPrompt}`;
  }
```

---

### 发现 2（P5）：CredentialManager 中 ESM 不兼容的 `require()`

**受阻位置**：Task 5（凭据管理）编译阶段

**现象**：`package.json` 设了 `"type": "module"`，但 `credential-manager.ts` 的 `clear()` 方法中使用了 `const { unlinkSync } = require('fs')`。ESM 模块中 `require` 未定义，编译会报错。

**根因**：PLAN 代码直接在 CJS 习惯下写出，未考虑 ESM 环境。

**修订**：改为 ESM import。

**修订前后 diff**：
```diff
  clear(): void {
    if (existsSync(this.filePath)) {
-     const { unlinkSync } = require('fs');
      unlinkSync(this.filePath);
    }
```
（`unlinkSync` 已在文件顶部 `import { ..., unlinkSync } from 'fs'` 中导入）

---

### 发现 3（P6）：`.harness/` 目录和默认配置文件创建缺失

**受阻位置**：Task 11（AgentLoop 首次运行）

**现象**：SPEC 规定配置从 `.harness/config.json` 加载、记忆存到 `.harness/memory.json`。但 PLAN 中没有任何 task 负责创建 `.harness/` 目录或生成默认配置文件。工程师在 Task 2 写完了 ConfigLoader，但 Task 11 运行时 `.harness/` 目录不存在 → ConfigLoader 会走降级逻辑使用默认值 → 但 MemoryStore 首次写入时会因目录不存在而失败（Task 4 的 save 方法会 `mkdirSync`，但也依赖 `.harness/` 存在）。

**根因**：SPEC 定义了"运行时数据目录"的概念，但没有 task 负责初始化它。默认 config.json 的生成规则也未明确。

**修订**：在 Task 2（ConfigLoader）中增加：首次加载时若 `.harness/` 不存在，自动创建目录并写入默认 config.json。MemoryStore 的 save 方法保留 `mkdirSync`。

**修订前后 diff（Task 2 config-loader.ts）**：
```diff
  export function loadConfig(filePath: string): HarnessConfig {
    if (!existsSync(filePath)) {
+     const dir = dirname(filePath);
+     if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
+     writeFileSync(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.warn(`配置文件 ${filePath} 不存在，已创建默认配置`);
      return { ...DEFAULT_CONFIG };
    }
```

---

### 发现 4（P7）：PLAN 文件结构规划与 tests/ 目录不一致

**受阻位置**：Task 2（创建 test 文件时目录不存在）

**现象**：PLAN 开头的"文件结构规划"列出了 `tests/` 下的子目录：`core/`、`tools/`、`feedback/`、`guard/`、`memory/`、`fixtures/`、`integration/`。但 Task 2 创建了 `tests/config/config-loader.test.ts`，Task 5 创建了 `tests/credentials/credential-manager.test.ts`——这两个目录不在文件结构规划中。

**根因**：文件结构规划与实际 task 创建的目录不同步。零上下文工程师按文件结构规划创建目录后再执行 task 会困惑。

**修订**：在 PLAN 文件结构规划中补充 `tests/config/`、`tests/credentials/`。

---

### 发现 5（P8）：Grep 工具 Windows 兼容性未在 SPEC 说明

**受阻位置**：Task 8（grep 工具实现）在 Windows 上测试

**现象**：PLAN 中 grep 工具使用了 `2>nul`（Windows cmd 语法）和 `2>/dev/null`（Unix 语法）分支判断。但如果工程师在 PowerShell 中运行——`2>nul` 在 PowerShell 中行为不同于 cmd——可能得到非预期结果。SPEC 未说明平台兼容性策略。

**根因**：SPEC §4.2 已知限制只说"主要支持 Windows"，但没说 Windows 下 cmd vs PowerShell 的行为差异。

**修订**：
- SPEC §4.2 已知限制补充："grep 工具在 Windows 上使用 `findstr`（需 cmd 环境），PowerShell 下建议使用 WSL 或 Git Bash"
- PLAN Task 8 增加注释说明平台假设

---

### 发现 6（P9）：反馈闭环触发时机 SPEC 与 PLAN 不完全一致

**受阻位置**：Task 11（AgentLoop 集成反馈闭环）

**现象**：PLAN 中 AgentLoop 只在 `['write_file', 'shell']` 后触发反馈闭环。但 SPEC §3.5 描述为"对 Agent 的**每一次工具执行结果**进行客观判定"——给人一种"每次工具调用后都跑校验"的印象。工程师可能困惑：为什么 `read_file` 和 `grep` 后不跑校验？

**根因**：SPEC 措辞"每一次"过于绝对，实际设计是在"可能改变代码状态的操作"后才跑校验。

**修订**：SPEC §3.5 改为："对 Agent 的**写操作**（write_file、shell）执行后进行校验判定"，并说明读操作不触发校验的原因（读不会改变代码状态，校验无意义且浪费资源）。

**修订前后 diff**：
```diff
- **职责**：对 Agent 的每一次工具执行结果进行客观判定
+ **职责**：对 Agent 的写操作（write_file、shell）执行后进行客观判定。
+ 读操作（read_file、grep）不触发校验——读取不改变代码状态，无校验必要。
```

---

### 发现 7（P10）：PLAN 中模块导入路径后缀不一致

**受阻位置**：Task 1 后的任意 task 的 import 语句

**现象**：Task 4 的测试 import 写的是 `from '../../src/memory/memory-store.js'`（带 `.js`），但 Task 3 的测试 import 写的是 `from '../../src/core/mock-adapter.js'`（也带 `.js`）。然而 tsconfig 中 `moduleResolution: "bundler"` 加上 Vitest 实际**不需要 `.js` 后缀**。工程师可能在不同 task 间看到不同写法，不确定哪种正确。

**根因**：PLAN 代码片段由 AI 在不同上下文生成，未统一后缀规范。

**修订**：
- PLAN 开头增加"编码规范"说明：所有相对 import 不加 `.js` 后缀（Vitest + tsconfig bundler 模式自动解析）
- 统一各 task 中的 import 语句

---

### 审查汇总

| # | 严重度 | 问题 | 类型 | 修订文件 |
|---|--------|------|------|---------|
| P4 | 🔴 | AgentLoop 未集成 MemoryStore | PLAN 偏离 SPEC | SPEC.md + PLAN.md |
| P5 | 🟡 | ESM 下 `require()` 不兼容 | PLAN 代码错误 | PLAN.md |
| P6 | 🟡 | `.harness/` 目录初始化缺失 | SPEC+PLAN 遗漏 | PLAN.md |
| P7 | 🟢 | tests/ 目录结构不同步 | PLAN 不一致 | PLAN.md |
| P8 | 🟢 | Grep Windows 兼容性未说明 | SPEC 不准 | SPEC.md |
| P9 | 🟡 | 反馈闭环触发时机措辞不一致 | SPEC 措辞 | SPEC.md |
| P10 | 🟢 | Import 后缀不统一 | PLAN 风格 | PLAN.md |

---

## 六、过程数据

- **Brainstorming 轮次**：5 个追问节点
- **关键迭代**：3 轮深入讨论
- **SPEC 行数**：784 行（11 章节）
- **PLAN 行数**：2434 行（16 个 Task）
- **自审发现问题**：3 个（P1-P3）
- **耗时**：约 2 小时（含文档编写）
