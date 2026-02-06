/**
 * 文献综述生成服务
 * 多篇文章对比分析，生成学术文献综述风格的报告
 */

import { streamOpenRouter, type OpenRouterMessage } from './openrouter';
import type { LiteratureReview } from '@/types';
import type { ArticleRecord } from '@/db';

/**
 * 构建系统提示词
 */
function buildSystemPrompt(language: 'zh' | 'en' | 'auto'): string {
  const isZh = language === 'zh' || language === 'auto';
  const langName = isZh ? '中文' : 'English';

  return `You are an expert academic researcher specialized in literature review synthesis.

Your task is to analyze multiple articles and generate a comprehensive literature review in ${langName}.

Output Format (JSON):
{
  "title": "综述标题 / Review Title",
  "coreFindings": {
    "mainThemes": ["主题1", "主题2", "主题3"],
    "keyArguments": [
      {
        "argument": "核心论点描述",
        "supportingArticles": [1, 2]
      }
    ]
  },
  "consensus": {
    "agreements": [
      {
        "point": "共识点描述",
        "articleIds": [1, 2, 3]
      }
    ],
    "disagreements": [
      {
        "topic": "分歧主题",
        "positions": [
          {
            "stance": "观点A描述",
            "articleIds": [1, 3]
          },
          {
            "stance": "观点B描述",
            "articleIds": [2]
          }
        ]
      }
    ]
  },
  "knowledgeGaps": [
    {
      "gap": "知识空白描述",
      "implication": "研究意义/未来方向"
    }
  ],
  "furtherReading": [
    {
      "topic": "推荐阅读主题",
      "reason": "推荐原因",
      "keywords": ["关键词1", "关键词2"]
    }
  ],
  "conclusion": "综合结论，2-3段落，总结主要发现和启示"
}

Guidelines:
- Identify common themes across all articles
- Highlight where authors agree and disagree
- Note methodological differences if apparent
- Identify gaps in the collective knowledge
- Suggest areas for further reading/research
- Use article index numbers (1-based) to reference articles
- Be objective and balanced in synthesis
- Output ONLY valid JSON, no markdown or additional text`;
}

/**
 * 构建用户消息（包含所有文章内容）
 */
function buildUserMessage(articles: ArticleRecord[]): string {
  const articleSections = articles.map((article, index) => {
    // 从 HTML 中提取纯文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.extractedContent.content;
    const textContent = tempDiv.textContent || '';
    
    // 截取前 3000 字符以控制 token 使用
    const truncatedContent = textContent.slice(0, 3000);
    const isTruncated = textContent.length > 3000;

    // 包含已有的摘要信息（如果有）
    let summarySection = '';
    if (article.summary) {
      summarySection = `
AI Summary: ${article.summary.oneLiner}
Main Point: ${article.summary.coreInsights?.mainPoint || 'N/A'}
Evidence Strength: ${article.summary.evidenceStrength?.level || 'N/A'}`;
    }

    return `
=== ARTICLE ${index + 1} ===
Title: ${article.title}
Author: ${article.extractedContent.author || 'Unknown'}
Date: ${article.extractedContent.publishDate || 'Unknown'}
Source: ${article.extractedContent.metadata.source}
Type: ${article.extractedContent.type}
Word Count: ${article.extractedContent.metadata.wordCount}
${summarySection}

Content${isTruncated ? ' (truncated)' : ''}:
${truncatedContent}
${isTruncated ? '\n[Content truncated for brevity...]' : ''}
`;
  });

  return `Please analyze the following ${articles.length} articles and generate a comprehensive literature review:

${articleSections.join('\n')}

Remember:
- Reference articles by their index numbers (1, 2, 3, etc.)
- Synthesize, don't just summarize each article
- Identify patterns, agreements, and disagreements
- Be analytical and objective`;
}

/**
 * 解析 AI 响应为 LiteratureReview
 */
