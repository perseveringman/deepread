/**
 * 标签 UI 组件
 */

import { useState, useEffect, useRef } from 'react';
import { useTagStore } from '@/store/tagStore';
import { useI18n } from '@/i18n';
import type { Tag, ArticleTag } from '@/db';

// 预定义颜色
const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
];

/**
 * 根据标签路径生成稳定的颜色
 */
function getTagColor(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash = hash & hash;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/**
 * 单个标签徽章
 */
interface TagBadgeProps {
  tag: Tag;
  showFullPath?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
  isAIGenerated?: boolean;
}

export function TagBadge({ 
  tag, 
  showFullPath = false, 
  removable = false,
  onRemove,
  onClick,
  size = 'sm',
  isAIGenerated = false,
}: TagBadgeProps) {
  const colorClass = getTagColor(tag.path);
  const displayText = showFullPath ? tag.path : tag.name;
  
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded border
        ${colorClass} ${sizeClasses}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${isAIGenerated ? 'border-dashed' : ''}
      `}
      onClick={onClick}
      title={showFullPath ? undefined : tag.path}
    >
      {/* 层级指示器 */}
      {tag.level > 0 && !showFullPath && (
        <span className="opacity-50">{'·'.repeat(tag.level)}</span>
      )}
      
      <span>{displayText}</span>
      
      {/* AI 标识 */}
      {isAIGenerated && (
        <span className="opacity-50 text-[10px]">AI</span>
      )}
      
      {/* 删除按钮 */}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * 标签列表显示
 */
interface TagListProps {
  tags: (ArticleTag & { tag: Tag })[];
  editable?: boolean;
  articleId?: number;
  onTagClick?: (tag: Tag) => void;
}

export function TagList({ tags, editable = false, articleId, onTagClick }: TagListProps) {
  const { removeTagFromArticle } = useTagStore();

  if (tags.length === 0) {
    return null;
  }

  const handleRemove = async (tagId: number) => {
    if (articleId) {
      await removeTagFromArticle(articleId, tagId);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((relation) => (
        <TagBadge
          key={relation.id}
          tag={relation.tag}
          isAIGenerated={relation.isAIGenerated}
          removable={editable}
          onRemove={editable ? () => handleRemove(relation.tagId) : undefined}
          onClick={onTagClick ? () => onTagClick(relation.tag) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * 标签输入框（支持自动完成）
 */
interface TagInputProps {
  articleId: number;
  placeholder?: string;
}

export function TagInput({ articleId, placeholder }: TagInputProps) {
  const { t } = useI18n();
  const { tags, addTagToArticle, loadAllTags } = useTagStore();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllTags();
  }, [loadAllTags]);

  useEffect(() => {
    if (input.trim()) {
      const lowerInput = input.toLowerCase();
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(lowerInput) ||
        tag.path.toLowerCase().includes(lowerInput)
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, tags]);

  const handleSubmit = async (tagPath: string) => {
    if (!tagPath.trim()) return;
    
    setLoading(true);
    try {
      await addTagToArticle(articleId, tagPath.trim());
      setInput('');
      setShowSuggestions(false);
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder || t.common.save + ' tag...'}
          disabled={loading}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => handleSubmit(input)}
          disabled={loading || !input.trim()}
          className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? '...' : '+'}
        </button>
      </div>
      
      {/* 建议列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleSubmit(tag.path)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <TagBadge tag={tag} showFullPath />
              <span className="text-gray-400 text-xs">({tag.articleCount})</span>
            </button>
          ))}
          
          {/* 创建新标签选项 */}
          {!suggestions.find(s => s.path.toLowerCase() === input.toLowerCase()) && (
            <button
              onClick={() => handleSubmit(input)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-t border-gray-100"
            >
              <span className="text-primary-600">+ 创建 "{input}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 文章标签编辑器（显示+输入）
 */
interface ArticleTagEditorProps {
  articleId: number;
  compact?: boolean;
}

export function ArticleTagEditor({ articleId, compact = false }: ArticleTagEditorProps) {
  const { t } = useI18n();
  const { currentArticleTags, loadingArticleTags, loadArticleTags } = useTagStore();
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (articleId) {
      loadArticleTags(articleId);
    }
  }, [articleId, loadArticleTags]);

  if (loadingArticleTags) {
    return <div className="text-xs text-gray-400">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-2">
      {/* 现有标签 */}
      {currentArticleTags.length > 0 && (
        <TagList 
          tags={currentArticleTags} 
          editable={!compact}
          articleId={articleId}
        />
      )}
      
      {/* 添加标签 */}
      {!compact && (
        showInput ? (
          <TagInput articleId={articleId} />
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="text-xs text-gray-500 hover:text-primary-600"
          >
            + 添加标签
          </button>
        )
      )}
      
      {/* 紧凑模式下显示添加按钮 */}
      {compact && currentArticleTags.length === 0 && (
        <span className="text-xs text-gray-400">暂无标签</span>
      )}
    </div>
  );
}

/**
 * 标签树显示（用于标签管理页面）
 */
interface TagTreeProps {
  onSelect?: (tag: Tag) => void;
}

export function TagTree({ onSelect }: TagTreeProps) {
  const { tagTree, loadTagTree, loading, deleteTag } = useTagStore();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTagTree();
  }, [loadTagTree]);

  const toggleExpand = (tagId: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId);
    } else {
      newExpanded.add(tagId);
    }
    setExpandedIds(newExpanded);
  };

  const renderNode = (node: Tag & { children: Tag[] }, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id!);

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer
            ${level > 0 ? 'ml-4' : ''}
          `}
          onClick={() => onSelect?.(node)}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id!);
              }}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg 
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-4" />
          )}
          
          {/* 标签徽章 */}
          <TagBadge tag={node} size="md" />
          
          {/* 文章数量 */}
          <span className="text-xs text-gray-400">({node.articleCount})</span>
          
          {/* 删除按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定删除标签 "${node.path}"${hasChildren ? ' 及其子标签' : ''}？`)) {
                deleteTag(node.id!);
              }
            }}
            className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-4">
            {node.children.map(child => renderNode(child as Tag & { children: Tag[] }, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-sm text-gray-500">加载中...</div>;
  }

  if (tagTree.length === 0) {
    return <div className="text-sm text-gray-500">暂无标签</div>;
  }

  return (
    <div className="space-y-1">
      {tagTree.map(node => renderNode(node))}
    </div>
  );
}
