import type { LLMAdapter, LLMResponse, Message, ToolDef } from '../types/index';

export class MockLLMAdapter implements LLMAdapter {
  private responses: LLMResponse[] = [];
  private index = 0;

  setResponses(...responses: LLMResponse[]): void {
    this.responses = responses;
    this.index = 0;
  }

  async chat(_messages: Message[], _tools: ToolDef[]): Promise<LLMResponse> {
    if (this.index >= this.responses.length) {
      throw new Error('MockLLMAdapter: 没有更多预设响应。请确保 setResponses 包含足够的响应序列。');
    }
    return this.responses[this.index++];
  }
}
