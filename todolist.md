# AI4SE 期末项目 · A · Coding Agent Harness — TodoList

> 项目完整要求 = `项目要求.md`（通用要求） + `AI4SE_Final_Project_A_Coding_Agent_Harness.md`（A 类专属）

---

## 阶段一：环境搭建与准备

> **⚠️ 红线提醒：** 你的 harness 内核不得寄生在现成 agent 编排框架的高层循环之上。禁止使用：LangChain `AgentExecutor`、AutoGen、CrewAI、LlamaIndex agent、编码智能体 SDK 自带的 agent runner。允许使用底层零件（LLM API、HTTP 库、向量库、解析库）。

- [ ] **1.1** 阅读 Superpowers 文档与发布博文，理解七步工作流（`brainstorming` → `writing-plans` → `using-git-worktrees` → `subagent-driven-development` / `executing-plans` → `test-driven-development` → `requesting-code-review` → `finishing-a-development-branch`）
- [ ] **1.2** 选择主编码智能体（Claude Code / Codex CLI / Cursor / Gemini CLI 等）并安装 Superpowers 插件
- [ ] **1.3** 初始化 Git 仓库（公开），配置 `.gitignore`（排除 `.env`、凭据、密钥文件、node_modules 等）
- [ ] **1.4** 确定技术选型（语言、LLM 供应商、分发形态），阅读对应操作系统的凭据管理 API 文档（Windows Credential Manager）

---

## 阶段二：规约与计划生成（brainstorming → writing-plans）

- [ ] **2.1** 触发 `brainstorming` 技能，与智能体协作产出设计，逐模块签字确认
- [ ] **2.2** 编写 `SPEC.md`，包含以下 10 个必选章节 + 1 个 A 类额外章节：
  - 问题陈述、目标用户、价值主张
  - 用户故事（≥5 个，INVEST 原则）
  - 功能规约（输入/行为/输出/边界条件/错误处理）
  - 非功能性需求（性能、**安全含凭据威胁模型**、可用性、可观测性）
  - 系统架构（组件图、数据流、外部依赖含 LLM 供应商）
  - 数据模型（实体、字段、关系、约束）
  - 凭据与分发设计（key 存储方案、录入/更新/清除流程、分发形态、目标机安全配置）
  - 技术选型与理由（语言、框架、LLM 供应商、分发与部署平台；**若有 WebUI 须说明所选 Open Design 设计系统与 skill**）
  - 验收标准（每个功能"完成"的客观判定标准）
  - 风险与未决问题（预见可能让智能体出问题的环节）
- [ ] **2.3** 在 `SPEC.md` 中额外加入「领域与机制设计」章节：
  - 该领域（coding）的反馈信号、危险动作、所需工具、记忆需求
  - 选择哪个维度作为重点（main contribution），为什么
  - 这些机制将如何编码实现（呼应 §A.4）
- [ ] **2.4** 触发 `writing-plans` 技能，生成 `PLAN.md`：
  - 每个 task 颗粒度足够细（2–5 分钟），可由一个 subagent 在一次会话内完成
  - 每个 task 包含：目标、涉及文件、预期实现要点、**验证步骤（含将要写的失败测试）**
  - 显式标注 task 间依赖与可并行部分（用于 worktree 并行）
- [ ] **2.5** 编写 `SPEC_PROCESS.md`：
  - brainstorming 关键节点记录
  - ≥3 轮关键迭代的对话节选与决策
  - AI 建议采纳 vs 推翻的记录与理由
  - 反思 brainstorming 技能的优劣

---

## 阶段三：冷启动验证（用不同智能体验证 SPEC + PLAN）

- [ ] **3.1** 换一个**不同类型**的智能体，全新 session，不导入任何历史或 memory，仅凭 `SPEC.md` + `PLAN.md` 实现 1-2 个 task（约 1-2 小时）。**关键约束：** 明确指令其"遇到不确定之处即暂停询问，而非凭猜测继续"
- [ ] **3.2** 记录到 `SPEC_PROCESS.md`：
  - 第二个 agent 在哪里暂停并提问
  - 暴露了哪些 spec 缺陷
  - 产出与预期差距
  - 修订前后的关键 diff
- [ ] **3.3** 根据冷启动反馈修订 `SPEC.md` 和 `PLAN.md`

---

## 阶段四：Harness 内核实现（TDD 驱动，subagent 派发）

> **核心纪律：** ① 机制必须是代码，不能是提示词——反馈信号 = 校验器/传感器（代码），危险动作拦截 = guardrail 函数（代码）；② 六个维度（决策/工具/记忆/治理/反馈/配置）都要有**可运行的最低实现**，缺一项 harness 就不成立；③ 然后选一个维度深入作为 main contribution；④ 移除真实 LLM 后，每个核心机制仍能用 mock 做确定性单测。

