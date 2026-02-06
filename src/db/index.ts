/**
 * DeepRead 数据库定义
 * 使用 Dexie.js 封装 IndexedDB
 */

import Dexie, { type Table } from 'dexie';
import type { ExtractedContent, SmartSummary, ChatMessage } from '@/types';

/**
 * 层级标签
 */
export interface Tag {
  id?: number;                      // 自增主键
  name: string;                     // 标签名称
  path: string;                     // 完整路径（如 "技术/AI/机器学习"）
  parentId?: number;                // 父标签 ID
  level: number;                    // 层级深度（0 为根级）
  color?: string;                   // 标签颜色
  isAIGenerated: boolean;           // 是否 AI 生成
  articleCount: number;             // 关联文章数量（冗余字段，便于排序）
  createdAt: number;                // 创建时间
  updatedAt: number;                // 更新时间
}

/**
 * 文章-标签关联
 */
export interface ArticleTag {
  id?: number;                      // 自增主键
  articleId: number;                // 文章 ID
  tagId: number;                    // 标签 ID
  isAIGenerated: boolean;           // 是否 AI 自动生成
  confidence?: number;              // AI 生成的置信度 (0-1)
  createdAt: number;                // 创建时间
}

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
  tagsGenerated: boolean;           // 标签是否已生成
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
  tags!: Table<Tag, number>;
  articleTags!: Table<ArticleTag, number>;

  constructor() {
    super('DeepReadDB');
    
    // 数据库版本 1 - 原始版本
    this.version(1).stores({
      articles: '++id, url, urlHash, title, createdAt, updatedAt, lastAccessedAt',
    });
    
    // 数据库版本 2 - 添加标签系统
    this.version(2).stores({
      articles: '++id, url, urlHash, title, createdAt, updatedAt, lastAccessedAt, tagsGenerated',
      tags: '++id, name, path, parentId, level, articleCount, createdAt',
      articleTags: '++id, articleId, tagId, [articleId+tagId]',
    }).upgrade(tx => {
      // 为现有文章添加 tagsGenerated 字段
      return tx.table('articles').toCollection().modify(article => {
        article.tagsGenerated = false;
      });
    });
  }
}

// 导出数据库单例
export const db = new DeepReadDatabase();

/**
 * 标签数据库操作
 */
