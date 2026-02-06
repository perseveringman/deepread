/**
 * 文献综述状态管理
 */

import { create } from 'zustand';
import type { LiteratureReview } from '@/types';
import type { ArticleRecord } from '@/db';
import { articleDB, literatureReviewDB } from '@/db';
import { generateLiteratureReview, estimateTokenUsage } from '@/services/literatureReview';

interface LiteratureReviewState {
  // 模式
  mode: 'select' | 'generating' | 'view';
  
  // 文章选择
  availableArticles: ArticleRecord[];
  selectedArticleIds: Set<number>;
  loadingArticles: boolean;
  
  // 生成状态
  generating: boolean;
  generatingText: string;
  generateError: string | null;
  cancelGenerate: (() => void) | null;
  
  // 当前综述
  currentReview: LiteratureReview | null;
  
  // 历史综述
  reviews: LiteratureReview[];
  loadingReviews: boolean;
  
  // 操作
  loadArticles: () => Promise<void>;
  toggleArticle: (articleId: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  generateReview: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => void;
  cancelReview: () => void;
  
  loadReviews: () => Promise<void>;
  viewReview: (review: LiteratureReview) => void;
  deleteReview: (id: number) => Promise<void>;
  
  reset: () => void;
  setMode: (mode: 'select' | 'generating' | 'view') => void;
  
  // 计算属性
  getSelectedArticles: () => ArticleRecord[];
  getEstimatedTokens: () => number;
}

export const useLiteratureReviewStore = create<LiteratureReviewState>((set, get) => ({
  // 初始状态
  mode: 'select',
  availableArticles: [],
  selectedArticleIds: new Set(),
  loadingArticles: false,
  generating: false,
  generatingText: '',
  generateError: null,
  cancelGenerate: null,
  currentReview: null,
  reviews: [],
  loadingReviews: false,
  
  // 加载可用文章（有摘要的文章更适合综述）
  loadArticles: async () => {
    set({ loadingArticles: true });
    
    try {
      const articles = await articleDB.getAll(100);
      // 优先显示有摘要的文章
      const sorted = articles.sort((a, b) => {
        const aHasSummary = a.summary ? 1 : 0;
        const bHasSummary = b.summary ? 1 : 0;
        if (aHasSummary !== bHasSummary) {
          return bHasSummary - aHasSummary;
        }
        return b.lastAccessedAt - a.lastAccessedAt;
      });
      
      set({ availableArticles: sorted, loadingArticles: false });
    } catch (error) {
      console.error('Failed to load articles:', error);
      set({ availableArticles: [], loadingArticles: false });
    }
  },
  
  // 切换选中状态
  toggleArticle: (articleId: number) => {
    set(state => {
      const newSet = new Set(state.selectedArticleIds);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        // 最多选择 20 篇
        if (newSet.size < 20) {
          newSet.add(articleId);
        }
      }
      return { selectedArticleIds: newSet };
    });
  },
  
  // 全选（最多20篇）
  selectAll: () => {
    const { availableArticles } = get();
    const ids = availableArticles.slice(0, 20).map(a => a.id!);
    set({ selectedArticleIds: new Set(ids) });
  },
  
  // 清除选择
  clearSelection: () => {
    set({ selectedArticleIds: new Set() });
  },
  
  // 生成综述
  generateReview: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => {
    const { cancelGenerate } = get();
    
    // 取消之前的请求
    if (cancelGenerate) {
      cancelGenerate();
    }
    
    const selectedArticles = get().getSelectedArticles();
    
    if (selectedArticles.length < 2) {
      set({ generateError: '请至少选择 2 篇文章' });
      return;
    }
    
    if (!apiKey) {
      set({ generateError: '请先配置 API Key' });
      return;
    }
    
    set({ 
      mode: 'generating',
      generating: true, 
      generatingText: '',
      generateError: null,
      currentReview: null,
    });
    
    const cancel = generateLiteratureReview(
      apiKey,
      model,
      selectedArticles,
      language,
      // onProgress
      (text) => {
        set({ generatingText: text });
      },
      // onComplete
      async (reviewData) => {
        try {
          // 保存到数据库
          const id = await literatureReviewDB.save(reviewData);
          const savedReview = await literatureReviewDB.getById(id);
          
          set({ 
            mode: 'view',
            generating: false, 
            generatingText: '',
            currentReview: savedReview || null,
            cancelGenerate: null,
          });
          
          // 刷新列表
          get().loadReviews();
        } catch (error) {
          set({
            generating: false,
            generateError: error instanceof Error ? error.message : '保存综述失败',
            cancelGenerate: null,
          });
        }
      },
      // onError
      (error) => {
        set({ 
          generating: false, 
          generateError: error,
          cancelGenerate: null,
        });
      }
    );
    
    set({ cancelGenerate: cancel });
  },
  
  // 取消生成
  cancelReview: () => {
    const { cancelGenerate } = get();
    if (cancelGenerate) {
      cancelGenerate();
    }
    set({
      mode: 'select',
      generating: false,
      generatingText: '',
      cancelGenerate: null,
    });
  },
  
  // 加载历史综述
  loadReviews: async () => {
    set({ loadingReviews: true });
    
    try {
      const reviews = await literatureReviewDB.getAll();
      set({ reviews, loadingReviews: false });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      set({ reviews: [], loadingReviews: false });
    }
  },
  
  // 查看综述
  viewReview: (review: LiteratureReview) => {
    set({ 
      mode: 'view',
      currentReview: review,
    });
  },
  
  // 删除综述
  deleteReview: async (id: number) => {
    try {
      await literatureReviewDB.delete(id);
      
      // 如果正在查看被删除的综述，返回选择模式
      const { currentReview } = get();
      if (currentReview?.id === id) {
        set({ mode: 'select', currentReview: null });
      }
      
      // 刷新列表
      await get().loadReviews();
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  },
  
  // 重置状态
  reset: () => {
    const { cancelGenerate } = get();
    if (cancelGenerate) {
      cancelGenerate();
    }
    
    set({
      mode: 'select',
      selectedArticleIds: new Set(),
      generating: false,
      generatingText: '',
      generateError: null,
      cancelGenerate: null,
      currentReview: null,
    });
  },
  
  // 设置模式
  setMode: (mode) => {
    set({ mode });
  },
  
  // 获取选中的文章
  getSelectedArticles: () => {
    const { availableArticles, selectedArticleIds } = get();
    return availableArticles.filter(a => selectedArticleIds.has(a.id!));
  },
  
  // 估算 token 使用量
  getEstimatedTokens: () => {
    const selectedArticles = get().getSelectedArticles();
    return estimateTokenUsage(selectedArticles);
  },
}));
