import { create } from 'zustand';
import type { ExtractedContent, SmartSummary, ChatMessage } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';
import { generateSummary } from '@/services/summarizer';
import { sendChatMessage, createUserMessage } from '@/services/chat';
import { OpenRouterAPIError } from '@/services/openrouter';
import { articleDB, type ArticleRecord } from '@/db';

interface ArticleState {
  // 当前文章 URL
  currentUrl: string | null;
  
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
  loadFromHistory: (record: ArticleRecord) => void;
  clearContent: () => void;
  clearSummary: () => void;
  clearChat: () => void;
  clearAll: () => void;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  // 初始状态
  currentUrl: null,
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
        const content = response.data;
        const url = content.metadata.source;
        
        // 检查是否有历史记录
        const existingRecord = await articleDB.getByUrl(url);
        
        if (existingRecord) {
          // 恢复历史记录
          set({ 
            currentUrl: url,
            content: existingRecord.extractedContent, 
            summary: existingRecord.summary || null,
            chatMessages: existingRecord.chatMessages || [],
            extracting: false, 
            extractError: null 
          });
        } else {
          // 新文章，保存到数据库
          set({ 
            currentUrl: url,
            content, 
            summary: null,
            chatMessages: [],
            extracting: false, 
            extractError: null 
          });
          
          // 异步保存到数据库
          articleDB.save(url, content).catch(console.error);
        }
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
    const { content, currentUrl } = get();
    
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
      
      // 保存摘要到数据库
      if (currentUrl) {
        articleDB.updateSummary(currentUrl, summary).catch(console.error);
      }
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
    const { content, chatMessages, currentUrl } = get();
    
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
    const newMessages = [...chatMessages, userMessage];
    set({ 
      chatMessages: newMessages,
      chatLoading: true, 
      chatError: null 
    });
    
    try {
      const assistantMessage = await sendChatMessage(
        apiKey,
        model,
        content,
        newMessages,
        message.trim(),
        language
      );
      
      const updatedMessages = [...newMessages, assistantMessage];
      set({ 
        chatMessages: updatedMessages,
        chatLoading: false, 
        chatError: null 
      });
      
      // 保存对话到数据库
      if (currentUrl) {
        articleDB.updateChatMessages(currentUrl, updatedMessages).catch(console.error);
      }
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
  
  loadFromHistory: (record: ArticleRecord) => {
    set({
      currentUrl: record.url,
      content: record.extractedContent,
      summary: record.summary || null,
      chatMessages: record.chatMessages || [],
      extractError: null,
      summaryError: null,
      chatError: null,
    });
  },
  
  clearContent: () => {
    set({ content: null, extractError: null });
  },
  
  clearSummary: () => {
    set({ summary: null, summaryError: null });
  },
  
  clearChat: () => {
    const { currentUrl } = get();
    set({ chatMessages: [], chatError: null });
    
    // 同步清空数据库中的对话
    if (currentUrl) {
      articleDB.updateChatMessages(currentUrl, []).catch(console.error);
    }
  },
  
  clearAll: () => {
    set({ 
      currentUrl: null,
      content: null, 
      extractError: null, 
      summary: null, 
      summaryError: null,
      chatMessages: [],
      chatError: null,
    });
  },
}));