- [ ] **4.1** `git worktree` 隔离工作区：每个独立功能 / 大模块开一个 worktree，对应一个 PR
- [ ] **4.2** 实现 **agent 主循环**：组织上下文 → 调用 LLM → 解析动作 → 分发执行 → 回灌结果 → 停机判断
- [ ] **4.3** 实现 **可注入 mock 的 LLM 抽象层**（替换为 mock 可离线测试，也可接入真实 LLM 供应商）
- [ ] **4.4** 实现 **动作 / 工具系统**（最低实现）：读写文件、执行 shell、运行构建与测试等
- [ ] **4.5** 实现 **客观反馈闭环**（最低实现）：校验器 / 传感器 → 客观判定 → 回灌循环（代码实现，非提示词）
- [ ] **4.6** 实现 **治理护栏**（最低实现）：危险动作识别 → 拦截 → 人工审批 HITL（代码实现，非提示词）
- [ ] **4.7** 实现 **记忆 / 上下文系统**（最低实现）：跨会话存储与检索，按需提供给 LLM
- [ ] **4.8** 实现 **配置系统**（最低实现）：声明式规则约束 agent 行为
- [ ] **4.9** 选择一个维度**深入实现**（建议：治理/反馈闭环/扩展）作为 main contribution
- [ ] **4.10** **TDD 强制流程**（每个 task 循环）：先编写失败测试 → 确认红色（失败）→ subagent 写最少代码变绿 → 重构
- [ ] **4.11** **两阶段评审**（每个 task 完成后）：先 spec 合规检查 → 再代码质量检查；Critical issue 必须修复才能进入下一 task
- [ ] **4.12** `finishing-a-development-branch`：所有 task 完成后触发该技能，决定 merge / PR / 保留 / 丢弃
- [ ] **4.13** commit message / PR 描述中**标注**：由哪个 subagent 完成、人工修改了哪些部分

---

## 阶段五：Mock-LLM 单元测试（核心机制确定性测试）

> **判定标准：替换为 mock/stub LLM 后，仍能用确定性单元测试验证它工作。**

- [ ] **5.1** 编写 mock-LLM 驱动的 **主循环** 单元测试
- [ ] **5.2** 编写 **工具分发** 确定性测试
- [ ] **5.3** 编写 **治理护栏拦截** 确定性测试（`guardrail(action)` 函数级）
- [ ] **5.4** 编写 **反馈回灌** 确定性测试
- [ ] **5.5** 编写 **记忆读写** 确定性测试
- [ ] **5.6** 编写 **停机逻辑** 确定性测试

---

## 阶段六：机制演示（3 个确定性行为演示）

- [ ] **6.1** 演示①：治理护栏拦截一个危险动作（mock LLM 下）
- [ ] **6.2** 演示②：注入一次失败，反馈闭环使 agent 收到反馈并据此改变下一步动作
- [ ] **6.3** 演示③：重点维度（main contribution）的确定性行为

---

## 阶段七：凭据安全与分发

- [ ] **7.1** 实现凭据安全存储：
  - Windows Credential Manager 或加密文件方案（带主密码）
  - `.env` 仅作为加载来源之一，需在 SPEC 中说明其明文风险
  - 首次运行引导用户安全录入 key（隐藏输入，非命令行 export）
  - 支持查看（不回显明文）/ 更新 / 清除
  - 绝不硬编码、不提交 Git（含历史）、不写入日志/终端 history/明文配置文件
- [ ] **7.2** 选择并实现分发形态（Docker / 二进制 / 包管理器 任选或组合）
  - Docker：单条 `docker build` + `docker run` 可启动，推送到公开 registry
  - 二进制：单文件可执行，说明目标平台与 CPU 架构、首次运行系统拦截处理
  - 包管理器：npm / PyPI / cargo / Homebrew，给出安装命令
- [ ] **7.3** 编写 `Dockerfile` 或构建脚本，**CI 中必须包含构建步骤**（容器分发须构建镜像，二进制分发鼓励产出可下载构建产物）

---

## 阶段八：CI/CD 与测试基础设施

> **注意：** 文档 §4.8 规定 CI 使用 GitHub Actions，但 §五.6 要求配置文件为 `.gitlab-ci.yml`。请自行确认最终提交的 CI 格式要求（可能是 GitHub Actions + `.github/workflows/` 或 GitLab CI + `.gitlab-ci.yml`），确保包含名为 `unit-test` 的 job。

- [ ] **8.1** 配置 CI（GitHub Actions 或 GitLab CI），**必须**包含名为 `unit-test` 的 job，每次 push 自动运行测试
- [ ] **8.2** 实现一键测试命令（`make test` 或等价），覆盖核心功能
- [ ] **8.3** 确保最后一次 CI/CD 执行 **pass** 状态

---

## 阶段九：部署与 WebUI

- [ ] **9.1** 部署到云平台（Vercel / Render / Railway / Fly.io / 阿里云 / 腾讯云等），注意**控制成本，优先免费额度**
- [ ] **9.2** 提供可访问的 WebUI 接口（提供公网 URL，README 中说明部署架构与 CI/CD）
- [ ] **9.3** 若涉及前端/UI：使用 **Open Design** 进行界面开发，并在 SPEC 中说明所选设计系统与 skill

