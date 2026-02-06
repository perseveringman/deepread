/**
 * 历史记录 Store
 * 管理阅读历史的状态和操作
 */

import { create } from 'zustand';
import { articleDB, type ArticleRecord } from '@/db';

interface HistoryState {
  // 状态
  records: ArticleRecord[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  totalCount: number;
  
  // 操作
  loadHistory: () => Promise<void>;
  search: (query: string) => Promise<void>;
  deleteRecord: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  searchQuery: '',
  totalCount: 0,

  loadHistory: async () => {
    set({ loading: true, error: null });
    
    try {
      const records = await articleDB.getAll(100);
      const count = await articleDB.count();
      set({ records, totalCount: count, loading: false, searchQuery: '' });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载历史失败',
        loading: false 
      });
    }
  },

  search: async (query: string) => {
    set({ loading: true, error: null, searchQuery: query });
    
    try {
      if (!query.trim()) {
        const records = await articleDB.getAll(100);
        set({ records, loading: false });
      } else {
        const records = await articleDB.search(query);
        set({ records, loading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '搜索失败',
        loading: false 
      });
    }
  },

  deleteRecord: async (id: number) => {
    try {
      await articleDB.delete(id);
      const { records } = get();
      
      // 从当前列表中移除
      set({ records: records.filter(r => r.id !== id) });
      
      // 刷新计数
      const count = await articleDB.count();
      set({ totalCount: count });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除失败' 
      });
    }
  },

  clearAll: async () => {
    try {
      await articleDB.clearAll();
      set({ records: [], totalCount: 0 });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '清空失败' 
      });
    }
  },

  refreshCount: async () => {
    const count = await articleDB.count();
    set({ totalCount: count });
  },
}));
