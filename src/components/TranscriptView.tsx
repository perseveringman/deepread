/**
 * YouTube 字幕视图组件
 * 支持双视图模式：阅读模式（纯文本）和时间戳模式（可点击跳转）
 */

import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n';
import type { TranscriptSegment } from '@/types';
import { formatTimestamp } from '@/services/youtubeExtractor';

type ViewMode = 'reading' | 'timestamp';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  videoId: string;
  onTimestampClick?: (seconds: number) => void;
}

/**
 * 视图切换按钮
 */
function ViewToggle({ 
  mode, 
  onChange 
}: { 
  mode: ViewMode; 
  onChange: (mode: ViewMode) => void;
}) {
  const { t } = useI18n();
  
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-chrome-surface-hover rounded-lg p-1">
      <button
        onClick={() => onChange('reading')}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
          mode === 'reading'
            ? 'bg-white dark:bg-chrome-surface text-primary-600 shadow-sm'
            : 'text-gray-500 dark:text-chrome-text-secondary hover:text-gray-700 dark:hover:text-chrome-text'
        }`}
        title={t.youtube?.readingMode || '阅读模式'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span className="hidden sm:inline">{t.youtube?.readingMode || '阅读'}</span>
      </button>
      <button
        onClick={() => onChange('timestamp')}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
          mode === 'timestamp'
            ? 'bg-white dark:bg-chrome-surface text-primary-600 shadow-sm'
            : 'text-gray-500 dark:text-chrome-text-secondary hover:text-gray-700 dark:hover:text-chrome-text'
        }`}
        title={t.youtube?.timestampMode || '时间戳模式'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">{t.youtube?.timestampMode || '时间戳'}</span>
      </button>
    </div>
  );
}

/**
 * 阅读视图 - 纯文本流
 */
function ReadingView({ segments }: { segments: TranscriptSegment[] }) {
  // 将字幕合并为段落，按句号/问号/感叹号分段
  const paragraphs = useMemo(() => {
    const fullText = segments.map(seg => seg.text).join(' ');
    // 按句子分段，保留标点
    const sentences = fullText.split(/(?<=[.。！？!?])\s+/);
    
    // 每 3-5 句合并为一个段落
    const result: string[] = [];
    let currentParagraph: string[] = [];
    
    sentences.forEach((sentence, index) => {
      currentParagraph.push(sentence);
      // 每 4 句或最后一句时形成段落
      if (currentParagraph.length >= 4 || index === sentences.length - 1) {
        result.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    });
    
    return result;
  }, [segments]);

  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-chrome-text-secondary leading-relaxed">
      {paragraphs.map((para, index) => (
        <p key={index}>{para}</p>
      ))}
    </div>
  );
}

/**
 * 时间戳项
 */
function TimestampItem({ 
  segment, 
  onClick 
}: { 
  segment: TranscriptSegment;
  onClick: () => void;
}) {
  return (
    <div 
      className="flex gap-3 py-2 hover:bg-gray-50 dark:hover:bg-chrome-surface-hover rounded-lg px-2 -mx-2 cursor-pointer group transition-colors"
      onClick={onClick}
    >
      <button 
        className="flex-shrink-0 text-xs font-mono text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
        title="点击跳转到此位置"
      >
        {formatTimestamp(segment.startTime)}
      </button>
      <span className="text-sm text-gray-700 dark:text-chrome-text-secondary group-hover:text-gray-900 dark:group-hover:text-chrome-text">
        {segment.text}
      </span>
    </div>
  );
}

/**
 * 时间戳视图 - 带时间戳的列表
 */
function TimestampView({ 
  segments, 
  onTimestampClick 
}: { 
  segments: TranscriptSegment[];
  onTimestampClick: (seconds: number) => void;
}) {
  return (
    <div className="space-y-1">
      {segments.map((segment, index) => (
        <TimestampItem
          key={index}
          segment={segment}
          onClick={() => onTimestampClick(segment.startTime)}
        />
      ))}
    </div>
  );
}

/**
 * 字幕视图主组件
 */
export function TranscriptView({ 
  segments, 
  videoId,
  onTimestampClick 
}: TranscriptViewProps) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('reading');

  // 处理时间戳点击
  const handleTimestampClick = async (seconds: number) => {
    if (onTimestampClick) {
      onTimestampClick(seconds);
      return;
    }

    // 默认行为：通过 content script 控制视频
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'YOUTUBE_SEEK',
          payload: { seconds }
        });
      }
    } catch (error) {
      // 回退：打开带时间戳的 URL
      const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}`;
      window.open(url, '_blank');
    }
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="card p-4">
        <p className="text-gray-500 dark:text-chrome-text-secondary text-sm">
          {t.youtube?.noTranscript || '没有可用的字幕'}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      {/* 头部：标题和视图切换 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-chrome-text-secondary">
          {t.youtube?.transcript || '视频字幕'}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-chrome-text-tertiary">
            ({segments.length} {t.youtube?.segments || '段'})
          </span>
        </h2>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* 内容区域 */}
      <div className="max-h-96 overflow-y-auto">
        {viewMode === 'reading' ? (
          <ReadingView segments={segments} />
        ) : (
          <TimestampView 
            segments={segments} 
            onTimestampClick={handleTimestampClick}
          />
        )}
      </div>
    </div>
  );
}

/**
 * YouTube 视频信息卡片
 */
export function YouTubeInfoCard({ 
  title,
  channelName,
  duration,
  language,
}: {
  title: string;
  channelName: string;
  duration: number;
  language: string;
}) {
  const { t } = useI18n();
  
  return (
    <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <div className="flex items-start gap-3">
        {/* YouTube 图标 */}
        <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-medium rounded">
              {t.youtube?.video || 'YouTube 视频'}
            </span>
            <span className="text-xs text-gray-500 dark:text-chrome-text-tertiary">
              {language.toUpperCase()} {t.youtube?.subtitles || '字幕'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-chrome-text truncate" title={title}>
            {title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-chrome-text-secondary">
            <span>{channelName}</span>
            {duration > 0 && (
              <>
                <span>•</span>
                <span>{formatTimestamp(duration)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
