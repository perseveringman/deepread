import { useArticleStore } from '@/store/articleStore';

function App() {
  const { content, loading, error, extractContent, clearContent } = useArticleStore();

  // 获取文章正文预览（纯文本，前500字）
  const getContentPreview = () => {
    if (!content) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.content;
    const text = tempDiv.textContent || '';
    return text.slice(0, 500) + (text.length > 500 ? '...' : '');
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">DeepRead</h1>
        <p className="text-sm text-gray-500">AI-powered reading assistant</p>
      </header>
      
      <main className="space-y-4">
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={extractContent}
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? '提取中...' : '提取文章内容'}
          </button>
          {content && (
            <button
              onClick={clearContent}
              className="btn-secondary"
            >
              清除
            </button>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="card p-4 border-red-200 bg-red-50">
            <p className="text-red-600 text-sm">
              <strong>错误:</strong> {error}
            </p>
          </div>
        )}

        {/* 调试信息展示 */}
        {content && (
          <div className="space-y-4">
            {/* 内容类型 */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">内容类型</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">类型:</span>{' '}
                  <span className="font-mono bg-blue-100 px-1 rounded">{content.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">置信度:</span>{' '}
                  <span className="font-mono">{(content.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">基本信息</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">标题:</span>{' '}
                  <span className="font-medium">{content.title}</span>
                </div>
                {content.author && (
                  <div>
                    <span className="text-gray-500">作者:</span>{' '}
                    <span>{content.author}</span>
                  </div>
                )}
                {content.publishDate && (
                  <div>
                    <span className="text-gray-500">发布日期:</span>{' '}
                    <span>{content.publishDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 元数据 */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">元数据</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">字数:</span>{' '}
                  <span className="font-mono">{content.metadata.wordCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">预计阅读:</span>{' '}
                  <span className="font-mono">{content.metadata.estimatedReadTime} 分钟</span>
                </div>
                <div>
                  <span className="text-gray-500">语言:</span>{' '}
                  <span className="font-mono">{content.metadata.language}</span>
                </div>
                <div>
                  <span className="text-gray-500">来源:</span>{' '}
                  <span className="font-mono text-xs">{content.metadata.source}</span>
                </div>
              </div>
            </div>

            {/* 内容预览 */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">内容预览 (前500字)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {getContentPreview()}
              </p>
            </div>

            {/* 原始 JSON */}
            <details className="card p-4">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer">
                原始 JSON 数据
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(content, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* 空状态 */}
        {!content && !loading && !error && (
          <div className="card p-4">
            <p className="text-gray-600 text-sm">
              打开一篇文章，然后点击"提取文章内容"按钮开始。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
