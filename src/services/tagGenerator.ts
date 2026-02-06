/**
 * AI 标签生成服务
 * 根据文章内容和摘要自动生成层级标签
 */

import type { ExtractedContent, SmartSummary } from '@/types';

/**
 * AI 生成的标签结果
 */
export interface GeneratedTag {
  path: string;           // 层级路径，如 "技术/AI/机器学习"
  confidence: number;     // 置信度 0-1
  reason?: string;        // 生成理由（可选）
}

/**
 * 构建标签生成的 prompt
 */
function buildTagPrompt(
  content: ExtractedContent,
  summary?: SmartSummary,
  language: 'zh' | 'en' = 'zh'
): { system: string; user: string } {
  const langInstruction = language === 'zh' 
    ? '请用中文生成标签。' 
    : 'Generate tags in English.';

  const system = `You are an expert knowledge organizer. ${langInstruction}

Your task is to generate hierarchical tags for an article to build a knowledge graph.

Guidelines:
1. Generate 3-6 tags with hierarchical paths (use "/" as separator)
2. Each path should have 1-3 levels of depth
3. Focus on:
   - Main topics and themes
   - Key concepts and technologies
   - Domain/field classification
   - Methodologies or approaches
4. Tags should be:
   - Specific enough to be useful for categorization
   - General enough to connect with other articles
   - Suitable for building knowledge graphs and finding structural holes

Output format (JSON array):
[
  { "path": "Category/Subcategory/Topic", "confidence": 0.95 },
  { "path": "Another/Path", "confidence": 0.8 }
]

Output ONLY valid JSON array, no markdown or explanation.`;

  // 提取纯文本
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content.content;
  const textContent = tempDiv.textContent || '';
  const truncatedContent = textContent.slice(0, 3000); // 限制长度

  let userMessage = `Article to tag:

Title: ${content.title}
Type: ${content.type}
Source: ${content.metadata.source}

Content excerpt:
${truncatedContent}`;

  // 如果有摘要，加入摘要信息
  if (summary) {
    userMessage += `

Summary:
- One-liner: ${summary.oneLiner}
- Main point: ${summary.coreInsights.mainPoint}
- Why it matters: ${summary.coreInsights.whyItMatters}`;
  }

  return { system, user: userMessage };
}

/**
 * 解析 AI 响应
 */
function parseTagResponse(responseText: string): GeneratedTag[] {
  let cleanText = responseText.trim();
  
  // 移除可能的 markdown 代码块
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  const parsed = JSON.parse(cleanText);
  
  if (!Array.isArray(parsed)) {
    throw new Error('响应不是数组');
  }

  return parsed.map(item => ({
    path: String(item.path || '').trim(),
    confidence: Number(item.confidence) || 0.5,
    reason: item.reason,
  })).filter(tag => tag.path.length > 0);
}

/**
 * 生成文章标签
 */
export async function generateArticleTags(
  apiKey: string,
  model: string,
  content: ExtractedContent,
  summary?: SmartSummary,
  language: 'zh' | 'en' | 'auto' = 'auto'
): Promise<GeneratedTag[]> {
  const resolvedLang = language === 'auto' 
    ? (content.metadata.language as 'zh' | 'en') 
    : language;
  
  const { system, user } = buildTagPrompt(content, summary, resolvedLang);

  // 通过 background 发送请求
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'OPENROUTER_REQUEST',
      apiKey,
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      options: {
        temperature: 0.3,
        max_tokens: 500,
      },
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response.success) {
        reject(new Error(response.error || '标签生成失败'));
        return;
      }

      try {
        const responseText = response.data?.choices?.[0]?.message?.content;
        if (!responseText) {
          reject(new Error('AI 未返回内容'));
          return;
        }

        const tags = parseTagResponse(responseText);
        resolve(tags);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('解析标签失败'));
      }
    });
  });
}

/**
 * 后台生成标签并保存
 * 这个函数会在摘要生成完成后被调用
 */
export async function generateAndSaveArticleTags(
  apiKey: string,
  model: string,
  articleId: number,
  content: ExtractedContent,
  summary?: SmartSummary,
  language: 'zh' | 'en' | 'auto' = 'auto'
): Promise<void> {
  // 动态导入以避免循环依赖
  const { articleDB, articleTagDB } = await import('@/db');
  
  try {
    console.log('Generating tags for article:', articleId);
    
    // 生成标签
    const tags = await generateArticleTags(apiKey, model, content, summary, language);
    console.log('Generated tags:', tags);
    
    // 保存标签
    await articleTagDB.addTagsByPaths(
      articleId,
      tags.map(t => t.path),
      true, // isAIGenerated
      tags.map(t => t.confidence)
    );
    
    // 标记文章标签已生成
    const article = await articleDB.getById(articleId);
    if (article) {
      await articleDB.markTagsGenerated(article.url);
    }
    
    console.log('Tags saved successfully');
  } catch (error) {
    console.error('Failed to generate tags:', error);
    // 标签生成失败不应影响主流程，只记录错误
  }
}
