/**
 * 文献综述组件
 * 包含文章选择、生成过程、综述展示
 */

import { useState, useEffect } from 'react';
import { useLiteratureReviewStore } from '@/store/literatureReviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useI18n } from '@/i18n';
import { articleDB, type ArticleRecord } from '@/db';
import type { LiteratureReview } from '@/types';

/**
 * 文章选择卡片
 */
function ArticleCard({ 
  article, 
  selected, 
  onToggle 
}: { 
  article: ArticleRecord; 
  selected: boolean; 
  onToggle: () => void;
}) {
  const hasSummary = !!article.summary;
  
  return (
    <div
      onClick={onToggle}
      className={`p-3 border rounded-lg cursor-pointer transition-all ${
        selected 
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {article.title}
          </h4>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {article.extractedContent.metadata.source}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
              {article.extractedContent.type}
            </span>
            {hasSummary && (
              <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-600 rounded">
                已摘要
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {article.extractedContent.metadata.wordCount} 字
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 文章选择器
 */
function ArticleSelector() {
  const { t } = useI18n();
  const { apiKey, model, language } = useSettingsStore();
  const {
    availableArticles,
    selectedArticleIds,
    loadingArticles,
    generateError,
    loadArticles,
    toggleArticle,
    selectAll,
    clearSelection,
    generateReview,
    getEstimatedTokens,
  } = useLiteratureReviewStore();

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const selectedCount = selectedArticleIds.size;
  const estimatedTokens = getEstimatedTokens();

  const handleGenerate = () => {
    if (!apiKey) {
      alert(t.literatureReview?.noApiKey || '请先配置 API Key');
      return;
    }
    generateReview(apiKey, model, language);
  };

  if (loadingArticles) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t.common.loading}</div>
      </div>
    );
  }

  if (availableArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-sm">{t.literatureReview?.noArticles || '没有可用文章'}</p>
        <p className="text-xs mt-1">{t.literatureReview?.readFirstHint || '请先阅读一些文章'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="text-sm text-gray-600">
          {t.literatureReview?.selectedCount?.replace('{count}', String(selectedCount)) || `已选择 ${selectedCount} 篇`}
          <span className="text-gray-400 ml-2">(最多20篇)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearSelection}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {t.literatureReview?.clearSelection || '清除'}
          </button>
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs text-primary-600 hover:text-primary-700"
          >
            {t.literatureReview?.selectAll || '全选'}
          </button>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {availableArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            selected={selectedArticleIds.has(article.id!)}
            onToggle={() => toggleArticle(article.id!)}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {generateError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {generateError}
        </div>
      )}

      {/* 底部操作 */}
      <div className="pt-3 border-t">
        {selectedCount > 0 && (
          <div className="text-xs text-gray-400 mb-2">
            {t.literatureReview?.estimatedTokens?.replace('{tokens}', estimatedTokens.toLocaleString()) || 
              `预计使用约 ${estimatedTokens.toLocaleString()} tokens`}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={selectedCount < 2}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedCount < 2 
            ? (t.literatureReview?.selectAtLeast2 || '请至少选择2篇文章')
            : (t.literatureReview?.generateReview || '生成文献综述')}
        </button>
      </div>
    </div>
  );
}

/**
 * 生成中状态
 */
function GeneratingView() {
  const { t } = useI18n();
  const { generatingText, cancelReview, getSelectedArticles } = useLiteratureReviewStore();
  const selectedCount = getSelectedArticles().length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">
            {t.literatureReview?.generating?.replace('{count}', String(selectedCount)) || 
              `正在分析 ${selectedCount} 篇文章...`}
          </span>
        </div>
        <button
          onClick={cancelReview}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border rounded"
        >
          {t.common.cancel || '取消'}
        </button>
      </div>

      {/* 实时输出预览 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 bg-gray-50 rounded-lg">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {generatingText || (t.literatureReview?.waitingResponse || '等待AI响应...')}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * 综述展示视图
 */
function ReviewView({ review }: { review: LiteratureReview }) {
  const { t } = useI18n();
  const { setMode, deleteReview } = useLiteratureReviewStore();
  const [articleTitles, setArticleTitles] = useState<Map<number, string>>(new Map());

  // 加载文章标题
  useEffect(() => {
    const loadTitles = async () => {
      const titles = new Map<number, string>();
      for (const id of review.articleIds) {
        const article = await articleDB.getById(id);
        if (article) {
          titles.set(id, article.title);
        }
      }
      setArticleTitles(titles);
    };
    loadTitles();
  }, [review.articleIds]);

  const getArticleTitle = (id: number) => articleTitles.get(id) || `文章 ${id}`;

  const handleDelete = async () => {
    if (window.confirm(t.literatureReview?.confirmDelete || '确定删除这篇综述？')) {
      await deleteReview(review.id!);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <button
          onClick={() => setMode('select')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.literatureReview?.backToSelect || '返回'}
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
        >
          {t.common.delete || '删除'}
        </button>
      </div>

      {/* 综述内容 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* 标题 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900">{review.title}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(review.createdAt).toLocaleString()} · {review.articleIds.length} {t.literatureReview?.articles || '篇文章'}
          </p>
        </div>

        {/* 核心发现 */}
        <section className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
            {t.literatureReview?.coreFindings || '核心发现'}
          </h3>
          
          {review.coreFindings.mainThemes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">{t.literatureReview?.mainThemes || '主要主题'}</p>
              <div className="flex flex-wrap gap-1">
                {review.coreFindings.mainThemes.map((theme, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {review.coreFindings.keyArguments.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">{t.literatureReview?.keyArguments || '核心论点'}</p>
              <ul className="space-y-2">
                {review.coreFindings.keyArguments.map((arg, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <p>{arg.argument}</p>
                    {arg.supportingArticles.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        来源: {arg.supportingArticles.map(id => getArticleTitle(id)).join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 共识与分歧 */}
        <section className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            {t.literatureReview?.consensusAndDisagreements || '共识与分歧'}
          </h3>
          
          {/* 共识 */}
          {review.consensus.agreements.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-green-600 font-medium mb-2">{t.literatureReview?.agreements || '共识点'}</p>
              <ul className="space-y-2">
                {review.consensus.agreements.map((agreement, i) => (
                  <li key={i} className="p-2 bg-green-50 rounded text-sm text-gray-700">
                    <p>{agreement.point}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {agreement.articleIds.map(id => getArticleTitle(id)).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 分歧 */}
          {review.consensus.disagreements.length > 0 && (
            <div>
              <p className="text-xs text-orange-600 font-medium mb-2">{t.literatureReview?.disagreements || '分歧点'}</p>
              {review.consensus.disagreements.map((disagreement, i) => (
                <div key={i} className="p-2 bg-orange-50 rounded mb-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">{disagreement.topic}</p>
                  <div className="space-y-1">
                    {disagreement.positions.map((pos, j) => (
                      <div key={j} className="pl-2 border-l-2 border-orange-300">
                        <p className="text-sm text-gray-600">{pos.stance}</p>
                        <p className="text-xs text-gray-400">
                          {pos.articleIds.map(id => getArticleTitle(id)).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 知识空白 */}
        {review.knowledgeGaps.length > 0 && (
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              {t.literatureReview?.knowledgeGaps || '知识空白'}
            </h3>
            <ul className="space-y-2">
              {review.knowledgeGaps.map((gap, i) => (
                <li key={i} className="p-2 bg-yellow-50 rounded">
                  <p className="text-sm text-gray-700">{gap.gap}</p>
                  <p className="text-xs text-gray-500 mt-1">{gap.implication}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 延伸阅读 */}
        {review.furtherReading.length > 0 && (
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              {t.literatureReview?.furtherReading || '延伸阅读建议'}
            </h3>
            <ul className="space-y-2">
              {review.furtherReading.map((item, i) => (
                <li key={i} className="p-2 bg-blue-50 rounded">
                  <p className="text-sm font-medium text-gray-700">{item.topic}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{item.reason}</p>
                  {item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.keywords.map((kw, j) => (
                        <span key={j} className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 综合结论 */}
        {review.conclusion && (
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
              {t.literatureReview?.conclusion || '综合结论'}
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {review.conclusion}
            </p>
          </section>
        )}

        {/* 参考文章列表 */}
        <section className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
            {t.literatureReview?.references || '参考文章'}
          </h3>
          <ol className="list-decimal list-inside space-y-1">
            {review.articleIds.map((id) => (
              <li key={id} className="text-sm text-gray-600">
                {getArticleTitle(id)}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/**
 * 历史综述列表
 */
function ReviewHistory() {
  const { t } = useI18n();
  const { reviews, loadingReviews, loadReviews, viewReview } = useLiteratureReviewStore();

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loadingReviews) {
    return <div className="text-center py-4 text-gray-500">{t.common.loading}</div>;
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-gray-500 mb-2">
        {t.literatureReview?.history || '历史综述'}
      </h3>
      <div className="space-y-2">
        {reviews.map((review) => (
          <div
            key={review.id}
            onClick={() => viewReview(review)}
            className="p-2 bg-gray-50 rounded border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <p className="text-sm font-medium text-gray-700 truncate">{review.title}</p>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()} · {review.articleIds.length} 篇
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 文献综述主组件
 */
export function LiteratureReview() {
  const { mode, currentReview } = useLiteratureReviewStore();

  return (
    <div className="h-full flex flex-col">
      {mode === 'select' && (
        <>
          <ReviewHistory />
          <ArticleSelector />
        </>
      )}
      {mode === 'generating' && <GeneratingView />}
      {mode === 'view' && currentReview && <ReviewView review={currentReview} />}
    </div>
  );
}
