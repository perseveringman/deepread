/**
 * AI 阅读洞察服务
 * 基于阅读数据生成个性化洞察和建议
 */

import { streamOpenRouter, type OpenRouterMessage } from './openrouter';
import { getReadingDataForAI } from './statistics';

/**
 * AI 洞察结果
 */
export interface ReadingInsights {
  summary: string;                    // 总体评价
  patterns: string[];                 // 发现的阅读模式
  strengths: string[];                // 阅读优势
  suggestions: string[];              // 改进建议
  recommendedTopics: string[];        // 推荐探索的主题
  quote: string;                      // 一句话总结/鼓励
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(language: 'zh' | 'en' | 'auto'): string {
  const isZh = language === 'zh' || language === 'auto';
  const langName = isZh ? '中文' : 'English';

  return `You are an AI reading coach that analyzes reading habits and provides personalized insights.

Your task is to analyze the user's reading statistics and generate helpful insights in ${langName}.

Output Format (JSON):
{
  "summary": "总体阅读评价（2-3句话）",
  "patterns": [
    "发现的阅读模式1",
    "发现的阅读模式2"
  ],
  "strengths": [
    "阅读优势1",
    "阅读优势2"
  ],
  "suggestions": [
    "具体可行的改进建议1",
    "具体可行的改进建议2",
    "具体可行的改进建议3"
  ],
  "recommendedTopics": [
    "基于当前兴趣推荐探索的主题1",
    "基于当前兴趣推荐探索的主题2"
  ],
  "quote": "一句鼓励或总结的话"
}

Guidelines:
- Be encouraging but honest
- Make suggestions specific and actionable
- Base recommendations on actual reading patterns
- Consider reading diversity and depth
- Suggest topics that complement existing interests
- Keep each point concise (1-2 sentences max)
- Output ONLY valid JSON, no markdown or additional text`;
}

/**
 * 解析 AI 响应
 */
function parseResponse(responseText: string): ReadingInsights {
  let jsonStr = responseText.trim();
  
  // 移除可能的 markdown 代码块
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    
    return {
      summary: parsed.summary || '暂无分析',
      patterns: parsed.patterns || [],
      strengths: parsed.strengths || [],
      suggestions: parsed.suggestions || [],
      recommendedTopics: parsed.recommendedTopics || [],
      quote: parsed.quote || '',
    };
  } catch (error) {
    throw new Error(`无法解析 AI 响应: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 生成阅读洞察（流式）
 */
export function generateReadingInsights(
  apiKey: string,
  model: string,
  language: 'zh' | 'en' | 'auto' = 'auto',
  onProgress: (text: string) => void,
  onComplete: (insights: ReadingInsights) => void,
  onError: (error: string) => void
): () => void {
  // 先获取阅读数据
  getReadingDataForAI().then(readingData => {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(language),
      },
      {
        role: 'user',
        content: `请分析以下阅读数据并给出洞察：\n\n${readingData}`,
      },
    ];

    let fullResponse = '';

    const cancel = streamOpenRouter(
      apiKey,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      },
      (chunk) => {
        fullResponse += chunk;
        onProgress(fullResponse);
      },
      () => {
        try {
          const insights = parseResponse(fullResponse);
          onComplete(insights);
        } catch (error) {
          onError(error instanceof Error ? error.message : '解析响应失败');
        }
      },
      onError
    );

    // 存储取消函数以便后续调用
    cancelFunc = cancel;
  }).catch(error => {
    onError(error instanceof Error ? error.message : '获取阅读数据失败');
  });

  // 返回取消函数
  let cancelFunc: (() => void) | null = null;
  return () => {
    if (cancelFunc) {
      cancelFunc();
    }
  };
}

/**
 * 获取快速洞察（不调用 AI，基于规则生成）
 */
export function getQuickInsights(stats: {
  articleCount: number;
  totalWordCount: number;
  summarizedCount: number;
  avgWordsPerArticle: number;
  topTags: string[];
  comparison?: { articleCountChange: number };
}): string[] {
  const insights: string[] = [];
  
  // 阅读量评价
  if (stats.articleCount >= 20) {
    insights.push('阅读量很高！保持这样的阅读习惯');
  } else if (stats.articleCount >= 10) {
    insights.push('阅读量不错，继续加油');
  } else if (stats.articleCount > 0) {
    insights.push('可以尝试增加阅读量，每天读一篇文章');
  }
  
  // 摘要使用率
  if (stats.articleCount > 0) {
    const summaryRate = stats.summarizedCount / stats.articleCount;
    if (summaryRate >= 0.8) {
      insights.push('摘要使用率很高，充分利用了 AI 功能');
    } else if (summaryRate < 0.3) {
      insights.push('试试用 AI 生成摘要，帮助提炼文章要点');
    }
  }
  
  // 文章深度
  if (stats.avgWordsPerArticle > 3000) {
    insights.push('偏好长文阅读，阅读深度不错');
  } else if (stats.avgWordsPerArticle < 1000) {
    insights.push('可以尝试一些深度长文，提升知识密度');
  }
  
  // 阅读趋势
  if (stats.comparison) {
    if (stats.comparison.articleCountChange > 20) {
      insights.push('阅读量明显提升，进步很大！');
    } else if (stats.comparison.articleCountChange < -20) {
      insights.push('阅读量有所下降，注意保持阅读习惯');
    }
  }
  
  // 标签多样性
  if (stats.topTags.length >= 5) {
    insights.push('阅读领域较广泛，知识面不错');
  } else if (stats.topTags.length <= 2 && stats.topTags.length > 0) {
    insights.push('可以尝试探索新的领域，拓宽视野');
  }
  
  return insights;
}
