import type {
  LLMAdapter,
  HarnessConfig,
  AgentResult,
  Message,
  RoundRecord,
  ToolCall,
  ToolDef,
} from '../types/index';
import { guardrail } from '../guard/guardrail';
import { ValidatorChain } from '../feedback/validator-chain';
import { RetryState } from '../feedback/retry-state';
import { MemoryStore } from '../memory/memory-store';
import { ToolDispatcher } from '../tools/dispatcher';

export class AgentLoop {
  private validatorChain = new ValidatorChain();
  private memory: MemoryStore;

  constructor(
    private llm: LLMAdapter,
    private tools: ToolDispatcher,
    private config: HarnessConfig,
  ) {
    this.memory = new MemoryStore('.harness/memory.json');
  }

  async run(task: string): Promise<AgentResult> {
    const taskId = Date.now().toString(36);
    const sessionLog: RoundRecord[] = [];
    const messages: Message[] = [{
      role: 'system',
      content: this.buildSystemPrompt(),
    }, {
      role: 'user',
      content: task,
    }];

    const retryState = new RetryState(this.config.agent.maxRetries);
    let consecutivePasses = 0;

    for (let round = 1; round <= this.config.agent.maxRounds; round++) {
      const toolDefs = this.tools.getToolDefs();
      const llmResponse = await this.llm.chat(messages, toolDefs);
      messages.push(llmResponse.message);

      const record: RoundRecord = {
        round,
        llmResponse,
        timestamp: new Date().toISOString(),
      };

      // 停机条件1: LLM不调工具且finish
      if (llmResponse.finishReason === 'stop' && !llmResponse.message.tool_calls?.length) {
        sessionLog.push(record);
        return { taskId, status: 'success', rounds: round, summary: llmResponse.message.content, sessionLog };
      }

      // 停机条件2: LLM报错
      if (llmResponse.finishReason === 'error') {
        sessionLog.push(record);
        return { taskId, status: 'error', rounds: round, summary: 'LLM 调用返回错误', sessionLog };
      }

      // 处理工具调用
      const toolCall = llmResponse.message.tool_calls?.[0];
      if (!toolCall) {
        sessionLog.push(record);
        messages.push({ role: 'user', content: '请继续执行任务。' });
        continue;
      }

      record.toolCall = toolCall;

      // 解析参数
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        sessionLog.push(record);
        messages.push({
          role: 'tool',
          content: `Invalid JSON arguments: ${toolCall.function.arguments}`,
          tool_call_id: toolCall.id,
        });
        continue;
      }

      // 护栏检查
      const guardResult = guardrail(toolCall.function.name, args, this.config.guardrails.allowedPatterns);
      record.guardResult = guardResult;

      if (!guardResult.allowed) {
        sessionLog.push(record);
        messages.push({
          role: 'tool',
          content: `操作被拒绝: ${guardResult.reason || '危险操作'} (风险等级: ${guardResult.risk})。请使用替代方案。`,
          tool_call_id: toolCall.id,
        });
        continue;
      }

      // 执行工具
      const toolResult = await this.tools.execute(toolCall.function.name, args);
      record.toolResult = toolResult;

      messages.push({
        role: 'tool',
        content: toolResult.success ? toolResult.output : `错误: ${toolResult.error}`,
        tool_call_id: toolCall.id,
      });

      // 反馈闭环：只在写操作成功执行后触发校验
      if (['write_file', 'shell'].includes(toolCall.function.name) && toolResult.success) {
        const feedback = await this.validatorChain.run(this.config.agent.workspaceRoot);
        record.feedbackResult = feedback;

        if (!feedback.passed) {
          retryState.increment();
          consecutivePasses = 0;
          const feedbackMsg = this.validatorChain.formatFeedback(feedback);
          if (feedbackMsg) {
            messages.push({ role: 'user', content: feedbackMsg });
          }

          // 停机条件3: 重试次数耗尽
          if (!retryState.canRetry) {
            sessionLog.push(record);
            return {
              taskId, status: 'error',
              rounds: round,
              summary: `重试次数耗尽 (${retryState.current}/${this.config.agent.maxRetries})`,
              sessionLog,
            };
          }
        } else {
          consecutivePasses++;
          retryState.reset();
        }

        // 停机条件4: 连续两次校验通过
        if (consecutivePasses >= 2) {
          sessionLog.push(record);
          return { taskId, status: 'success', rounds: round, summary: '连续两次校验通过，任务完成', sessionLog };
        }
      }

      sessionLog.push(record);
    }

    return { taskId, status: 'max_rounds', rounds: this.config.agent.maxRounds, summary: '达到最大轮次', sessionLog };
  }

  private buildSystemPrompt(): string {
    const memPrompt = this.memory.buildContextPrompt();
    return `你是一个 Coding Agent，可以读写文件、执行命令、搜索代码来完成编程任务。
每次写操作后系统会自动运行校验（Lint、类型检查、测试），请你根据反馈结果进行修正。

关键规则：
- 工具失败时，分析错误原因并尝试替代方案。禁止放弃任务直接输出代码文本。
- 文件路径必须在工作目录内（使用相对路径，如 hello.py 而非 /abs/path/hello.py）。
- 如果命令执行失败，尝试系统可用的等效命令。

工作目录: ${this.config.agent.workspaceRoot}
最高重试次数: ${this.config.agent.maxRetries}
${memPrompt}`;
  }
}
