/**
 * 流式摘要生成服务
 * 将摘要拆分为5个区块，逐步流式生成
 */

import type { ExtractedContent, SmartSummary } from '@/types';

// 摘要区块类型
export type SummaryBlock = 
  | 'oneLiner'
  | 'coreInsights'
  | 'evidenceStrength'
  | 'detailedSummary'
  | 'thoughtTriggers';

// 区块生成顺序
export const SUMMARY_BLOCKS: SummaryBlock[] = [
  'oneLiner',
  'coreInsights',
  'evidenceStrength',
  'detailedSummary',
  'thoughtTriggers',
];

// 区块显示名称
export const BLOCK_NAMES: Record<SummaryBlock, { zh: string; en: string }> = {
  oneLiner: { zh: '一句话总结', en: 'One-liner' },
  coreInsights: { zh: '核心洞察', en: 'Core Insights' },
  evidenceStrength: { zh: '证据强度', en: 'Evidence Strength' },
  detailedSummary: { zh: '详细摘要', en: 'Detailed Summary' },
  thoughtTriggers: { zh: '延伸思考', en: 'Thought Triggers' },
};

// 流式摘要状态
export interface StreamingSummaryState {
  currentBlock: SummaryBlock | null;
  completedBlocks: SummaryBlock[];
  blockContent: Partial<SmartSummary>;
  streamingText: string;
  error: string | null;
}

// 初始状态
export const initialStreamingState: StreamingSummaryState = {
  currentBlock: null,
  completedBlocks: [],
  blockContent: {},
  streamingText: '',
  error: null,
};

/**
 * 获取文章上下文（用于所有区块的 prompt）
 */
function getArticleContext(content: ExtractedContent): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content.content;
  const textContent = tempDiv.textContent || '';
  
  return `Article Information:
Title: ${content.title}
${content.author ? `Author: ${content.author}` : ''}
${content.publishDate ? `Date: ${content.publishDate}` : ''}
Source: ${content.metadata.source}
Type: ${content.type}
Word Count: ${content.metadata.wordCount}

Content:
${textContent}`;
}

/**
 * 构建各区块的 prompt
 */
function buildBlockPrompt(
  block: SummaryBlock,
  language: 'zh' | 'en',
  articleContext: string,
  previousBlocks: Partial<SmartSummary>
): { system: string; user: string } {
  const langInstruction = language === 'zh' 
    ? '请用中文回答。' 
    : 'Please respond in English.';

  switch (block) {
    case 'oneLiner':
      return {
        system: `You are an expert reading assistant. ${langInstruction}
Generate a single sentence (max 100 characters) that captures the essence of the article.
Output ONLY the sentence itself, no quotes, no prefix, no explanation.`,
        user: articleContext,
      };

    case 'coreInsights':
      return {
        system: `You are an expert reading assistant. ${langInstruction}
Based on the article, provide core insights in this exact JSON format:
{
  "mainPoint": "The central argument or finding (2-3 sentences)",
  "whyItMatters": "Why this is important or relevant (2-3 sentences)",
  "howToApply": "Practical takeaways or actions (2-3 sentences)"
}
Output ONLY valid JSON, no markdown.`,
        user: `${articleContext}

One-liner summary for context: ${previousBlocks.oneLiner || ''}`,
      };

    case 'evidenceStrength':
      return {
        system: `You are an expert reading assistant. ${langInstruction}
Evaluate the evidence strength of the article in this exact JSON format:
{
  "level": "strong|moderate|weak|opinion",
  "reasoning": "Brief explanation of evidence quality (1-2 sentences)"
}
- "strong": Well-researched with multiple credible sources, data, or citations
- "moderate": Some evidence but limited sources or mostly anecdotal
- "weak": Little to no evidence, mostly claims without support
- "opinion": Clearly an opinion piece or editorial
Output ONLY valid JSON, no markdown.`,
        user: `${articleContext}

One-liner: ${previousBlocks.oneLiner || ''}
Core insights: ${JSON.stringify(previousBlocks.coreInsights || {})}`,
      };

    case 'detailedSummary':
      return {
        system: `You are an expert reading assistant. ${langInstruction}
Create a detailed summary of the article in this exact JSON format:
{
  "sections": [
    {
      "heading": "Section title",
      "summary": "Section summary (2-3 sentences)",
      "keyQuotes": ["Notable quote 1", "Notable quote 2"]
    }
  ]
}
- Create 2-4 sections based on the article's structure
- Include 1-2 key quotes per section if available
Output ONLY valid JSON, no markdown.`,
        user: articleContext,
      };

    case 'thoughtTriggers':
      return {
        system: `You are an expert reading assistant. ${langInstruction}
Generate thought-provoking questions based on the article in this exact JSON format:
{
  "applicationPrompt": "A question to help apply this knowledge practically",
  "conflictPrompt": "A question challenging or questioning the main argument",
  "relatedQuestions": ["Follow-up question 1", "Follow-up question 2"]
}
Output ONLY valid JSON, no markdown.`,
        user: `${articleContext}

One-liner: ${previousBlocks.oneLiner || ''}
Core insights: ${JSON.stringify(previousBlocks.coreInsights || {})}`,
      };
  }
}

