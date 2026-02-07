// Content Types
export type ContentType = 
  | 'paper'
  | 'blog'
  | 'twitter'
  | 'news'
  | 'documentation'
  | 'generic'
  | 'youtube';

// YouTube Transcript Types
export interface TranscriptSegment {
  text: string;
  startTime: number;  // 秒
  duration: number;   // 秒
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  publishDate?: string;
  duration: number;  // 视频总时长（秒）
  transcript: TranscriptSegment[];
  language: string;  // 字幕语言
}

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
  youtubeMetadata?: YouTubeMetadata;
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
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  defaultReadingLevel: 'quick' | 'core' | 'detailed';
  language: 'zh' | 'en' | 'auto';
  uiLanguage: UILanguage;
  theme: ThemeMode;
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

// Literature Review Types (文献综述)
export interface LiteratureReview {
  id?: number;
  title: string;                        // 综述标题
  articleIds: number[];                 // 参与综述的文章 ID 列表
  createdAt: number;
  
  // 核心观点汇总
  coreFindings: {
    mainThemes: string[];               // 主要研究主题
    keyArguments: Array<{
      argument: string;                 // 核心论点
      supportingArticles: number[];     // 支持该论点的文章 ID
    }>;
  };
  
  // 共识与分歧
  consensus: {
    agreements: Array<{
      point: string;                    // 共识点
      articleIds: number[];             // 持此观点的文章
    }>;
    disagreements: Array<{
      topic: string;                    // 分歧主题
      positions: Array<{
        stance: string;                 // 立场描述
        articleIds: number[];           // 持此立场的文章
      }>;
    }>;
  };
  
  // 知识空白
  knowledgeGaps: Array<{
    gap: string;                        // 空白描述
    implication: string;                // 研究意义/影响
  }>;
  
  // 延伸阅读建议
  furtherReading: Array<{
    topic: string;                      // 推荐主题
    reason: string;                     // 推荐原因
    keywords: string[];                 // 搜索关键词
  }>;
  
  // 综合结论
  conclusion: string;
}
