import { useState, useEffect } from 'react';
import { useArticleStore } from '@/store/articleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHistoryStore } from '@/store/historyStore';
import { Settings } from '@/components/Settings';
import { Chat } from '@/components/Chat';
import { Export } from '@/components/Export';
import { History } from '@/components/History';
import type { ArticleRecord } from '@/db';

type TabType = 'summary' | 'chat' | 'history';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  
  const { 
    content, 
    extracting, 
    extractError,
    summary,
    summarizing,
    summaryError,
    chatMessages,
    extractContent, 
    generateSummary,
    loadFromHistory,
    clearAll 
  } = useArticleStore();

  const {
    apiKey,
    model,
    language,
    isLoaded,
    loadSettings,
  } = useSettingsStore();

  const { totalCount, refreshCount } = useHistoryStore();

  // 加载设置
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // 加载历史记录数量
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // 获取文章正文预览（纯文本，前500字）
  const getContentPreview = () => {
    if (!content) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.content;
    const text = tempDiv.textContent || '';
    return text.slice(0, 500) + (text.length > 500 ? '...' : '');
  };

  const handleGenerateSummary = () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    generateSummary(apiKey, model, language);
  };

  const handleSelectHistory = (record: ArticleRecord) => {
    loadFromHistory(record);
    setActiveTab('summary');
  };

  // 设置页面
  if (showSettings) {
    return (
      <div className="w-full h-full min-h-screen bg-gray-50">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="p-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">DeepRead</h1>
          <p className="text-sm text-gray-500">AI-powered reading assistant</p>
        </div>
        <div className="flex items-center gap-1">
          {/* 导出按钮 */}
          {content && (
            <button
              onClick={() => setShowExport(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="导出到 Obsidian"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
        {/* API Key 提示 */}
        {!apiKey && isLoaded && (
          <div className="card p-4 border-yellow-200 bg-yellow-50 mb-4">
            <p className="text-sm text-yellow-700">
              请先 <button onClick={() => setShowSettings(true)} className="underline font-medium">配置 API Key</button> 以使用 AI 功能
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={extractContent}
            disabled={extracting}
            className="btn-primary flex-1"
          >
            {extracting ? '提取中...' : '提取文章'}
          </button>
          {content && (
            <>
              <button
                onClick={handleGenerateSummary}
                disabled={summarizing || !content}
                className="btn-primary flex-1"
              >
                {summarizing ? '生成中...' : '生成摘要'}
              </button>
              <button
                onClick={clearAll}
                className="btn-secondary"
              >
                清除
              </button>
            </>
          )}
        </div>

        {/* 错误信息 */}
        {(extractError || summaryError) && (
          <div className="card p-4 border-red-200 bg-red-50 mb-4">
            <p className="text-red-600 text-sm">
              <strong>错误:</strong> {extractError || summaryError}
            </p>
          </div>
        )}

        {/* 标签页切换 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            摘要
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === 'chat'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            对话
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            历史
            {totalCount > 0 && (
              <span className="ml-1 text-xs text-gray-400">
                ({totalCount})
              </span>
            )}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 摘要标签页 */}
          {activeTab === 'summary' && (
            <>
              {/* 摘要结果 */}
              {summary && (
                <div className="space-y-4">
                  {/* 一句话摘要 */}
                  <div className="card p-4 bg-primary-50 border-primary-200">
                    <p className="text-primary-900 font-medium">{summary.oneLiner}</p>
                  </div>

                  {/* 核心洞察 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">核心洞察</h2>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">主要观点</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.mainPoint}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">为什么重要</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.whyItMatters}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">如何应用</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.howToApply}</p>
                      </div>
                    </div>
                  </div>

                  {/* 证据强度 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">证据强度</h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        summary.evidenceStrength.level === 'strong' ? 'bg-green-100 text-green-700' :
                        summary.evidenceStrength.level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        summary.evidenceStrength.level === 'weak' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {summary.evidenceStrength.level === 'strong' ? '强' :
                         summary.evidenceStrength.level === 'moderate' ? '中等' :
                         summary.evidenceStrength.level === 'weak' ? '弱' : '观点'}
                      </span>
                      <span className="text-sm text-gray-600">{summary.evidenceStrength.reasoning}</span>
                    </div>
                  </div>

                  {/* 详细摘要 */}
                  {summary.detailedSummary.sections.length > 0 && (
                    <div className="card p-4">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3">详细摘要</h2>
                      <div className="space-y-4">
                        {summary.detailedSummary.sections.map((section, index) => (
                          <div key={index}>
                            <h3 className="text-sm font-medium text-gray-800">{section.heading}</h3>
                            <p className="text-sm text-gray-600 mt-1">{section.summary}</p>
                            {section.keyQuotes && section.keyQuotes.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-gray-200">
                                {section.keyQuotes.map((quote, qIndex) => (
                                  <p key={qIndex} className="text-xs text-gray-500 italic">"{quote}"</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 思考触发 */}
                  {summary.thoughtTriggers && (
                    <div className="card p-4">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3">延伸思考</h2>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">应用:</span> {summary.thoughtTriggers.applicationPrompt}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">质疑:</span> {summary.thoughtTriggers.conflictPrompt}
                        </p>
                        {summary.thoughtTriggers.relatedQuestions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">相关问题:</span>
                            <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                              {summary.thoughtTriggers.relatedQuestions.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 提取的内容（调试模式） */}
              {content && !summary && (
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
                </div>
              )}

              {/* 空状态 */}
              {!content && !extracting && !extractError && (
                <div className="card p-4">
                  <p className="text-gray-600 text-sm">
                    打开一篇文章，然后点击"提取文章"按钮开始。
                  </p>
                </div>
              )}
            </>
          )}

          {/* 对话标签页 */}
          {activeTab === 'chat' && (
            content ? (
              <Chat />
            ) : (
              <div className="card p-4">
                <p className="text-gray-600 text-sm">
                  请先提取文章内容，然后开始对话。
                </p>
              </div>
            )
          )}

          {/* 历史标签页 */}
          {activeTab === 'history' && (
            <History onSelect={handleSelectHistory} />
          )}
        </div>
      </main>

      {/* 导出弹窗 */}
      {showExport && (
        <Export onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

export default App;
