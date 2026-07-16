import OpenAI from 'openai';
import type { LLMAdapter, LLMResponse, Message, ToolDef } from '../types/index';

export class DeepSeekAdapter implements LLMAdapter {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string = 'https://api.deepseek.com') {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat(messages: Message[], tools: ToolDef[]): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        })) as any,
        tools: tools.length > 0 ? tools.map(t => ({
          type: 'function' as const,
          function: t.function,
        })) : undefined,
        temperature: 0.1,
        max_tokens: 4096,
      });

      const choice = response.choices[0];
      const finishReason = choice.finish_reason as 'stop' | 'tool_calls' | 'length';

      return {
        finishReason,
        message: {
          role: 'assistant',
          content: choice.message.content || '',
          tool_calls: choice.message.tool_calls?.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        },
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
        } : undefined,
      };
    } catch (err: any) {
      return {
        finishReason: 'error',
        message: { role: 'assistant', content: '' },
      };
    }
  }
}
