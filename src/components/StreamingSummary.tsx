/**
 * 摘要骨架屏和流式显示组件
 */

import { useI18n } from '@/i18n';
import { useArticleStore } from '@/store/articleStore';
import { SUMMARY_BLOCKS, BLOCK_NAMES, type SummaryBlock } from '@/services/streamingSummarizer';

// 骨架屏动画样式
const skeletonClass = "animate-pulse bg-gray-200 rounded";

/**
 * 单行骨架
 */
function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className={`${skeletonClass} h-4`} style={{ width }} />;
}

/**
 * 多行骨架
 */
function SkeletonParagraph({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine 
          key={i} 
          width={i === lines - 1 ? '70%' : '100%'} 
        />
      ))}
    </div>
  );
}

/**
 * 一句话总结骨架/内容
 */
function OneLinerBlock({ 
  isLoading, 
  isStreaming, 
  streamingText,
  content 
}: { 
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  content?: string;
}) {
  if (content) {
    return (
      <div className="card p-4 bg-primary-50 border-primary-200">
        <p className="text-primary-900 font-medium">{content}</p>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="card p-4 bg-primary-50 border-primary-200">
        <p className="text-primary-900 font-medium">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-primary-600 ml-0.5 animate-blink" />
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4 bg-gray-50 border-gray-200">
        <SkeletonLine width="80%" />
      </div>
    );
  }

  return null;
}

/**
 * 核心洞察骨架/内容
 */
