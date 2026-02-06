import { create } from 'zustand';
import type { ExtractedContent } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';

interface ArticleState {
  content: ExtractedContent | null;
  loading: boolean;
  error: string | null;
  extractContent: () => Promise<void>;
  clearContent: () => void;
}

export const useArticleStore = create<ArticleState>((set) => ({
  content: null,
  loading: false,
  error: null,
  
  extractContent: async () => {
    set({ loading: true, error: null });
    
    try {
      const response = await new Promise<ExtractContentResponse>((resolve) => {
        chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' }, (response) => {
          resolve(response);
        });
      });
      
      if (response.type === 'CONTENT_EXTRACTED') {
        set({ content: response.data, loading: false, error: null });
      } else {
        set({ content: null, loading: false, error: response.error });
      }
    } catch (error) {
      set({ 
        content: null, 
        loading: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  },
  
  clearContent: () => {
    set({ content: null, error: null });
  },
}));
