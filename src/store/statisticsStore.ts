/**
 * 阅读统计状态管理
 */

import { create } from 'zustand';
import { 
  getReadingStatistics, 
  type ReadingStatistics, 
  type TimeRange 
} from '@/services/statistics';
import { 
  generateReadingInsights, 
  getQuickInsights,
  type ReadingInsights 
} from '@/services/readingInsights';

interface StatisticsState {
  // 时间范围
  timeRange: TimeRange;
  
  // 统计数据
  statistics: ReadingStatistics | null;
  loadingStats: boolean;
  statsError: string | null;
  
  // AI 洞察
  insights: ReadingInsights | null;
  quickInsights: string[];
  generatingInsights: boolean;
  insightsProgress: string;
  insightsError: string | null;
  cancelInsights: (() => void) | null;
  
  // 操作
  setTimeRange: (range: TimeRange) => void;
  loadStatistics: () => Promise<void>;
  generateInsights: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => void;
  cancelGenerateInsights: () => void;
  reset: () => void;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  // 初始状态
  timeRange: 'month',
  statistics: null,
  loadingStats: false,
  statsError: null,
  insights: null,
  quickInsights: [],
  generatingInsights: false,
  insightsProgress: '',
  insightsError: null,
  cancelInsights: null,
  
  // 设置时间范围并重新加载
  setTimeRange: (range: TimeRange) => {
    set({ timeRange: range });
    get().loadStatistics();
  },
  
  // 加载统计数据
  loadStatistics: async () => {
    set({ loadingStats: true, statsError: null });
    
    try {
      const { timeRange } = get();
      const statistics = await getReadingStatistics(timeRange);
      
      // 生成快速洞察
      const quickInsights = getQuickInsights({
        articleCount: statistics.basic.articleCount,
        totalWordCount: statistics.basic.totalWordCount,
        summarizedCount: statistics.basic.summarizedCount,
        avgWordsPerArticle: statistics.basic.avgWordsPerArticle,
        topTags: statistics.tags.slice(0, 5).map(t => t.tag.name),
        comparison: statistics.comparison,
      });
      
      set({ 
        statistics, 
        quickInsights,
        loadingStats: false, 
        statsError: null 
      });
    } catch (error) {
      set({ 
        loadingStats: false, 
        statsError: error instanceof Error ? error.message : '加载统计数据失败' 
      });
    }
  },
  
  // 生成 AI 洞察
  generateInsights: (apiKey: string, model: string, language: 'zh' | 'en' | 'auto') => {
    const { cancelInsights } = get();
    
    // 取消之前的请求
    if (cancelInsights) {
      cancelInsights();
    }
    
    if (!apiKey) {
      set({ insightsError: '请先配置 API Key' });
      return;
    }
    
    set({
      generatingInsights: true,
      insightsProgress: '',
      insightsError: null,
      insights: null,
    });
    
    const cancel = generateReadingInsights(
      apiKey,
      model,
      language,
      // onProgress
      (text) => {
        set({ insightsProgress: text });
      },
      // onComplete
      (insights) => {
        set({
          insights,
          generatingInsights: false,
          insightsProgress: '',
          cancelInsights: null,
        });
      },
      // onError
      (error) => {
        set({
          generatingInsights: false,
          insightsError: error,
          cancelInsights: null,
        });
      }
    );
    
    set({ cancelInsights: cancel });
  },
  
  // 取消生成
  cancelGenerateInsights: () => {
    const { cancelInsights } = get();
    if (cancelInsights) {
      cancelInsights();
    }
    set({
      generatingInsights: false,
      insightsProgress: '',
      cancelInsights: null,
    });
  },
  
  // 重置状态
  reset: () => {
    const { cancelInsights } = get();
    if (cancelInsights) {
      cancelInsights();
    }
    
    set({
      timeRange: 'month',
      statistics: null,
      loadingStats: false,
      statsError: null,
      insights: null,
      quickInsights: [],
      generatingInsights: false,
      insightsProgress: '',
      insightsError: null,
      cancelInsights: null,
    });
  },
}));
