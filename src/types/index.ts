// Content Types
export type ContentType = 
  | 'paper'
  | 'blog'
  | 'twitter'
  | 'news'
  | 'documentation'
  | 'generic';

export interface ExtractedContent {
  type: ContentType;
  confidence: number;
  title: string;
  author?: string;
  publishDate?: string;
  content: string;
  metadata: {
    wordCount: number;
    estimatedReadTime: number;
    language: string;
    source: string;
  };
}

// Summary Types
export interface SmartSummary {
  oneLiner: string;
  coreInsights: {
    mainPoint: string;
    whyItMatters: string;
    howToApply: string;
  };
  evidenceStrength: {
    level: 'strong' | 'moderate' | 'weak' | 'opinion';
    reasoning: string;
  };
  detailedSummary: {
    sections: Array<{
      heading: string;
      summary: string;
      keyQuotes?: string[];
    }>;
  };
  thoughtTriggers?: {
    applicationPrompt: string;
    conflictPrompt: string;
    relatedQuestions: string[];
  };
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: Array<{
    text: string;
    position: number;
  }>;
}

export interface ChatSession {
  articleId: string;
  messages: ChatMessage[];
}

// AI Provider Types
export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kTokens?: number;
}

export interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIProvider {
  name: string;
  models: ModelInfo[];
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat?(request: ChatRequest): AsyncGenerator<string>;
}

// Settings Types
export type UILanguage = 'zh' | 'en' | 'system';

export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  defaultReadingLevel: 'quick' | 'core' | 'detailed';
  language: 'zh' | 'en' | 'auto';
  uiLanguage: UILanguage;
}

// Storage Types
export interface StoredArticle {
  id: string;
  url: string;
  title: string;
  extractedContent: ExtractedContent;
  summary?: SmartSummary;
  chatHistory: ChatMessage[];
  createdAt: number;
  lastAccessedAt: number;
}
