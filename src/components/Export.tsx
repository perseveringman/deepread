import { useState, useMemo } from 'react';
import { useArticleStore } from '../store/articleStore';
import {
  exportToObsidian,
  copyToClipboard,
  downloadMarkdown,
  type ExportOptions
} from '../services/exporter';

interface ExportProps {
  onClose: () => void;
}

export function Export({ onClose }: ExportProps) {
  const { content, summary, chatMessages } = useArticleStore();
  
  const [options, setOptions] = useState<ExportOptions>({
    includeSummary: true,
    includeChat: true,
    includeOriginalContent: false,
    includeMetadata: true
  });
  
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // 生成预览
  const exportResult = useMemo(() => {
    if (!content) return null;
    return exportToObsidian(content, summary || undefined, chatMessages, options);
  }, [content, summary, chatMessages, options]);
  
  if (!content) {
    return (
      <div className="p-4 text-center text-gray-500">
        没有可导出的内容
      </div>
    );
  }
  
  const handleCopy = async () => {
    if (!exportResult) return;
    const success = await copyToClipboard(exportResult.markdown);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDownload = () => {
    if (!exportResult) return;
    downloadMarkdown(exportResult.markdown, exportResult.filename);
  };
  
  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-lg max-h-[90%] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">导出到 Obsidian</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>
        
        {/* 选项区域 */}
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">导出内容</h3>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeMetadata}
              onChange={() => toggleOption('includeMetadata')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium">YAML Frontmatter</span>
              <p className="text-xs text-gray-500">包含标题、来源、标签等元数据</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeSummary}
              onChange={() => toggleOption('includeSummary')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={!summary}
            />
            <div>
              <span className={`text-sm font-medium ${!summary ? 'text-gray-400' : ''}`}>
                智能摘要
              </span>
              <p className="text-xs text-gray-500">
                {summary ? '核心洞察、证据评估、详细摘要' : '(尚未生成摘要)'}
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeChat}
              onChange={() => toggleOption('includeChat')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={chatMessages.length === 0}
            />
            <div>
              <span className={`text-sm font-medium ${chatMessages.length === 0 ? 'text-gray-400' : ''}`}>
                对话记录
              </span>
              <p className="text-xs text-gray-500">
                {chatMessages.length > 0 
                  ? `${chatMessages.length} 条对话消息` 
                  : '(无对话记录)'}
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeOriginalContent}
              onChange={() => toggleOption('includeOriginalContent')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium">原文内容</span>
              <p className="text-xs text-gray-500">
                包含完整原文 ({content.metadata.wordCount} 字)
              </p>
            </div>
          </label>
        </div>
        
        {/* 预览区域 */}
        {showPreview && exportResult && (
          <div className="mx-4 mb-4 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 flex justify-between items-center">
              <span>预览: {exportResult.filename}</span>
              <span className="text-gray-400">
                {exportResult.markdown.length} 字符
              </span>
            </div>
            <pre className="p-3 text-xs overflow-auto max-h-48 bg-gray-50 font-mono whitespace-pre-wrap">
              {exportResult.markdown.slice(0, 2000)}
              {exportResult.markdown.length > 2000 && '\n\n... (内容已截断)'}
            </pre>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-100"
          >
            {showPreview ? '隐藏预览' : '预览'}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={handleCopy}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              copied 
                ? 'bg-green-50 text-green-600 border-green-200' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {copied ? '已复制 ✓' : '复制'}
          </button>
          
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            下载 .md
          </button>
        </div>
      </div>
    </div>
  );
}
