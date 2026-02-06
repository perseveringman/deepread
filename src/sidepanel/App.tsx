import { useState, useEffect, useRef } from 'react';
import { useArticleStore } from '@/store/articleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHistoryStore } from '@/store/historyStore';
import { useI18n } from '@/i18n';
import { Settings } from '@/components/Settings';
import { Chat, type ChatHandle } from '@/components/Chat';
import { Export } from '@/components/Export';
import { History } from '@/components/History';
import type { ArticleRecord } from '@/db';

type TabType = 'summary' | 'chat' | 'history';

function App() {
  const { t } = useI18n();
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const chatRef = useRef<ChatHandle>(null);
  
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

  // 监听快捷键命令和右键菜单
  useEffect(() => {
    const handleMessage = (message: { type: string; command?: string; text?: string }) => {
      if (message.type === 'COMMAND') {
        if (message.command === 'extract-article') {
          extractContent();
        } else if (message.command === 'generate-summary') {
          if (content && apiKey) {
            generateSummary(apiKey, model, language);
          } else if (!content) {
            extractContent();
          } else {
            setShowSettings(true);
          }
        }
      } else if (message.type === 'ASK_SELECTION' && message.text) {
        // 右键菜单选中文字提问
        setActiveTab('chat');
        // 延迟一下确保 Chat 组件已渲染
        setTimeout(() => {
          if (chatRef.current) {
            chatRef.current.setInput(`关于这段文字："${message.text}"，请解释一下。`);
          }
        }, 100);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [content, apiKey, model, language, extractContent, generateSummary]);

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
          <h1 className="text-xl font-bold text-gray-900">{t.app.title}</h1>
          <p className="text-sm text-gray-500">{t.app.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* 导出按钮 */}
          {content && (
            <button
              onClick={() => setShowExport(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title={t.export.title}
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
            title={t.settings.title}
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
              {t.app.apiKeyRequired.split(t.app.configureApiKey)[0]}
              <button onClick={() => setShowSettings(true)} className="underline font-medium">{t.app.configureApiKey}</button>
              {t.app.apiKeyRequired.split(t.app.configureApiKey)[1] || ''}
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
            {extracting ? t.app.extracting : t.app.extractArticle}
          </button>
          {content && (
            <>
              <button
                onClick={handleGenerateSummary}
                disabled={summarizing || !content}
                className="btn-primary flex-1"
              >
                {summarizing ? t.app.generating : t.app.generateSummary}
              </button>
              <button
                onClick={clearAll}
                className="btn-secondary"
              >
                {t.common.clear}
              </button>
            </>
          )}
        </div>

        {/* 错误信息 */}
        {(extractError || summaryError) && (
          <div className="card p-4 border-red-200 bg-red-50 mb-4">
            <p className="text-red-600 text-sm">
              <strong>{t.common.error}:</strong> {extractError || summaryError}
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
            {t.tabs.summary}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === 'chat'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.tabs.chat}
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
            {t.tabs.history}
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
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.coreInsights}</h2>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.mainPoint}</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.mainPoint}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.whyItMatters}</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.whyItMatters}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.howToApply}</h3>
                        <p className="text-sm text-gray-700 mt-1">{summary.coreInsights.howToApply}</p>
                      </div>
                    </div>
                  </div>

                  {/* 证据强度 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.summary.evidenceStrength}</h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        summary.evidenceStrength.level === 'strong' ? 'bg-green-100 text-green-700' :
                        summary.evidenceStrength.level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        summary.evidenceStrength.level === 'weak' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.summary.evidenceLevels[summary.evidenceStrength.level as keyof typeof t.summary.evidenceLevels]}
                      </span>
                      <span className="text-sm text-gray-600">{summary.evidenceStrength.reasoning}</span>
                    </div>
                  </div>

                  {/* 详细摘要 */}
                  {summary.detailedSummary.sections.length > 0 && (
                    <div className="card p-4">
                      <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.detailedSummary}</h2>
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
                      <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.thoughtTriggers}</h2>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{t.summary.applicationPrompt}:</span> {summary.thoughtTriggers.applicationPrompt}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{t.summary.conflictPrompt}:</span> {summary.thoughtTriggers.conflictPrompt}
                        </p>
                        {summary.thoughtTriggers.relatedQuestions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">{t.summary.relatedQuestions}:</span>
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
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.content.contentType}</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">{t.content.type}:</span>{' '}
                        <span className="font-mono bg-blue-100 px-1 rounded">{content.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t.content.confidence}:</span>{' '}
                        <span className="font-mono">{(content.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 基本信息 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.content.basicInfo}</h2>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">{t.content.title}:</span>{' '}
                        <span className="font-medium">{content.title}</span>
                      </div>
                      {content.author && (
                        <div>
                          <span className="text-gray-500">{t.content.author}:</span>{' '}
                          <span>{content.author}</span>
                        </div>
                      )}
                      {content.publishDate && (
                        <div>
                          <span className="text-gray-500">{t.content.publishDate}:</span>{' '}
                          <span>{content.publishDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 元数据 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.content.metadata}</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">{t.content.wordCount}:</span>{' '}
                        <span className="font-mono">{content.metadata.wordCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t.content.readTime}:</span>{' '}
                        <span className="font-mono">{content.metadata.estimatedReadTime} {t.content.minutes}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t.content.language}:</span>{' '}
                        <span className="font-mono">{content.metadata.language}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t.content.source}:</span>{' '}
                        <span className="font-mono text-xs">{content.metadata.source}</span>
                      </div>
                    </div>
                  </div>

                  {/* 内容预览 */}
                  <div className="card p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.content.contentPreview} ({t.content.first500})</h2>
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
                    {t.app.emptyState}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 对话标签页 */}
          {activeTab === 'chat' && (
            content ? (
              <Chat ref={chatRef} />
            ) : (
              <div className="card p-4">
                <p className="text-gray-600 text-sm">
                  {t.chat.extractFirst}
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
