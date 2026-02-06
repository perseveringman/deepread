/**
 * DeepRead 数据库定义
 * 使用 Dexie.js 封装 IndexedDB
 */

import Dexie, { type Table } from 'dexie';
import type { ExtractedContent, SmartSummary, ChatMessage } from '@/types';

/**
 * 存储的文章记录
 */
export interface ArticleRecord {
  id?: number;                      // 自增主键
  url: string;                      // 文章 URL（唯一索引）
  urlHash: string;                  // URL 哈希（用于快速查找）
  title: string;                    // 文章标题
  favicon?: string;                 // 网站图标
  extractedContent: ExtractedContent;  // 提取的内容
  summary?: SmartSummary;           // AI 摘要
  chatMessages: ChatMessage[];      // 对话历史
  createdAt: number;                // 首次保存时间
  updatedAt: number;                // 最后更新时间
  lastAccessedAt: number;           // 最后访问时间
}

/**
 * 生成 URL 哈希
 */
export function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * DeepRead 数据库类
 */
class DeepReadDatabase extends Dexie {
  articles!: Table<ArticleRecord, number>;

  constructor() {
    super('DeepReadDB');
    
    // 数据库版本 1
    this.version(1).stores({
      articles: '++id, url, urlHash, title, createdAt, updatedAt, lastAccessedAt',
    });
  }
}

// 导出数据库单例
export const db = new DeepReadDatabase();

/**
 * 数据库操作封装
 */
export const articleDB = {
  /**
   * 保存或更新文章
   */
  async save(
    url: string,
    content: ExtractedContent,
    summary?: SmartSummary,
    chatMessages: ChatMessage[] = []
  ): Promise<number> {
    const urlHash = hashUrl(url);
    const now = Date.now();
    
    // 查找是否已存在
    const existing = await db.articles.where('urlHash').equals(urlHash).first();
    
    if (existing) {
      // 更新现有记录
      await db.articles.update(existing.id!, {
        extractedContent: content,
        summary: summary ?? existing.summary,
        chatMessages: chatMessages.length > 0 ? chatMessages : existing.chatMessages,
        updatedAt: now,
        lastAccessedAt: now,
      });
      return existing.id!;
    } else {
      // 创建新记录
      return await db.articles.add({
        url,
        urlHash,
        title: content.title,
        extractedContent: content,
        summary,
        chatMessages,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
      });
    }
  },

  /**
   * 更新摘要
   */
  async updateSummary(url: string, summary: SmartSummary): Promise<void> {
    const urlHash = hashUrl(url);
    const existing = await db.articles.where('urlHash').equals(urlHash).first();
    
    if (existing) {
      await db.articles.update(existing.id!, {
        summary,
        updatedAt: Date.now(),
      });
    }
  },

  /**
   * 更新对话历史
   */
  async updateChatMessages(url: string, chatMessages: ChatMessage[]): Promise<void> {
    const urlHash = hashUrl(url);
    const existing = await db.articles.where('urlHash').equals(urlHash).first();
    
    if (existing) {
      await db.articles.update(existing.id!, {
        chatMessages,
        updatedAt: Date.now(),
      });
    }
  },

  /**
   * 根据 URL 获取文章
   */
  async getByUrl(url: string): Promise<ArticleRecord | undefined> {
    const urlHash = hashUrl(url);
    const article = await db.articles.where('urlHash').equals(urlHash).first();
    
    if (article) {
      // 更新最后访问时间
      await db.articles.update(article.id!, {
        lastAccessedAt: Date.now(),
      });
    }
    
    return article;
  },

  /**
   * 获取所有历史记录（按最后访问时间倒序）
   */
  async getAll(limit = 100): Promise<ArticleRecord[]> {
    return await db.articles
      .orderBy('lastAccessedAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * 搜索文章（标题匹配）
   */
  async search(query: string, limit = 50): Promise<ArticleRecord[]> {
    const lowerQuery = query.toLowerCase();
    
    return await db.articles
      .filter(article => 
        article.title.toLowerCase().includes(lowerQuery) ||
        article.url.toLowerCase().includes(lowerQuery)
      )
      .limit(limit)
      .toArray();
  },

  /**
   * 删除文章
   */
  async delete(id: number): Promise<void> {
    await db.articles.delete(id);
  },

  /**
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    await db.articles.clear();
  },

  /**
   * 获取历史记录数量
   */
  async count(): Promise<number> {
    return await db.articles.count();
  },
};
