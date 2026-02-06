/**
 * 阅读统计报告组件
 * 包含数据卡片、热力图、标签分布、趋势图、AI洞察
 */

import { useEffect, useMemo } from 'react';
import { useStatisticsStore } from '@/store/statisticsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useI18n } from '@/i18n';
import type { TimeRange, HeatmapData, TagStats, DailyStats } from '@/services/statistics';

/**
 * 时间范围选择器
 */
function TimeRangeSelector() {
  const { t } = useI18n();
  const { timeRange, setTimeRange } = useStatisticsStore();
  
  const options: { value: TimeRange; label: string }[] = [
    { value: 'week', label: t.statistics?.week || '本周' },
    { value: 'month', label: t.statistics?.month || '本月' },
    { value: 'all', label: t.statistics?.all || '全部' },
  ];
  
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => setTimeRange(option.value)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            timeRange === option.value
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 统计数据卡片
 */
function StatCard({ 
  label, 
  value, 
  subValue,
  change,
  icon 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  change?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
          {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 热力图组件（类似 GitHub 贡献图）
 */
function Heatmap({ data }: { data: HeatmapData[] }) {
  const { t } = useI18n();
  
  // 按周分组
  const weeks = useMemo(() => {
    const result: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = [];
    
    // 找到第一个周日开始
    const firstDate = new Date(data[0]?.date || '');
    const startPadding = firstDate.getDay();
    
    // 添加空白填充
    for (let i = 0; i < startPadding; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 });
    }
    
    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }
    
    return result;
  }, [data]);
  
  const levelColors = [
    'bg-gray-100',      // 0
    'bg-green-200',     // 1
    'bg-green-300',     // 2
    'bg-green-400',     // 3
    'bg-green-600',     // 4
  ];
  
  // 月份标签
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const validDay = week.find(d => d.date);
      if (validDay) {
        const date = new Date(validDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: date.toLocaleDateString('zh-CN', { month: 'short' }),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [weeks]);
  
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t.statistics?.heatmap || '阅读热力图'}
      </h3>
      
      {/* 月份标签 */}
      <div className="flex mb-1 text-[10px] text-gray-400 ml-6">
        {monthLabels.map(({ label, weekIndex }) => (
          <div 
            key={`${label}-${weekIndex}`} 
            style={{ marginLeft: weekIndex === 0 ? 0 : `${(weekIndex - (monthLabels.indexOf({ label, weekIndex }) > 0 ? monthLabels[monthLabels.indexOf({ label, weekIndex }) - 1].weekIndex : 0) - 1) * 12}px` }}
          >
            {label}
          </div>
        ))}
      </div>
      
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {/* 星期标签 */}
        <div className="flex flex-col gap-0.5 text-[10px] text-gray-400 mr-1">
          <div className="h-[10px]"></div>
          <div className="h-[10px] leading-[10px]">一</div>
          <div className="h-[10px]"></div>
          <div className="h-[10px] leading-[10px]">三</div>
          <div className="h-[10px]"></div>
          <div className="h-[10px] leading-[10px]">五</div>
          <div className="h-[10px]"></div>
        </div>
        
        {/* 热力格子 */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`w-[10px] h-[10px] rounded-sm ${day.date ? levelColors[day.level] : 'bg-transparent'}`}
                title={day.date ? `${day.date}: ${day.count} 篇` : ''}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* 图例 */}
      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
        <span>{t.statistics?.less || '少'}</span>
        {levelColors.map((color, i) => (
          <div key={i} className={`w-[10px] h-[10px] rounded-sm ${color}`} />
        ))}
        <span>{t.statistics?.more || '多'}</span>
      </div>
    </div>
  );
}

/**
 * 标签分布图
 */
