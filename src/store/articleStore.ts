import { create } from 'zustand';
import type { ExtractedContent, SmartSummary, ChatMessage } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';
import { generateSummary } from '@/services/summarizer';
import { sendChatMessage, createUserMessage } from '@/services/chat';
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
  
  // 对话
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  chatError: string | null;
  
  // 操作
  extractContent: () => Promise<void>;
  generateSummary: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => Promise<void>;
  sendMessage: (apiKey: string, model: string, message: string, language: 'zh' | 'en' | 'auto') => Promise<void>;
  clearContent: () => void;
  clearSummary: () => void;
  clearChat: () => void;
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
  chatMessages: [],
  chatLoading: false,
  chatError: null,
  
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
  
  sendMessage: async (apiKey: string, model: string, message: string, language: 'zh' | 'en' | 'auto') => {
    const { content, chatMessages } = get();
    
    if (!content) {
      set({ chatError: '请先提取文章内容' });
      return;
    }
    
    if (!apiKey) {
      set({ chatError: '请先配置 API Key' });
      return;
    }
    
    if (!message.trim()) {
      return;
    }
    
    // 添加用户消息
    const userMessage = createUserMessage(message.trim());
    set({ 
      chatMessages: [...chatMessages, userMessage],
      chatLoading: true, 
      chatError: null 
    });
    
    try {
      const assistantMessage = await sendChatMessage(
        apiKey,
        model,
        content,
        [...chatMessages, userMessage],
        message.trim(),
        language
      );
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        chatLoading: false, 
        chatError: null 
      }));
    } catch (error) {
      let errorMessage = '发送消息失败';
      
      if (error instanceof OpenRouterAPIError) {
        errorMessage = error.userFriendlyMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ 
        chatLoading: false, 
        chatError: errorMessage 
      });
    }
  },
  
  clearContent: () => {
    set({ content: null, extractError: null });
  },
  
  clearSummary: () => {
    set({ summary: null, summaryError: null });
  },
  
  clearChat: () => {
    set({ chatMessages: [], chatError: null });
  },
  
  clearAll: () => {
    set({ 
      content: null, 
      extractError: null, 
      summary: null, 
      summaryError: null,
      chatMessages: [],
      chatError: null,
    });
  },
}));
