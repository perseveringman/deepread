import { useState, useEffect } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import type { ArticleRecord } from '@/db';

interface HistoryProps {
  onSelect: (record: ArticleRecord) => void;
}

export function History({ onSelect }: HistoryProps) {
  const {
    records,
    loading,
    error,
    searchQuery,
    totalCount,
    loadHistory,
    search,
    deleteRecord,
    clearAll,
  } = useHistoryStore();

  const [localSearch, setLocalSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  // 加载历史记录
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        search(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, search]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('确定删除这条记录吗？')) {
      await deleteRecord(id);
    }
  };

  const handleClearAll = async () => {
    if (confirmClear) {
      await clearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    // 今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    // 昨天
    if (diff < 48 * 60 * 60 * 1000) {
      return '昨天';
    }
    // 本周
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('zh-CN', { weekday: 'short' });
    }
    // 更早
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      paper: '论文',
      blog: '博客',
      news: '新闻',
      twitter: '推文',
      documentation: '文档',
      generic: '文章',
    };
    return labels[type] || '文章';
  };

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="搜索历史记录..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 统计和操作 */}
      <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
        <span>共 {totalCount} 条记录</span>
        {totalCount > 0 && (
          <button
            onClick={handleClearAll}
            className={`px-2 py-1 rounded transition-colors ${
              confirmClear
                ? 'bg-red-100 text-red-600'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            {confirmClear ? '再次点击确认清空' : '清空全部'}
          </button>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-sm">加载中...</div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && records.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <svg
            className="w-12 h-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="text-sm">
            {searchQuery ? '没有找到匹配的记录' : '暂无阅读历史'}
          </p>
        </div>
      )}

      {/* 历史列表 */}
      {!loading && records.length > 0 && (
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              onClick={() => onSelect(record)}
              className="group p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {record.title}
                  </h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {record.extractedContent.metadata.source}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, record.id!)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {getTypeLabel(record.extractedContent.type)}
                </span>
                {record.summary && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                    已摘要
                  </span>
                )}
                {record.chatMessages.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                    {record.chatMessages.length} 条对话
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {formatDate(record.lastAccessedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
