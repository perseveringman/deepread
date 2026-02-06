import { create } from 'zustand';
import type { ExtractedContent, SmartSummary } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';
import { generateSummary } from '@/services/summarizer';
import { OpenRouterAPIError } from '@/services/openrouter';

interface ArticleState {
  // 内容提取
  content: ExtractedContent | null;
  extracting: boolean;
  extractError: string | null;
  
  // 摘要生成
  summary: SmartSummary | null;
  summarizing: boolean;
  summaryError: string | null;
  
  // 操作
  extractContent: () => Promise<void>;
  generateSummary: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => Promise<void>;
  clearContent: () => void;
  clearSummary: () => void;
  clearAll: () => void;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  // 初始状态
  content: null,
  extracting: false,
  extractError: null,
  summary: null,
  summarizing: false,
  summaryError: null,
  
  extractContent: async () => {
    set({ extracting: true, extractError: null });
    
    try {
      const response = await new Promise<ExtractContentResponse>((resolve) => {
        chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' }, (response) => {
          resolve(response);
        });
      });
      
      if (response.type === 'CONTENT_EXTRACTED') {
        set({ content: response.data, extracting: false, extractError: null });
      } else {
        set({ content: null, extracting: false, extractError: response.error });
      }
    } catch (error) {
      set({ 
        content: null, 
        extracting: false, 
        extractError: error instanceof Error ? error.message : '未知错误' 
      });
    }
  },
  
  generateSummary: async (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => {
    const { content } = get();
    
    if (!content) {
      set({ summaryError: '请先提取文章内容' });
      return;
    }
    
    if (!apiKey) {
      set({ summaryError: '请先配置 API Key' });
      return;
    }
    
    set({ summarizing: true, summaryError: null });
    
    try {
      const summary = await generateSummary(apiKey, model, content, language);
      set({ summary, summarizing: false, summaryError: null });
    } catch (error) {
      let errorMessage = '生成摘要失败';
      
      if (error instanceof OpenRouterAPIError) {
        errorMessage = error.userFriendlyMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ 
        summary: null, 
        summarizing: false, 
        summaryError: errorMessage 
      });
    }
  },
  
  clearContent: () => {
    set({ content: null, extractError: null });
  },
  
  clearSummary: () => {
    set({ summary: null, summaryError: null });
  },
  
  clearAll: () => {
    set({ 
      content: null, 
      extractError: null, 
      summary: null, 
      summaryError: null 
    });
  },
}));