function TagDistribution({ tags }: { tags: TagStats[] }) {
  const { t } = useI18n();
  
  if (tags.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t.statistics?.tagDistribution || '标签分布'}
        </h3>
        <p className="text-sm text-gray-400">{t.statistics?.noTags || '暂无标签数据'}</p>
      </div>
    );
  }
  
  const maxCount = Math.max(...tags.map(t => t.count));
  
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t.statistics?.tagDistribution || '标签分布'}
      </h3>
      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.tag.id} className="flex items-center gap-2">
            <span className="w-20 text-xs text-gray-600 truncate" title={tag.tag.path}>
              {tag.tag.name}
            </span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${(tag.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12 text-right">
              {tag.count} ({tag.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 阅读趋势图（简易柱状图）
 */
function TrendChart({ data }: { data: DailyStats[] }) {
  const { t } = useI18n();
  
  // 取最近的数据
  const recentData = data.slice(-14);
  const maxCount = Math.max(...recentData.map(d => d.count), 1);
  
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t.statistics?.trend || '阅读趋势'}
      </h3>
      <div className="flex items-end gap-1 h-20">
        {recentData.map((day) => (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div 
              className="w-full bg-primary-400 rounded-t transition-all hover:bg-primary-500"
              style={{ 
                height: `${(day.count / maxCount) * 100}%`,
                minHeight: day.count > 0 ? '4px' : '0'
              }}
              title={`${day.date}: ${day.count} 篇`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>{recentData[0]?.date.slice(5)}</span>
        <span>{recentData[recentData.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/**
 * 快速洞察卡片
 */
function QuickInsights({ insights }: { insights: string[] }) {
  const { t } = useI18n();
  
  if (insights.length === 0) return null;
  
  return (
    <div className="card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {t.statistics?.quickInsights || '快速洞察'}
      </h3>
      <ul className="space-y-1">
        {insights.map((insight, i) => (
          <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * AI 洞察面板
 */
function AIInsightsPanel() {
  const { t } = useI18n();
  const { apiKey, model, language } = useSettingsStore();
  const { 
    insights, 
    generatingInsights, 
    insightsProgress, 
    insightsError,
    generateInsights,
    cancelGenerateInsights,
  } = useStatisticsStore();
  
  const handleGenerate = () => {
    if (!apiKey) {
      alert(t.statistics?.noApiKey || '请先配置 API Key');
      return;
    }
    generateInsights(apiKey, model, language);
  };
  
  // 生成中
  if (generatingInsights) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            {t.statistics?.generatingInsights || '正在生成 AI 洞察...'}
          </h3>
          <button
            onClick={cancelGenerateInsights}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {t.common.cancel}
          </button>
        </div>
        <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
          {insightsProgress || t.statistics?.waitingAI || '等待 AI 响应...'}
        </pre>
      </div>
    );
  }
  
  // 已有洞察
  if (insights) {
    return (
      <div className="card p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t.statistics?.aiInsights || 'AI 阅读洞察'}
          </h3>
          <button
            onClick={handleGenerate}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            {t.statistics?.regenerate || '重新生成'}
          </button>
        </div>
        
        {/* 总结 */}
        <p className="text-sm text-purple-900 mb-3">{insights.summary}</p>
        
        {/* 阅读模式 */}
        {insights.patterns.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-purple-700 mb-1">{t.statistics?.patterns || '阅读模式'}</p>
            <div className="flex flex-wrap gap-1">
              {insights.patterns.map((p, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* 建议 */}
        {insights.suggestions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-purple-700 mb-1">{t.statistics?.suggestions || '改进建议'}</p>
            <ul className="space-y-1">
              {insights.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-purple-800 flex items-start gap-1">
                  <span className="text-purple-400">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 推荐主题 */}
        {insights.recommendedTopics.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-purple-700 mb-1">{t.statistics?.recommendedTopics || '推荐探索'}</p>
            <div className="flex flex-wrap gap-1">
              {insights.recommendedTopics.map((topic, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* 引言 */}
        {insights.quote && (
          <p className="text-xs text-purple-600 italic border-l-2 border-purple-300 pl-2 mt-3">
            "{insights.quote}"
          </p>
        )}
      </div>
    );
  }
  
  // 未生成
  return (
    <div className="card p-4 border-dashed">
      <div className="text-center">
        <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm text-gray-500 mb-3">{t.statistics?.getAIInsights || '获取 AI 个性化阅读洞察'}</p>
        {insightsError && (
          <p className="text-xs text-red-500 mb-2">{insightsError}</p>
        )}
        <button
          onClick={handleGenerate}
          className="btn-primary text-sm"
        >
          {t.statistics?.generateInsights || '生成 AI 洞察'}
        </button>
      </div>
    </div>
  );
}

/**
 * 统计报告主组件
 */
export function Statistics() {
  const { t } = useI18n();
  const { 
    statistics, 
    loadingStats, 
    statsError,
    quickInsights,
    loadStatistics,
  } = useStatisticsStore();
  
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);
  
  if (loadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t.common.loading}</div>
      </div>
    );
  }
  
  if (statsError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{statsError}</p>
      </div>
    );
  }
  
  if (!statistics) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{t.statistics?.noData || '暂无数据'}</p>
      </div>
    );
  }
  
  const { basic, comparison, daily, tags, heatmap } = statistics;
  
  return (
    <div className="space-y-4">
      {/* 时间范围选择 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">
          {t.statistics?.title || '阅读统计'}
        </h2>
        <TimeRangeSelector />
      </div>
      
      {/* 基础数据卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t.statistics?.articles || '阅读篇数'}
          value={basic.articleCount}
          change={comparison?.articleCountChange}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard
          label={t.statistics?.totalWords || '总字数'}
          value={basic.totalWordCount >= 10000 
            ? `${(basic.totalWordCount / 10000).toFixed(1)}万` 
            : basic.totalWordCount.toLocaleString()}
          subValue={`${t.statistics?.avgPerArticle || '平均'} ${basic.avgWordsPerArticle} 字`}
          change={comparison?.wordCountChange}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label={t.statistics?.readTime || '阅读时长'}
          value={`${basic.totalReadTime} ${t.content?.minutes || '分钟'}`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label={t.statistics?.summarized || '已摘要'}
          value={basic.summarizedCount}
          subValue={basic.articleCount > 0 
            ? `${Math.round((basic.summarizedCount / basic.articleCount) * 100)}%` 
            : ''}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
      </div>
      
      {/* 快速洞察 */}
      <QuickInsights insights={quickInsights} />
      
      {/* 热力图 */}
      <Heatmap data={heatmap} />
      
      {/* 趋势图和标签分布 */}
      <div className="grid grid-cols-1 gap-4">
        <TrendChart data={daily} />
        <TagDistribution tags={tags} />
      </div>
      
      {/* AI 洞察 */}
      <AIInsightsPanel />
    </div>
  );
}