function CoreInsightsBlock({ 
  isLoading, 
  isStreaming, 
  streamingText,
  content,
  t 
}: { 
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  content?: { mainPoint: string; whyItMatters: string; howToApply: string };
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (content) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.coreInsights}</h2>
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.mainPoint}</h3>
            <p className="text-sm text-gray-700 mt-1">{content.mainPoint}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.whyItMatters}</h3>
            <p className="text-sm text-gray-700 mt-1">{content.whyItMatters}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">{t.summary.howToApply}</h3>
            <p className="text-sm text-gray-700 mt-1">{content.howToApply}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.coreInsights}</h2>
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 animate-blink" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.coreInsights}</h2>
        <div className="space-y-4">
          {[t.summary.mainPoint, t.summary.whyItMatters, t.summary.howToApply].map((label) => (
            <div key={label}>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{label}</h3>
              <SkeletonParagraph lines={2} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 证据强度骨架/内容
 */
function EvidenceStrengthBlock({ 
  isLoading, 
  isStreaming, 
  streamingText,
  content,
  t 
}: { 
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  content?: { level: string; reasoning: string };
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (content) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.summary.evidenceStrength}</h2>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            content.level === 'strong' ? 'bg-green-100 text-green-700' :
            content.level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            content.level === 'weak' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {t.summary.evidenceLevels[content.level as keyof typeof t.summary.evidenceLevels] || content.level}
          </span>
          <span className="text-sm text-gray-600">{content.reasoning}</span>
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.summary.evidenceStrength}</h2>
        <div className="text-sm text-gray-600">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 animate-blink" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{t.summary.evidenceStrength}</h2>
        <div className="flex items-center gap-2">
          <div className={`${skeletonClass} h-6 w-16`} />
          <SkeletonLine width="60%" />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 详细摘要骨架/内容
 */
function DetailedSummaryBlock({ 
  isLoading, 
  isStreaming, 
  streamingText,
  content,
  t 
}: { 
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  content?: { sections: Array<{ heading: string; summary: string; keyQuotes?: string[] }> };
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (content && content.sections.length > 0) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.detailedSummary}</h2>
        <div className="space-y-4">
          {content.sections.map((section, index) => (
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
    );
  }

  if (isStreaming) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.detailedSummary}</h2>
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 animate-blink" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.detailedSummary}</h2>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <SkeletonLine width="40%" />
              <div className="mt-2">
                <SkeletonParagraph lines={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 延伸思考骨架/内容
 */
function ThoughtTriggersBlock({ 
  isLoading, 
  isStreaming, 
  streamingText,
  content,
  t 
}: { 
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  content?: { applicationPrompt: string; conflictPrompt: string; relatedQuestions: string[] };
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (content) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.thoughtTriggers}</h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{t.summary.applicationPrompt}:</span> {content.applicationPrompt}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{t.summary.conflictPrompt}:</span> {content.conflictPrompt}
          </p>
          {content.relatedQuestions.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">{t.summary.relatedQuestions}:</span>
              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                {content.relatedQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.thoughtTriggers}</h2>
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {streamingText}
          <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 animate-blink" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.summary.thoughtTriggers}</h2>
        <div className="space-y-2">
          <SkeletonParagraph lines={2} />
          <SkeletonParagraph lines={2} />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 进度指示器
 */
function ProgressIndicator({ 
  currentBlock, 
  lang,
}: { 
  currentBlock: SummaryBlock | null;
  lang: 'zh' | 'en';
}) {
  const currentIndex = currentBlock ? SUMMARY_BLOCKS.indexOf(currentBlock) + 1 : 0;
  const blockName = currentBlock ? BLOCK_NAMES[currentBlock][lang] : '';
  
  return (
    <div className="flex items-center gap-2 mb-4 text-sm">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
        <span className="text-primary-600 font-medium">
          {currentIndex}/{SUMMARY_BLOCKS.length}
        </span>
      </div>
      <span className="text-gray-500">{blockName}...</span>
    </div>
  );
}

/**
 * 流式摘要主组件
 */
export function StreamingSummary() {
  const { t, lang } = useI18n();
  const { summarizing, summary, streamingSummary } = useArticleStore();
  const { currentBlock, blockContent, streamingText } = streamingSummary;

  // 如果不在生成中且没有摘要，不显示
  if (!summarizing && !summary) {
    return null;
  }

  // 如果有完整摘要（已完成），直接显示完整摘要
  if (summary && !summarizing) {
    return (
      <div className="space-y-4">
        <OneLinerBlock 
          isLoading={false} 
          isStreaming={false} 
          streamingText="" 
          content={summary.oneLiner} 
        />
        <CoreInsightsBlock 
          isLoading={false} 
          isStreaming={false} 
          streamingText="" 
          content={summary.coreInsights} 
          t={t} 
        />
        <EvidenceStrengthBlock 
          isLoading={false} 
          isStreaming={false} 
          streamingText="" 
          content={summary.evidenceStrength} 
          t={t} 
        />
        {summary.detailedSummary.sections.length > 0 && (
          <DetailedSummaryBlock 
            isLoading={false} 
            isStreaming={false} 
            streamingText="" 
            content={summary.detailedSummary} 
            t={t} 
          />
        )}
        {summary.thoughtTriggers && (
          <ThoughtTriggersBlock 
            isLoading={false} 
            isStreaming={false} 
            streamingText="" 
            content={summary.thoughtTriggers} 
            t={t} 
          />
        )}
      </div>
    );
  }

  // 流式生成中
  const isBlockStreaming = (block: SummaryBlock) => currentBlock === block;
  const isBlockLoading = (block: SummaryBlock) => {
    const blockIndex = SUMMARY_BLOCKS.indexOf(block);
    const currentIndex = currentBlock ? SUMMARY_BLOCKS.indexOf(currentBlock) : -1;
    return blockIndex > currentIndex;
  };

  return (
    <div className="space-y-4">
      {/* 进度指示器 */}
      <ProgressIndicator 
        currentBlock={currentBlock} 
        lang={lang}
      />

      {/* 一句话总结 */}
      <OneLinerBlock 
        isLoading={isBlockLoading('oneLiner')} 
        isStreaming={isBlockStreaming('oneLiner')} 
        streamingText={currentBlock === 'oneLiner' ? streamingText : ''}
        content={blockContent.oneLiner} 
      />

      {/* 核心洞察 */}
      <CoreInsightsBlock 
        isLoading={isBlockLoading('coreInsights')} 
        isStreaming={isBlockStreaming('coreInsights')} 
        streamingText={currentBlock === 'coreInsights' ? streamingText : ''}
        content={blockContent.coreInsights} 
        t={t} 
      />

      {/* 证据强度 */}
      <EvidenceStrengthBlock 
        isLoading={isBlockLoading('evidenceStrength')} 
        isStreaming={isBlockStreaming('evidenceStrength')} 
        streamingText={currentBlock === 'evidenceStrength' ? streamingText : ''}
        content={blockContent.evidenceStrength} 
        t={t} 
      />

      {/* 详细摘要 */}
      <DetailedSummaryBlock 
        isLoading={isBlockLoading('detailedSummary')} 
        isStreaming={isBlockStreaming('detailedSummary')} 
        streamingText={currentBlock === 'detailedSummary' ? streamingText : ''}
        content={blockContent.detailedSummary} 
        t={t} 
      />

      {/* 延伸思考 */}
      <ThoughtTriggersBlock 
        isLoading={isBlockLoading('thoughtTriggers')} 
        isStreaming={isBlockStreaming('thoughtTriggers')} 
        streamingText={currentBlock === 'thoughtTriggers' ? streamingText : ''}
        content={blockContent.thoughtTriggers} 
        t={t} 
      />
    </div>
  );
}
