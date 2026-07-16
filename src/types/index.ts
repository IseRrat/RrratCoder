// ===== LLM 类型 =====
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface LLMResponse {
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  message: Message;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LLMAdapter {
  chat(messages: Message[], tools: ToolDef[]): Promise<LLMResponse>;
}

// ===== 工具类型 =====
export interface ToolContext {
  workspaceRoot: string;
  allowedPaths: string[];
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

// ===== 反馈类型 =====
export interface FeedbackResult {
  passed: boolean;
  errors: ClassifiedError[];
  retryCount: number;
  validatorResults: {
    lint?: { passed: boolean; issues: LintIssue[] };
    typeCheck?: { passed: boolean; errors: TypeCheckError[] };
    test?: { passed: boolean; failures: TestFailure[] };
  };
}

export interface ClassifiedError {
  category: 'LINT_ERR' | 'TYPE_ERR' | 'TEST_ERR';
  file?: string;
  line?: number;
  message: string;
  priority: number;
}

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
}

export interface TypeCheckError {
  file: string;
  line: number;
  message: string;
  code: number;
}

export interface TestFailure {
  testName: string;
  message: string;
  expected?: string;
  received?: string;
}

export interface Validator {
  name: string;
  validate(workspaceRoot: string): Promise<{ passed: boolean; issues: unknown[] }>;
}

// ===== 护栏类型 =====
export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'FATAL';

export interface GuardResult {
  allowed: boolean;
  risk: RiskLevel;
  reason?: string;
}

// ===== 记忆类型 =====
export interface DecisionRecord {
  key: string;
  value: string;
  timestamp: string;
}

export interface MemoryData {
  conventions: Record<string, string>;
  decisions: DecisionRecord[];
  projectKnowledge: DecisionRecord[];
}

// ===== 配置类型 =====
export interface HarnessConfig {
  llm: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  agent: {
    maxRounds: number;
    maxRetries: number;
    workspaceRoot: string;
    allowedPaths: string[];
  };
  guardrails: {
    mode: 'prompt' | 'auto-deny';
    allowedPatterns: string[];
  };
}

// ===== 循环类型 =====
export interface RoundRecord {
  round: number;
  llmResponse: LLMResponse;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  guardResult?: GuardResult;
  feedbackResult?: FeedbackResult;
  timestamp: string;
}

export interface AgentResult {
  taskId: string;
  status: 'success' | 'max_rounds' | 'interrupted' | 'error';
  rounds: number;
  summary: string;
  sessionLog: RoundRecord[];
}
