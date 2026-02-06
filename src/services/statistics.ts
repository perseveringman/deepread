/**
 * 阅读统计服务
 * 计算阅读量、字数、时长、标签分布等统计数据
 */

import { db, articleDB, articleTagDB, type ArticleRecord, type Tag } from '@/db';

/**
 * 时间范围类型
 */
export type TimeRange = 'week' | 'month' | 'all';

/**
 * 基础统计数据
 */
export interface BasicStats {
  articleCount: number;           // 阅读篇数
  totalWordCount: number;         // 总字数
  totalReadTime: number;          // 总阅读时长（分钟）
  summarizedCount: number;        // 已生成摘要数
  avgWordsPerArticle: number;     // 平均每篇字数
}

/**
 * 按日统计
 */
export interface DailyStats {
  date: string;                   // YYYY-MM-DD
  count: number;                  // 当日阅读数
  wordCount: number;              // 当日字数
}

/**
 * 标签统计
 */
export interface TagStats {
  tag: Tag;
  count: number;
  percentage: number;
}

/**
 * 内容类型统计
 */
export interface ContentTypeStats {
  type: string;
  count: number;
  percentage: number;
}

/**
 * 热力图数据（365天）
 */
export interface HeatmapData {
  date: string;                   // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;       // 强度等级 (0=无, 4=最高)
}

/**
 * 完整统计报告
 */
export interface ReadingStatistics {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  
  basic: BasicStats;
  daily: DailyStats[];
  tags: TagStats[];
  contentTypes: ContentTypeStats[];
  heatmap: HeatmapData[];
  
  // 对比数据（与上一周期相比）
  comparison?: {
    articleCountChange: number;   // 百分比变化
    wordCountChange: number;
  };
}

/**
 * 获取时间范围的起止日期
 */
function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  switch (range) {
    case 'week':
      start.setDate(start.getDate() - 6);
      break;
    case 'month':
      start.setDate(start.getDate() - 29);
      break;
    case 'all':
      start.setFullYear(2000); // 很早的日期
      break;
  }
  
  return { start, end };
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 计算基础统计
 */
async function calculateBasicStats(articles: ArticleRecord[]): Promise<BasicStats> {
  const articleCount = articles.length;
  const totalWordCount = articles.reduce(
    (sum, a) => sum + (a.extractedContent.metadata.wordCount || 0), 
    0
  );
  const totalReadTime = articles.reduce(
    (sum, a) => sum + (a.extractedContent.metadata.estimatedReadTime || 0), 
    0
  );
  const summarizedCount = articles.filter(a => a.summary).length;
  const avgWordsPerArticle = articleCount > 0 ? Math.round(totalWordCount / articleCount) : 0;
  
  return {
    articleCount,
    totalWordCount,
    totalReadTime,
    summarizedCount,
    avgWordsPerArticle,
  };
}

/**
 * 计算每日统计
 */
function calculateDailyStats(articles: ArticleRecord[], start: Date, end: Date): DailyStats[] {
  // 初始化每日数据
  const dailyMap = new Map<string, DailyStats>();
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatDate(current);
    dailyMap.set(dateStr, { date: dateStr, count: 0, wordCount: 0 });
    current.setDate(current.getDate() + 1);
  }
  
  // 统计每篇文章
  for (const article of articles) {
    const dateStr = formatDate(new Date(article.createdAt));
    const existing = dailyMap.get(dateStr);
    if (existing) {
      existing.count++;
      existing.wordCount += article.extractedContent.metadata.wordCount || 0;
    }
  }
  
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 计算标签统计
 */