/**
 * 解析区块响应
 */
function parseBlockResponse(block: SummaryBlock, text: string): Partial<SmartSummary> {
  // 清理可能的 markdown 代码块
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  switch (block) {
    case 'oneLiner':
      // oneLiner 是纯文本
      return { oneLiner: cleanText.replace(/^["']|["']$/g, '') };

    case 'coreInsights': {
      const parsed = JSON.parse(cleanText);
      return {
        coreInsights: {
          mainPoint: parsed.mainPoint || '',
          whyItMatters: parsed.whyItMatters || '',
          howToApply: parsed.howToApply || '',
        },
      };
    }

    case 'evidenceStrength': {
      const parsed = JSON.parse(cleanText);
      return {
        evidenceStrength: {
          level: parsed.level || 'opinion',
          reasoning: parsed.reasoning || '',
        },
      };
    }

    case 'detailedSummary': {
      const parsed = JSON.parse(cleanText);
      return {
        detailedSummary: {
          sections: parsed.sections || [],
        },
      };
    }

    case 'thoughtTriggers': {
      const parsed = JSON.parse(cleanText);
      return {
        thoughtTriggers: {
          applicationPrompt: parsed.applicationPrompt || '',
          conflictPrompt: parsed.conflictPrompt || '',
          relatedQuestions: parsed.relatedQuestions || [],
        },
      };
    }
  }
}

/**
 * 流式生成单个区块
 */
export function streamBlock(
  apiKey: string,
  model: string,
  block: SummaryBlock,
  content: ExtractedContent,
  previousBlocks: Partial<SmartSummary>,
  language: 'zh' | 'en' | 'auto',
  onChunk: (chunk: string, fullText: string) => void,
  onDone: (blockData: Partial<SmartSummary>) => void,
  onError: (error: string) => void
): () => void {
  const resolvedLanguage = language === 'auto' ? content.metadata.language as 'zh' | 'en' : language;
  const articleContext = getArticleContext(content);
  const { system, user } = buildBlockPrompt(block, resolvedLanguage, articleContext, previousBlocks);

  let fullText = '';
  let cancelled = false;

  // 建立流式连接
  const port = chrome.runtime.connect({ name: 'openrouter-stream' });

  port.onMessage.addListener((message) => {
    if (cancelled) return;

    if (message.type === 'chunk') {
      fullText += message.content;
      onChunk(message.content, fullText);
    } else if (message.type === 'done') {
      try {
        const blockData = parseBlockResponse(block, fullText);
        onDone(blockData);
      } catch (error) {
        onError(error instanceof Error ? error.message : '解析响应失败');
      }
      port.disconnect();
    } else if (message.type === 'error') {
      onError(message.error);
      port.disconnect();
    }
  });

  // 发送请求
  port.postMessage({
    type: 'start',
    apiKey,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    options: {
      temperature: 0.3,
      max_tokens: block === 'detailedSummary' ? 1500 : 500,
    },
  });

  // 返回取消函数
  return () => {
    cancelled = true;
    port.disconnect();
  };
}

/**
 * 流式生成完整摘要（所有区块）
 */
export function streamFullSummary(
  apiKey: string,
  model: string,
  content: ExtractedContent,
  language: 'zh' | 'en' | 'auto',
  onBlockStart: (block: SummaryBlock, index: number) => void,
  onBlockChunk: (block: SummaryBlock, chunk: string, fullText: string) => void,
  onBlockDone: (block: SummaryBlock, blockData: Partial<SmartSummary>) => void,
  onAllDone: (summary: SmartSummary) => void,
  onError: (error: string) => void
): () => void {
  let cancelled = false;
  let currentCancel: (() => void) | null = null;
  let currentBlockIndex = 0;
  const blockContent: Partial<SmartSummary> = {};

  const processNextBlock = () => {
    if (cancelled || currentBlockIndex >= SUMMARY_BLOCKS.length) {
      if (!cancelled && currentBlockIndex >= SUMMARY_BLOCKS.length) {
        // 所有区块完成
        onAllDone(blockContent as SmartSummary);
      }
      return;
    }

    const block = SUMMARY_BLOCKS[currentBlockIndex];
    onBlockStart(block, currentBlockIndex);

    currentCancel = streamBlock(
      apiKey,
      model,
      block,
      content,
      blockContent,
      language,
      (chunk, fullText) => {
        if (!cancelled) {
          onBlockChunk(block, chunk, fullText);
        }
      },
      (blockData) => {
        if (!cancelled) {
          Object.assign(blockContent, blockData);
          onBlockDone(block, blockData);
          currentBlockIndex++;
          processNextBlock();
        }
      },
      (error) => {
        if (!cancelled) {
          onError(error);
        }
      }
    );
  };

  // 开始处理第一个区块
  processNextBlock();

  // 返回取消函数
  return () => {
    cancelled = true;
    if (currentCancel) {
      currentCancel();
    }
  };
}
