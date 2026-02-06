/**
 * OpenRouter API 服务
 * https://openrouter.ai/docs
 * 
 * 通过 Background Service Worker 代理请求以避免 CORS 问题
 */

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
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', description: '高性价比首选' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且经济' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', description: '最强大的 GPT 模型' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: '平衡性能和速度' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: '快速响应' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: '长上下文支持' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

interface BackgroundResponse {
  success: boolean;
  data?: OpenRouterResponse;
  error?: string;
  code?: string;
  status?: number;
}

/**
 * 通过 Background Service Worker 调用 OpenRouter API
 */
export async function callOpenRouter(
  apiKey: string,
  request: OpenRouterRequest
): Promise<OpenRouterResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'OPENROUTER_REQUEST',
        apiKey,
        model: request.model,
        messages: request.messages,
        options: {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        },
      },
      (response: BackgroundResponse) => {
        if (chrome.runtime.lastError) {
          reject(new OpenRouterAPIError(
            chrome.runtime.lastError.message || '与后台通信失败',
            'runtime_error',
            0
          ));
          return;
        }
        
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(new OpenRouterAPIError(
            response.error || '请求失败',
            response.code || 'unknown',
            response.status || 0
          ));
        }
      }
    );
  });
}

/**
 * 流式调用 OpenRouter API
 */
export function streamOpenRouter(
  apiKey: string,
  request: OpenRouterRequest,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): () => void {
  const port = chrome.runtime.connect({ name: 'openrouter-stream' });
  
  port.onMessage.addListener((message) => {
    if (message.type === 'chunk') {
      onChunk(message.content);
    } else if (message.type === 'done') {
      onDone();
      port.disconnect();
    } else if (message.type === 'error') {
      onError(message.error);
      port.disconnect();
    }
  });
  
  port.postMessage({
    type: 'start',
    apiKey,
    model: request.model,
    messages: request.messages,
    options: {
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    },
  });
  
  // 返回取消函数
  return () => {
    port.disconnect();
  };
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