async function calculateTagStats(articles: ArticleRecord[]): Promise<TagStats[]> {
  const tagCountMap = new Map<number, { tag: Tag; count: number }>();
  
  for (const article of articles) {
    if (!article.id) continue;
    
    const articleTags = await articleTagDB.getArticleTags(article.id);
    for (const relation of articleTags) {
      const existing = tagCountMap.get(relation.tagId);
      if (existing) {
        existing.count++;
      } else {
        tagCountMap.set(relation.tagId, { tag: relation.tag, count: 1 });
      }
    }
  }
  
  const total = Array.from(tagCountMap.values()).reduce((sum, t) => sum + t.count, 0);
  
  return Array.from(tagCountMap.values())
    .map(({ tag, count }) => ({
      tag,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 只取前10个
}

/**
 * 计算内容类型统计
 */
function calculateContentTypeStats(articles: ArticleRecord[]): ContentTypeStats[] {
  const typeMap = new Map<string, number>();
  
  for (const article of articles) {
    const type = article.extractedContent.type || 'generic';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  }
  
  const total = articles.length;
  
  return Array.from(typeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 计算热力图数据（过去365天）
 */
async function calculateHeatmap(): Promise<HeatmapData[]> {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  
  // 获取所有文章
  const allArticles = await db.articles
    .where('createdAt')
    .between(start.getTime(), end.getTime())
    .toArray();
  
  // 按日期统计
  const dailyCountMap = new Map<string, number>();
  for (const article of allArticles) {
    const dateStr = formatDate(new Date(article.createdAt));
    dailyCountMap.set(dateStr, (dailyCountMap.get(dateStr) || 0) + 1);
  }
  
  // 找出最大值用于计算等级
  const maxCount = Math.max(...Array.from(dailyCountMap.values()), 1);
  
  // 生成365天数据
  const heatmap: HeatmapData[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    const dateStr = formatDate(current);
    const count = dailyCountMap.get(dateStr) || 0;
    
    // 计算强度等级 (0-4)
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      const ratio = count / maxCount;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else level = 1;
    }
    
    heatmap.push({ date: dateStr, count, level });
    current.setDate(current.getDate() + 1);
  }
  
  return heatmap;
}

/**
 * 计算与上一周期的对比
 */
async function calculateComparison(
  range: TimeRange, 
  currentStats: BasicStats
): Promise<{ articleCountChange: number; wordCountChange: number } | undefined> {
  if (range === 'all') return undefined;
  
  const { start: currentStart, end: currentEnd } = getDateRange(range);
  const periodLength = currentEnd.getTime() - currentStart.getTime();
  
  // 上一周期
  const prevEnd = new Date(currentStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodLength);
  
  const prevArticles = await db.articles
    .where('createdAt')
    .between(prevStart.getTime(), prevEnd.getTime())
    .toArray();
  
  const prevStats = await calculateBasicStats(prevArticles);
  
  // 计算百分比变化
  const calcChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };
  
  return {
    articleCountChange: calcChange(currentStats.articleCount, prevStats.articleCount),
    wordCountChange: calcChange(currentStats.totalWordCount, prevStats.totalWordCount),
  };
}

/**
 * 获取完整阅读统计
 */
export async function getReadingStatistics(range: TimeRange): Promise<ReadingStatistics> {
  const { start, end } = getDateRange(range);
  
  // 获取时间范围内的文章
  const articles = range === 'all'
    ? await articleDB.getAll(1000)
    : await db.articles
        .where('createdAt')
        .between(start.getTime(), end.getTime())
        .toArray();
  
  // 并行计算各项统计
  const [basic, tags, heatmap] = await Promise.all([
    calculateBasicStats(articles),
    calculateTagStats(articles),
    calculateHeatmap(),
  ]);
  
  const daily = calculateDailyStats(articles, start, end);
  const contentTypes = calculateContentTypeStats(articles);
  const comparison = await calculateComparison(range, basic);
  
  return {
    timeRange: range,
    startDate: start,
    endDate: end,
    basic,
    daily,
    tags,
    contentTypes,
    heatmap,
    comparison,
  };
}

/**
 * 获取用于 AI 分析的阅读数据摘要
 */
export async function getReadingDataForAI(): Promise<string> {
  const stats = await getReadingStatistics('month');
  const allTimeStats = await getReadingStatistics('all');
  
  // 构建摘要文本
  const topTags = stats.tags.slice(0, 5).map(t => t.tag.name).join(', ');
  const topTypes = stats.contentTypes.slice(0, 3).map(t => `${t.type}(${t.count}篇)`).join(', ');
  
  // 计算阅读趋势
  const recentDays = stats.daily.slice(-7);
  const avgRecentDaily = recentDays.reduce((sum, d) => sum + d.count, 0) / 7;
  
  return `
阅读统计摘要（近30天）：
- 阅读篇数：${stats.basic.articleCount} 篇
- 总字数：${stats.basic.totalWordCount.toLocaleString()} 字
- 总阅读时长：约 ${stats.basic.totalReadTime} 分钟
- 已生成摘要：${stats.basic.summarizedCount} 篇
- 平均每篇字数：${stats.basic.avgWordsPerArticle} 字

全部历史：
- 总阅读篇数：${allTimeStats.basic.articleCount} 篇
- 总字数：${allTimeStats.basic.totalWordCount.toLocaleString()} 字

阅读偏好：
- 常读标签：${topTags || '暂无标签'}
- 内容类型分布：${topTypes || '暂无数据'}

阅读习惯：
- 近7天日均阅读：${avgRecentDaily.toFixed(1)} 篇
${stats.comparison ? `- 与上月对比：阅读量 ${stats.comparison.articleCountChange > 0 ? '+' : ''}${stats.comparison.articleCountChange}%` : ''}
`.trim();
}