---

## 阶段十：文档交付物整理

- [ ] **10.1** 完善 `README.md`（必须包含以下章节）：
  - 项目简介、安装、运行命令
  - 分发命令（获取方式、key 在目标机器上的安全配置方式、已知限制——平台/架构/依赖前提）
  - 目录结构、安全边界说明
  - 部署架构与 CI/CD 说明
  - 第三方库及其许可证列表（遵守 §六学术规范）
- [ ] **10.2** 持续更新 `AGENT_LOG.md`（按时间顺序，每条包含）：
  - 时间戳与 task 编号
  - 触发的 Superpowers 技能
  - 关键 prompt / context 配置
  - subagent 输出的关键片段或 commit hash
  - 人工干预（修改了什么、为什么）
  - 学到的教训
  - **偏离 Superpowers 七步工作流时，记录偏离理由与解释**（§3.6 要求）
- [ ] **10.3** 持续更新 `PLAN.md`（每完成一个 task 标记完成并附 commit hash）
- [ ] **10.4** 撰写 `REFLECTION.md`（1500–2500 字反思报告，**必须手写**，可用 AI 辅助润色但需标注），至少回答：
  - 哪些 Superpowers 技能发挥了最大作用、哪些"形式大于实质"？
  - TDD 强制在 AI 协作下是阻碍还是放大器？
  - subagent-driven 工作流让智能体能自主运行多久而不偏离主题？什么样的 task 颗粒度最优？
  - SPEC / PLAN 质量如何影响实现质量（举一个"规约不清导致 subagent 偏离"的具体案例）
  - 你最有效的 prompt / context 策略是什么、为什么有效？
  - 凭据与分发这两条工程要求，迫使你想清楚了哪些原本会忽略的问题？
  - 如果重做你会改变什么？
  - 你对 Superpowers 这套方法论的批判——它假设了什么，这些假设在你的项目里成立吗？
- [ ] **10.5** 学术规范自查：
  - 手写核心代码是否在文件/函数顶部注释说明？
  - 第三方代码是否遵守其许可证并在 README 中列出？
  - REFLECTION 是否确认为本人撰写（非 AI 代写）？
- [ ] **10.6** 最终自查：
  - 所有交付物完整（SPEC / PLAN / SPEC_PROCESS / AGENT_LOG / README / REFLECTION / CI 配置 / 源码 / 机制演示）
  - **仓库内无任何真实凭据**（提交前自查 `.env`、history、配置文件）
  - commit / PR 历史规范（拒绝单次 commit 提交全部代码；每个 worktree 对应一个 PR）
  - 线上部署 URL 可访问
  - 最后一次 CI/CD 执行 pass

---

## 最终交付物清单（对照 §五）

| # | 交付物 | 对应 Task |
|---|--------|----------|
| 1 | `SPEC.md` | 2.2, 2.3 |
| 2 | `PLAN.md` | 2.4, 10.3 |
| 3 | `SPEC_PROCESS.md` | 2.5, 3.2 |
| 4 | 完整源代码（含 harness 内核 + mock-LLM 测试，无真实凭据） | 阶段四、五 |
| 5 | 分发产物（Dockerfile / 构建脚本）+ README 分发说明 | 7.2, 7.3, 10.1 |
| 6 | `README.md`（含项目简介、安装、运行、分发、目录结构、安全边界、部署架构、第三方许可） | 10.1 |
| 7 | `AGENT_LOG.md`（含偏离 Superpowers 工作流的记录与解释） | 10.2 |
| 8 | CI 配置（含 `unit-test` job；每次 push 自动运行测试；若容器分发须构建镜像） | 8.1 |
| 9 | CI/CD 执行记录（最后一次 pass） | 8.3 |
| 10 | `REFLECTION.md`（1500–2500 字，手写，覆盖 8 个必答问题） | 10.4 |
| 11 | 线上部署 URL（WebUI 可访问，README 说明部署架构与 CI/CD） | 9.1, 9.2 |
| 12 | 机制演示（3 个确定性行为） | 阶段六 |

---

## 额外提醒（容易遗漏的硬性要求）

- [ ] **鼓励多智能体比较**（§3.6）：组合使用多种智能体并比较其表现，可在 `AGENT_LOG.md` 或 `REFLECTION.md` 中体现
- [ ] **SPEC/PLAN 完成前禁止编码**（§4）：在 SPEC 与 PLAN 完成并通过冷启动验证之前，不得编写任何实现代码
- [ ] **配置文件、规则文件、提示词文件不计入 harness 实现工作量**（A.4-C）：评分只看代码实现的机制
- [ ] **至少 3 个以上职责清晰的功能模块**（§3.4）
- [ ] **凭据与分发经得起"在一台全新机器上从零运行"的检验**（§3.4）
