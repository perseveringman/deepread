/**
 * 智能摘要生成服务
 */

import { callOpenRouter, type OpenRouterMessage } from './openrouter';
import type { ExtractedContent, SmartSummary } from '@/types';

/**
 * 生成摘要的 System Prompt
 */
function buildSystemPrompt(language: 'zh' | 'en' | 'auto', detectedLanguage: string): string {
  const outputLanguage = language === 'auto' ? detectedLanguage : language;
  const langName = outputLanguage === 'zh' ? '中文' : 'English';

  return `You are an expert reading assistant that creates smart summaries of articles.

Your task is to analyze the given article and generate a structured summary in ${langName}.

Output Format (JSON):
{
  "oneLiner": "A single sentence capturing the essence (max 100 chars)",
  "coreInsights": {
    "mainPoint": "The central argument or finding (2-3 sentences)",
    "whyItMatters": "Why this is important or relevant (2-3 sentences)",
    "howToApply": "Practical takeaways or actions (2-3 sentences)"
  },
  "evidenceStrength": {
    "level": "strong|moderate|weak|opinion",
    "reasoning": "Brief explanation of evidence quality (1-2 sentences)"
  },
  "detailedSummary": {
    "sections": [
      {
        "heading": "Section title",
        "summary": "Section summary (2-3 sentences)",
        "keyQuotes": ["Notable quote 1", "Notable quote 2"]
      }
    ]
  },
  "thoughtTriggers": {
    "applicationPrompt": "A question to help apply this knowledge",
    "conflictPrompt": "A question challenging the main argument",
    "relatedQuestions": ["Follow-up question 1", "Follow-up question 2"]
  }
}

Guidelines:
- Be concise but comprehensive
- Focus on actionable insights
- Identify the evidence strength honestly
- Extract 2-4 key sections from the article
- Include 1-2 notable quotes per section if available
- Output ONLY valid JSON, no markdown or additional text`;
}

/**
 * 生成用户消息
 */
function buildUserMessage(content: ExtractedContent): string {
  // 从 HTML 中提取纯文本
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content.content;
  const textContent = tempDiv.textContent || '';

  return `Please summarize this ${content.type} article:

Title: ${content.title}
${content.author ? `Author: ${content.author}` : ''}
${content.publishDate ? `Date: ${content.publishDate}` : ''}
Source: ${content.metadata.source}
Word Count: ${content.metadata.wordCount}

Content:
${textContent}`;
}

/**
 * 解析 AI 响应为 SmartSummary
 */
function parseResponse(responseText: string): SmartSummary {
  // 尝试提取 JSON（处理可能的 markdown 代码块）
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
    
    // 验证必要字段
    if (!parsed.oneLiner || !parsed.coreInsights || !parsed.evidenceStrength) {
      throw new Error('缺少必要字段');
    }

    return {
      oneLiner: parsed.oneLiner,
      coreInsights: {
        mainPoint: parsed.coreInsights.mainPoint || '',
        whyItMatters: parsed.coreInsights.whyItMatters || '',
        howToApply: parsed.coreInsights.howToApply || '',
      },
      evidenceStrength: {
        level: parsed.evidenceStrength.level || 'opinion',
        reasoning: parsed.evidenceStrength.reasoning || '',
      },
      detailedSummary: {
        sections: parsed.detailedSummary?.sections || [],
      },
      thoughtTriggers: parsed.thoughtTriggers,
    };
  } catch (error) {
    throw new Error(`无法解析 AI 响应: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 生成智能摘要
 */
export async function generateSummary(
  apiKey: string,
  model: string,
  content: ExtractedContent,
  language: 'zh' | 'en' | 'auto' = 'auto'
): Promise<SmartSummary> {
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(language, content.metadata.language),
    },
    {
      role: 'user',
      content: buildUserMessage(content),
    },
  ];

  const response = await callOpenRouter(apiKey, {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 2000,
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('AI 未返回任何内容');
  }

  return parseResponse(responseText);
}
