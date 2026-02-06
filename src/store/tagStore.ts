/**
 * 标签管理 Store
 */

import { create } from 'zustand';
import { tagDB, articleTagDB, type Tag, type ArticleTag } from '@/db';

interface TagState {
  // 标签列表
  tags: Tag[];
  tagTree: (Tag & { children: Tag[] })[];
  loading: boolean;
  error: string | null;
  
  // 当前文章的标签
  currentArticleTags: (ArticleTag & { tag: Tag })[];
  loadingArticleTags: boolean;
  
  // 操作
  loadAllTags: () => Promise<void>;
  loadTagTree: () => Promise<void>;
  loadArticleTags: (articleId: number) => Promise<void>;
  addTagToArticle: (articleId: number, tagPath: string) => Promise<void>;
  removeTagFromArticle: (articleId: number, tagId: number) => Promise<void>;
  createTag: (path: string) => Promise<Tag>;
  deleteTag: (tagId: number) => Promise<void>;
  updateTag: (tagId: number, updates: Partial<Tag>) => Promise<void>;
  clearCurrentArticleTags: () => void;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  tagTree: [],
  loading: false,
  error: null,
  currentArticleTags: [],
  loadingArticleTags: false,
  
  loadAllTags: async () => {
    set({ loading: true, error: null });
    try {
      const tags = await tagDB.getAll();
      set({ tags, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载标签失败',
        loading: false,
      });
    }
  },
  
  loadTagTree: async () => {
    set({ loading: true, error: null });
    try {
      const tagTree = await tagDB.getTagTree();
      const tags = await tagDB.getAll();
      set({ tagTree, tags, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载标签树失败',
        loading: false,
      });
    }
  },
  
  loadArticleTags: async (articleId: number) => {
    set({ loadingArticleTags: true });
    try {
      const currentArticleTags = await articleTagDB.getArticleTags(articleId);
      set({ currentArticleTags, loadingArticleTags: false });
    } catch (error) {
      console.error('Failed to load article tags:', error);
      set({ currentArticleTags: [], loadingArticleTags: false });
    }
  },
  
  addTagToArticle: async (articleId: number, tagPath: string) => {
    try {
      const tag = await tagDB.getOrCreateByPath(tagPath, false);
      await articleTagDB.addTag(articleId, tag.id!, false);
      
      // 刷新当前文章标签和标签列表
      await get().loadArticleTags(articleId);
      await get().loadAllTags();
    } catch (error) {
      console.error('Failed to add tag:', error);
      throw error;
    }
  },
  
  removeTagFromArticle: async (articleId: number, tagId: number) => {
    try {
      await articleTagDB.removeTag(articleId, tagId);
      
      // 刷新当前文章标签
      await get().loadArticleTags(articleId);
      await get().loadAllTags();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      throw error;
    }
  },
  
  createTag: async (path: string) => {
    try {
      const tag = await tagDB.getOrCreateByPath(path, false);
      await get().loadAllTags();
      return tag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  },
  
  deleteTag: async (tagId: number) => {
    try {
      await tagDB.delete(tagId);
      await get().loadAllTags();
      await get().loadTagTree();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  },
  
  updateTag: async (tagId: number, updates: Partial<Tag>) => {
    try {
      await tagDB.update(tagId, updates);
      await get().loadAllTags();
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  },
  
  clearCurrentArticleTags: () => {
    set({ currentArticleTags: [] });
  },
}));