function parseResponse(responseText: string, articleIds: number[]): Omit<LiteratureReview, 'id' | 'createdAt'> {
  // 尝试提取 JSON
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
    
    // 将 AI 返回的文章索引（1-based）转换为实际的文章 ID
    const mapArticleIndices = (indices: number[]): number[] => {
      return indices
        .filter(i => i >= 1 && i <= articleIds.length)
        .map(i => articleIds[i - 1]);
    };

    return {
      title: parsed.title || '文献综述',
      articleIds,
      coreFindings: {
        mainThemes: parsed.coreFindings?.mainThemes || [],
        keyArguments: (parsed.coreFindings?.keyArguments || []).map((arg: { argument: string; supportingArticles: number[] }) => ({
          argument: arg.argument,
          supportingArticles: mapArticleIndices(arg.supportingArticles || []),
        })),
      },
      consensus: {
        agreements: (parsed.consensus?.agreements || []).map((a: { point: string; articleIds: number[] }) => ({
          point: a.point,
          articleIds: mapArticleIndices(a.articleIds || []),
        })),
        disagreements: (parsed.consensus?.disagreements || []).map((d: { topic: string; positions: Array<{ stance: string; articleIds: number[] }> }) => ({
          topic: d.topic,
          positions: (d.positions || []).map((p: { stance: string; articleIds: number[] }) => ({
            stance: p.stance,
            articleIds: mapArticleIndices(p.articleIds || []),
          })),
        })),
      },
      knowledgeGaps: parsed.knowledgeGaps || [],
      furtherReading: parsed.furtherReading || [],
      conclusion: parsed.conclusion || '',
    };
  } catch (error) {
    throw new Error(`无法解析 AI 响应: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 生成文献综述（流式）
 */
export function generateLiteratureReview(
  apiKey: string,
  model: string,
  articles: ArticleRecord[],
  language: 'zh' | 'en' | 'auto' = 'auto',
  onProgress: (text: string) => void,
  onComplete: (review: Omit<LiteratureReview, 'id' | 'createdAt'>) => void,
  onError: (error: string) => void
): () => void {
  if (articles.length < 2) {
    onError('至少需要选择 2 篇文章进行综述');
    return () => {};
  }

  if (articles.length > 20) {
    onError('最多支持 20 篇文章进行综述');
    return () => {};
  }

  const articleIds = articles.map(a => a.id!);
  
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(language),
    },
    {
      role: 'user',
      content: buildUserMessage(articles),
    },
  ];

  let fullResponse = '';

  return streamOpenRouter(
    apiKey,
    {
      model,
      messages,
      temperature: 0.4,
      max_tokens: 4000,
    },
    (chunk) => {
      fullResponse += chunk;
      onProgress(fullResponse);
    },
    () => {
      try {
        const review = parseResponse(fullResponse, articleIds);
        onComplete(review);
      } catch (error) {
        onError(error instanceof Error ? error.message : '解析响应失败');
      }
    },
    onError
  );
}

/**
 * 计算预估 token 使用量
 */
export function estimateTokenUsage(articles: ArticleRecord[]): number {
  let totalChars = 0;
  
  for (const article of articles) {
    // 计算内容字符数（截取前3000字）
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.extractedContent.content;
    const textContent = tempDiv.textContent || '';
    totalChars += Math.min(textContent.length, 3000);
    
    // 加上元数据字符数
    totalChars += article.title.length;
    totalChars += (article.extractedContent.author || '').length;
    totalChars += 200; // 固定开销
    
    // 加上摘要字符数（如果有）
    if (article.summary) {
      totalChars += article.summary.oneLiner.length;
      totalChars += (article.summary.coreInsights?.mainPoint || '').length;
    }
  }
  
  // 加上系统提示词估算
  totalChars += 1500;
  
  // 粗略估算：1 token ≈ 4 字符（英文）或 1.5 字符（中文）
  // 取保守估计
  return Math.ceil(totalChars / 2);
}
