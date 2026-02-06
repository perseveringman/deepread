import { create } from 'zustand';
import type { ExtractedContent, SmartSummary, ChatMessage } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';
import { sendChatMessageStream, createUserMessage, createAssistantMessage } from '@/services/chat';
import { articleDB, type ArticleRecord } from '@/db';
import { 
  streamFullSummary, 
  type StreamingSummaryState,
  initialStreamingState,
  SUMMARY_BLOCKS,
} from '@/services/streamingSummarizer';
import { generateAndSaveArticleTags } from '@/services/tagGenerator';

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
  
  // 流式摘要状态
  streamingSummary: StreamingSummaryState;
  cancelSummaryStream: (() => void) | null;
  
  // 对话
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  chatError: string | null;
  streamingContent: string | null;  // 流式响应中的内容
  cancelStream: (() => void) | null;  // 取消流式响应的函数
  
  // 操作
  extractContent: () => Promise<void>;
  generateSummary: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => void;
  sendMessage: (apiKey: string, model: string, message: string, language: 'zh' | 'en' | 'auto') => void;
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
  streamingSummary: initialStreamingState,
  cancelSummaryStream: null,
  chatMessages: [],
  chatLoading: false,
  chatError: null,
  streamingContent: null,
  cancelStream: null,
  
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
  
  generateSummary: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => {
    const { content, currentUrl, cancelSummaryStream } = get();
    
    // 取消之前的流式请求
    if (cancelSummaryStream) {
      cancelSummaryStream();
    }
    
    if (!content) {
      set({ summaryError: '请先提取文章内容' });
      return;
    }
    
    if (!apiKey) {
      set({ summaryError: '请先配置 API Key' });
      return;
    }
    
    // 重置状态，开始流式生成
    set({ 
      summarizing: true, 
      summaryError: null,
      summary: null,
      streamingSummary: {
        ...initialStreamingState,
        currentBlock: SUMMARY_BLOCKS[0],
      },
    });
    
    // 开始流式生成
    const cancel = streamFullSummary(
      apiKey,
      model,
      content,
      language,
      // onBlockStart
      (block, _index) => {
        set(state => ({
          streamingSummary: {
            ...state.streamingSummary,
            currentBlock: block,
            streamingText: '',
          },
        }));
      },
      // onBlockChunk
      (_block, _chunk, fullText) => {
        set(state => ({
          streamingSummary: {
            ...state.streamingSummary,
            streamingText: fullText,
          },
        }));
      },
      // onBlockDone
      (block, blockData) => {
        set(state => ({
          streamingSummary: {
            ...state.streamingSummary,
            completedBlocks: [...state.streamingSummary.completedBlocks, block],
            blockContent: { ...state.streamingSummary.blockContent, ...blockData },
            streamingText: '',
          },
        }));
      },
      // onAllDone
      (summary) => {
        const { content: currentContent } = get();
        
        set({ 
          summary, 
          summarizing: false, 
          summaryError: null,
          streamingSummary: initialStreamingState,
          cancelSummaryStream: null,
        });
        
        // 保存摘要到数据库
        if (currentUrl) {
          articleDB.updateSummary(currentUrl, summary).catch(console.error);
          
          // 后台生成标签（静默，不阻塞）
          articleDB.getByUrl(currentUrl).then(article => {
            if (article && currentContent && !article.tagsGenerated) {
              generateAndSaveArticleTags(
                apiKey,
                model,
                article.id!,
                currentContent,
                summary,
                language
              ).catch(err => console.error('Tag generation failed:', err));
            }
          }).catch(console.error);
        }
      },
      // onError
      (error) => {
        set({ 
          summarizing: false, 
          summaryError: error,
          streamingSummary: {
            ...get().streamingSummary,
            error,
          },
          cancelSummaryStream: null,
        });
      }
    );
    
    set({ cancelSummaryStream: cancel });
  },
  
  sendMessage: (apiKey: string, model: string, message: string, language: 'zh' | 'en' | 'auto') => {
    const { content, chatMessages, cancelStream } = get();
    
    // 取消之前的流式请求
    if (cancelStream) {
      cancelStream();
    }
    
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
    
    // 添加一个空的助手消息占位
    const placeholderMessage = createAssistantMessage('');
    const messagesWithPlaceholder = [...newMessages, placeholderMessage];
    
    set({ 
      chatMessages: messagesWithPlaceholder,
      chatLoading: true, 
      chatError: null,
      streamingContent: '',
    });
    
    // 发起流式请求
    const cancel = sendChatMessageStream(
      apiKey,
      model,
      content,
      newMessages,
      message.trim(),
      language,
      // onChunk
      (_chunk, fullContent) => {
        set({ streamingContent: fullContent });
        // 更新占位消息的内容
        const { chatMessages } = get();
        const updatedMessages = [...chatMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: fullContent,
        };
        set({ chatMessages: updatedMessages });
      },
      // onDone
      (finalMessage) => {
        const { chatMessages, currentUrl } = get();
        const updatedMessages = [...chatMessages];
        updatedMessages[updatedMessages.length - 1] = finalMessage;
        
        set({ 
          chatMessages: updatedMessages,
          chatLoading: false, 
          chatError: null,
          streamingContent: null,
          cancelStream: null,
        });
        
        // 保存对话到数据库
        if (currentUrl) {
          articleDB.updateChatMessages(currentUrl, updatedMessages).catch(console.error);
        }
      },
      // onError
      (error) => {
        // 移除占位消息
        const { chatMessages } = get();
        const messagesWithoutPlaceholder = chatMessages.slice(0, -1);
        
        set({ 
          chatMessages: messagesWithoutPlaceholder,
          chatLoading: false, 
          chatError: error,
          streamingContent: null,
          cancelStream: null,
        });
      }
    );
    
    set({ cancelStream: cancel });
  },
  
  loadFromHistory: (record: ArticleRecord) => {
    const { cancelStream, cancelSummaryStream } = get();
    if (cancelStream) {
      cancelStream();
    }
    if (cancelSummaryStream) {
      cancelSummaryStream();
    }
    
    set({
      currentUrl: record.url,
      content: record.extractedContent,
      summary: record.summary || null,
      chatMessages: record.chatMessages || [],
      extractError: null,
      summaryError: null,
      chatError: null,
      streamingContent: null,
      cancelStream: null,
      streamingSummary: initialStreamingState,
      cancelSummaryStream: null,
    });
  },
  
  clearContent: () => {
    set({ content: null, extractError: null });
  },
  
  clearSummary: () => {
    set({ summary: null, summaryError: null });
  },
  
  clearChat: () => {
    const { currentUrl, cancelStream } = get();
    
    if (cancelStream) {
      cancelStream();
    }
    
    set({ 
      chatMessages: [], 
      chatError: null,
      streamingContent: null,
      cancelStream: null,
    });
    
    // 同步清空数据库中的对话
    if (currentUrl) {
      articleDB.updateChatMessages(currentUrl, []).catch(console.error);
    }
  },
  
  clearAll: () => {
    const { cancelStream, cancelSummaryStream } = get();
    if (cancelStream) {
      cancelStream();
    }
    if (cancelSummaryStream) {
      cancelSummaryStream();
    }
    
    set({ 
      currentUrl: null,
      content: null, 
      extractError: null, 
      summary: null, 
      summaryError: null,
      chatMessages: [],
      chatError: null,
      streamingContent: null,
      cancelStream: null,
      streamingSummary: initialStreamingState,
      cancelSummaryStream: null,
    });
  },
}));