export const tagDB = {
  /**
   * 创建或获取标签（支持层级路径）
   * 例如 "技术/AI/机器学习" 会创建三个层级的标签
   */
  async getOrCreateByPath(path: string, isAIGenerated = false): Promise<Tag> {
    const parts = path.split('/').map(p => p.trim()).filter(p => p);
    if (parts.length === 0) {
      throw new Error('标签路径不能为空');
    }

    let currentPath = '';
    let parentId: number | undefined;
    let tag: Tag | undefined;

    for (let level = 0; level < parts.length; level++) {
      const name = parts[level];
      currentPath = level === 0 ? name : `${currentPath}/${name}`;
      
      // 查找是否已存在
      const existing = await db.tags.where('path').equals(currentPath).first();
      
      if (existing) {
        tag = existing;
        parentId = existing.id;
      } else {
        // 创建新标签
        const now = Date.now();
        const id = await db.tags.add({
          name,
          path: currentPath,
          parentId,
          level,
          isAIGenerated,
          articleCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        tag = await db.tags.get(id);
        parentId = id;
      }
    }

    return tag!;
  },

  /**
   * 获取所有标签
   */
  async getAll(): Promise<Tag[]> {
    return await db.tags.orderBy('path').toArray();
  },

  /**
   * 获取根级标签
   */
  async getRootTags(): Promise<Tag[]> {
    return await db.tags.where('level').equals(0).toArray();
  },

  /**
   * 获取子标签
   */
  async getChildren(parentId: number): Promise<Tag[]> {
    return await db.tags.where('parentId').equals(parentId).toArray();
  },

  /**
   * 获取标签树（递归结构）
   */
  async getTagTree(): Promise<(Tag & { children: Tag[] })[]> {
    const allTags = await this.getAll();
    const tagMap = new Map<number, Tag & { children: Tag[] }>();
    const rootTags: (Tag & { children: Tag[] })[] = [];

    // 初始化
    for (const tag of allTags) {
      tagMap.set(tag.id!, { ...tag, children: [] });
    }

    // 构建树
    for (const tag of allTags) {
      const node = tagMap.get(tag.id!)!;
      if (tag.parentId && tagMap.has(tag.parentId)) {
        tagMap.get(tag.parentId)!.children.push(node);
      } else {
        rootTags.push(node);
      }
    }

    return rootTags;
  },

  /**
   * 更新标签
   */
  async update(id: number, updates: Partial<Tag>): Promise<void> {
    await db.tags.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  /**
   * 删除标签（包括子标签）
   */
  async delete(id: number): Promise<void> {
    const tag = await db.tags.get(id);
    if (!tag) return;

    // 删除所有以此路径开头的标签
    const pathPrefix = tag.path + '/';
    const childTags = await db.tags
      .filter(t => t.path.startsWith(pathPrefix))
      .toArray();
    
    const idsToDelete = [id, ...childTags.map(t => t.id!)];
    
    // 删除关联
    await db.articleTags.where('tagId').anyOf(idsToDelete).delete();
    
    // 删除标签
    await db.tags.bulkDelete(idsToDelete);
  },

  /**
   * 重新计算标签的文章数量
   */
  async recalculateArticleCount(tagId: number): Promise<void> {
    const count = await db.articleTags.where('tagId').equals(tagId).count();
    await db.tags.update(tagId, { 
      articleCount: count,
      updatedAt: Date.now(),
    });
  },
};

/**
 * 文章-标签关联操作
 */
export const articleTagDB = {
  /**
   * 为文章添加标签
   */
  async addTag(
    articleId: number, 
    tagId: number, 
    isAIGenerated = false,
    confidence?: number
  ): Promise<void> {
    // 检查是否已存在
    const existing = await db.articleTags
      .where('[articleId+tagId]')
      .equals([articleId, tagId])
      .first();
    
    if (!existing) {
      await db.articleTags.add({
        articleId,
        tagId,
        isAIGenerated,
        confidence,
        createdAt: Date.now(),
      });
      
      // 更新标签的文章计数
      await tagDB.recalculateArticleCount(tagId);
    }
  },

  /**
   * 为文章添加多个标签（通过路径）
   */
  async addTagsByPaths(
    articleId: number, 
    paths: string[], 
    isAIGenerated = false,
    confidences?: number[]
  ): Promise<Tag[]> {
    const tags: Tag[] = [];
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const tag = await tagDB.getOrCreateByPath(path, isAIGenerated);
      tags.push(tag);
      
      await this.addTag(
        articleId, 
        tag.id!, 
        isAIGenerated, 
        confidences?.[i]
      );
    }
    
    return tags;
  },

  /**
   * 移除文章的标签
   */
  async removeTag(articleId: number, tagId: number): Promise<void> {
    await db.articleTags
      .where('[articleId+tagId]')
      .equals([articleId, tagId])
      .delete();
    
    // 更新标签的文章计数
    await tagDB.recalculateArticleCount(tagId);
  },

  /**
   * 获取文章的所有标签
   */
  async getArticleTags(articleId: number): Promise<(ArticleTag & { tag: Tag })[]> {
    const relations = await db.articleTags
      .where('articleId')
      .equals(articleId)
      .toArray();
    
    const result: (ArticleTag & { tag: Tag })[] = [];
    
    for (const rel of relations) {
      const tag = await db.tags.get(rel.tagId);
      if (tag) {
        result.push({ ...rel, tag });
      }
    }
    
    return result;
  },

  /**
   * 获取标签下的所有文章
   */
  async getTagArticles(tagId: number): Promise<ArticleRecord[]> {
    const relations = await db.articleTags
      .where('tagId')
      .equals(tagId)
      .toArray();
    
    const articleIds = relations.map(r => r.articleId);
    return await db.articles.where('id').anyOf(articleIds).toArray();
  },

  /**
   * 清除文章的所有 AI 生成标签
   */
  async clearAITags(articleId: number): Promise<void> {
    const relations = await db.articleTags
      .where('articleId')
      .equals(articleId)
      .filter(r => r.isAIGenerated)
      .toArray();
    
    for (const rel of relations) {
      await this.removeTag(articleId, rel.tagId);
    }
  },
};

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
        tagsGenerated: false,
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
   * 标记标签已生成
   */
  async markTagsGenerated(url: string): Promise<void> {
    const urlHash = hashUrl(url);
    const existing = await db.articles.where('urlHash').equals(urlHash).first();
    
    if (existing) {
      await db.articles.update(existing.id!, {
        tagsGenerated: true,
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
   * 根据 ID 获取文章
   */
  async getById(id: number): Promise<ArticleRecord | undefined> {
    return await db.articles.get(id);
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
    // 删除文章-标签关联
    await db.articleTags.where('articleId').equals(id).delete();
    // 删除文章
    await db.articles.delete(id);
  },

  /**
   * 清空所有历史
   */
  async clearAll(): Promise<void> {
    await db.articleTags.clear();
    await db.articles.clear();
  },

  /**
   * 获取历史记录数量
   */
  async count(): Promise<number> {
    return await db.articles.count();
  },
};
