/**
 * Obsidian Markdown Exporter Service
 * 生成带有 YAML frontmatter 的 Markdown 文件
 */

import type { ExtractedContent, SmartSummary, ChatMessage } from '../types';

export interface ExportOptions {
  includeSummary: boolean;
  includeChat: boolean;
  includeOriginalContent: boolean;
  includeMetadata: boolean;
}

export interface ExportResult {
  markdown: string;
  filename: string;
}

/**
 * 生成 YAML frontmatter
 */
function generateFrontmatter(
  content: ExtractedContent,
  summary?: SmartSummary
): string {
  const lines: string[] = ['---'];
  
  // 基础元数据
  lines.push(`title: "${escapeYamlString(content.title)}"`);
  lines.push(`source: "${content.metadata.source}"`);
  lines.push(`type: ${content.type}`);
  
  if (content.author) {
    lines.push(`author: "${escapeYamlString(content.author)}"`);
  }
  
  if (content.publishDate) {
    lines.push(`date: ${content.publishDate}`);
  }
  
  // 阅读元数据
  lines.push(`wordCount: ${content.metadata.wordCount}`);
  lines.push(`readTime: ${content.metadata.estimatedReadTime}`);
  lines.push(`language: ${content.metadata.language}`);
  
  // 证据强度标签
  if (summary?.evidenceStrength) {
    lines.push(`evidenceLevel: ${summary.evidenceStrength.level}`);
  }
  
  // 标签
  const tags: string[] = ['deepread', content.type];
  if (summary?.evidenceStrength) {
    tags.push(`evidence-${summary.evidenceStrength.level}`);
  }
  lines.push(`tags: [${tags.join(', ')}]`);
  
  // 导出时间
  lines.push(`exported: ${new Date().toISOString().split('T')[0]}`);
  
  lines.push('---');
  return lines.join('\n');
}

/**
 * 转义 YAML 字符串中的特殊字符
 */
function escapeYamlString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/**
 * 生成一句话总结部分
 */
function generateOneLiner(summary: SmartSummary): string {
  return `> [!abstract] 一句话总结\n> ${summary.oneLiner}\n`;
}

/**
 * 生成核心洞察部分
 */
function generateCoreInsights(summary: SmartSummary): string {
  const lines: string[] = [
    '## 核心洞察\n',
    '### 主要观点',
    summary.coreInsights.mainPoint,
    '',
    '### 为什么重要',
    summary.coreInsights.whyItMatters,
    '',
    '### 如何应用',
    summary.coreInsights.howToApply,
    ''
  ];
  return lines.join('\n');
}

/**
 * 生成证据评估部分
 */
function generateEvidenceStrength(summary: SmartSummary): string {
  const levelMap: Record<string, string> = {
    strong: '🟢 强',
    moderate: '🟡 中等',
    weak: '🟠 弱',
    opinion: '🔵 观点'
  };
  
  const level = summary.evidenceStrength.level;
  const lines: string[] = [
    '## 证据评估\n',
    `**强度**: ${levelMap[level] || level}`,
    '',
    `**分析**: ${summary.evidenceStrength.reasoning}`,
    ''
  ];
  return lines.join('\n');
}

/**
 * 生成详细摘要部分
 */
function generateDetailedSummary(summary: SmartSummary): string {
  const lines: string[] = ['## 详细摘要\n'];
  
  for (const section of summary.detailedSummary.sections) {
    lines.push(`### ${section.heading}`);
    lines.push(section.summary);
    
    if (section.keyQuotes && section.keyQuotes.length > 0) {
      lines.push('');
      lines.push('> [!quote] 关键引用');
      for (const quote of section.keyQuotes) {
        lines.push(`> - "${quote}"`);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 生成思考触发器部分
 */
function generateThoughtTriggers(summary: SmartSummary): string {
  if (!summary.thoughtTriggers) return '';
  
  const lines: string[] = [
    '## 思考触发器\n',
    '> [!tip] 应用思考',
    `> ${summary.thoughtTriggers.applicationPrompt}`,
    '',
    '> [!warning] 批判思考',
    `> ${summary.thoughtTriggers.conflictPrompt}`,
    '',
    '### 相关问题',
  ];
  
  for (const question of summary.thoughtTriggers.relatedQuestions) {
    lines.push(`- [ ] ${question}`);
  }
  lines.push('');
  
  return lines.join('\n');
}

/**
 * 生成对话记录部分
 */
function generateChatHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) return '';
  
  const lines: string[] = [
    '## 对话记录\n',
    '> [!info] 与 AI 的问答对话',
    ''
  ];
  
  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString('zh-CN');
    const role = msg.role === 'user' ? '**🧑 我**' : '**🤖 AI**';
    lines.push(`${role} _(${time})_`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 生成原文内容部分
 */
function generateOriginalContent(content: ExtractedContent): string {
  const lines: string[] = [
    '## 原文内容\n',
    '> [!note] 以下为原始文章内容',
    '',
    content.content,
    ''
  ];
  return lines.join('\n');
}

/**
 * 生成安全的文件名
 */
function generateFilename(title: string): string {
  // 移除或替换不安全的字符
  const safe = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
  
  return `${safe}.md`;
}

/**
 * 导出为 Obsidian Markdown
 */
export function exportToObsidian(
  content: ExtractedContent,
  summary?: SmartSummary,
  chatMessages: ChatMessage[] = [],
  options: ExportOptions = {
    includeSummary: true,
    includeChat: true,
    includeOriginalContent: false,
    includeMetadata: true
  }
): ExportResult {
  const parts: string[] = [];
  
  // 1. YAML frontmatter
  if (options.includeMetadata) {
    parts.push(generateFrontmatter(content, summary));
    parts.push('');
  }
  
  // 2. 标题
  parts.push(`# ${content.title}`);
  parts.push('');
  
  // 3. 来源信息
  const sourceInfo: string[] = [];
  if (content.author) sourceInfo.push(`作者: ${content.author}`);
  if (content.publishDate) sourceInfo.push(`日期: ${content.publishDate}`);
  sourceInfo.push(`来源: [原文链接](${content.metadata.source})`);
  sourceInfo.push(`阅读时间: 约 ${content.metadata.estimatedReadTime} 分钟`);
  parts.push(sourceInfo.join(' | '));
  parts.push('');
  
  // 4. 智能摘要
  if (options.includeSummary && summary) {
    parts.push(generateOneLiner(summary));
    parts.push(generateCoreInsights(summary));
    parts.push(generateEvidenceStrength(summary));
    parts.push(generateDetailedSummary(summary));
    parts.push(generateThoughtTriggers(summary));
  }
  
  // 5. 对话记录
  if (options.includeChat && chatMessages.length > 0) {
    parts.push(generateChatHistory(chatMessages));
  }
  
  // 6. 原文内容
  if (options.includeOriginalContent) {
    parts.push(generateOriginalContent(content));
  }
  
  return {
    markdown: parts.join('\n'),
    filename: generateFilename(content.title)
  };
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * 下载为文件
 */
export function downloadMarkdown(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
