/**
 * OpenRouter API 服务
 * https://openrouter.ai/docs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// 常用模型列表
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且经济' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', description: '最强大的 GPT 模型' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: '平衡性能和速度' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: '快速响应' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: '长上下文支持' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: '开源大模型' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

/**
 * 调用 OpenRouter API
 */
export async function callOpenRouter(
  apiKey: string,
  request: OpenRouterRequest
): Promise<OpenRouterResponse> {
  let response: Response;
  
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'DeepRead',
      },
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });
  } catch (error) {
    // 网络错误
    console.error('OpenRouter fetch error:', error);
    throw new OpenRouterAPIError(
      '网络连接失败，请检查网络或 API 地址',
      'network_error',
      0
    );
  }

  if (!response.ok) {
    let errorData: OpenRouterError;
    try {
      errorData = await response.json() as OpenRouterError;
    } catch {
      throw new OpenRouterAPIError(
        `HTTP ${response.status}: ${response.statusText}`,
        'unknown',
        response.status
      );
    }
    throw new OpenRouterAPIError(
      errorData.error?.message || `HTTP ${response.status}`,
      errorData.error?.code || 'unknown',
      response.status
    );
  }

  return response.json();
}

/**
 * 流式调用 OpenRouter API
 */
export async function* streamOpenRouter(
  apiKey: string,
  request: OpenRouterRequest
): AsyncGenerator<string, void, unknown> {
  let response: Response;
  
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'DeepRead',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });
  } catch (error) {
    console.error('OpenRouter stream fetch error:', error);
    throw new OpenRouterAPIError(
      '网络连接失败，请检查网络或 API 地址',
      'network_error',
      0
    );
  }

  if (!response.ok) {
    let errorData: OpenRouterError;
    try {
      errorData = await response.json() as OpenRouterError;
    } catch {
      throw new OpenRouterAPIError(
        `HTTP ${response.status}: ${response.statusText}`,
        'unknown',
        response.status
      );
    }
    throw new OpenRouterAPIError(
      errorData.error?.message || `HTTP ${response.status}`,
      errorData.error?.code || 'unknown',
      response.status
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * OpenRouter API 错误
 */
export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'OpenRouterAPIError';
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'invalid_api_key';
  }

  get isQuotaError(): boolean {
    return this.status === 429 || this.code === 'insufficient_quota';
  }

  get isRateLimitError(): boolean {
    return this.status === 429 && this.code === 'rate_limit_exceeded';
  }

  get userFriendlyMessage(): string {
    if (this.isAuthError) {
      return 'API Key 无效，请检查设置';
    }
    if (this.isQuotaError) {
      return '额度不足，请充值或更换 API Key';
    }
    if (this.isRateLimitError) {
      return '请求过于频繁，请稍后再试';
    }
    return this.message;
  }
}
