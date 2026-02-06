// DeepRead Content Script
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import type { ExtractedContent, ContentType } from '@/types';
import type { ExtractContentResponse } from '@/types/messages';

console.log('DeepRead content script loaded');

/**
 * 检测内容类型
 */
function detectContentType(url: string, doc: Document): { type: ContentType; confidence: number } {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Twitter/X
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return { type: 'twitter', confidence: 0.95 };
  }
  
  // 学术论文
  if (hostname.includes('arxiv.org') || 
      hostname.includes('scholar.google') ||
      hostname.includes('pubmed') ||
      hostname.includes('doi.org') ||
      url.endsWith('.pdf')) {
    return { type: 'paper', confidence: 0.9 };
  }
  
  // 文档站点
  if (hostname.includes('docs.') || 
      hostname.includes('documentation') ||
      hostname.includes('readme') ||
      hostname.includes('wiki')) {
    return { type: 'documentation', confidence: 0.85 };
  }
  
  // 新闻站点
  const newsKeywords = ['news', 'times', 'post', 'herald', 'tribune', 'journal', 'reuters', 'bbc', 'cnn'];
  if (newsKeywords.some(k => hostname.includes(k))) {
    return { type: 'news', confidence: 0.8 };
  }
  
  // 博客特征检测
  const hasBlogIndicators = 
    hostname.includes('blog') ||
    hostname.includes('medium.com') ||
    hostname.includes('substack') ||
    hostname.includes('dev.to') ||
    hostname.includes('hashnode') ||
    doc.querySelector('article') !== null ||
    doc.querySelector('[class*="blog"]') !== null ||
    doc.querySelector('[class*="post"]') !== null;
  
  if (hasBlogIndicators) {
    return { type: 'blog', confidence: 0.75 };
  }
  
  return { type: 'generic', confidence: 0.5 };
}

/**
 * 检测语言
 */
function detectLanguage(text: string): string {
  const chineseRegex = /[\u4e00-\u9fa5]/g;
  const chineseMatches = text.match(chineseRegex) || [];
  const chineseRatio = chineseMatches.length / text.length;
  
  if (chineseRatio > 0.1) {
    return 'zh';
  }
  
  return 'en';
}

/**
 * 计算预计阅读时间（分钟）
 */
function calculateReadTime(wordCount: number, language: string): number {
  const wordsPerMinute = language === 'zh' ? 400 : 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * 计算字数
 */
function countWords(text: string, language: string): number {
  if (language === 'zh') {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    return chineseChars.length + englishWords.length;
  }
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * 提取页面内容
 */
function extractContent(): ExtractedContent {
  const url = window.location.href;
  const doc = document;
  
  // 使用 DOMParser 创建新文档以避免 Custom Elements 问题
  // 直接 cloneNode 会导致 __CE_registry 为 null 的错误
  const parser = new DOMParser();
  const clonedDoc = parser.parseFromString(doc.documentElement.outerHTML, 'text/html');
  
  // 使用 Readability 解析
  const reader = new Readability(clonedDoc);
  const article = reader.parse();
  
  if (!article) {
    throw new Error('无法提取文章内容，页面可能不包含文章');
  }
  
  // 清理 HTML
  const cleanHtml = DOMPurify.sanitize(article.content || '', {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'strong', 'em', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt'],
  });
  
  // 获取纯文本
  const tempDiv = doc.createElement('div');
  tempDiv.innerHTML = cleanHtml;
  const textContent = tempDiv.textContent || '';
  
  // 检测内容类型
  const { type, confidence } = detectContentType(url, doc);
  
  // 检测语言
  const language = detectLanguage(textContent);
  
  // 计算字数和阅读时间
  const wordCount = countWords(textContent, language);
  const estimatedReadTime = calculateReadTime(wordCount, language);
  
  // 提取作者
  const authorMeta = doc.querySelector('meta[name="author"]') as HTMLMetaElement | null;
  const author = article.byline || authorMeta?.content;
  
  // 提取发布日期
  const dateMeta = doc.querySelector('meta[property="article:published_time"]') as HTMLMetaElement | null;
  const timeMeta = doc.querySelector('time[datetime]') as HTMLTimeElement | null;
  const publishDate = dateMeta?.content || timeMeta?.dateTime;
  
  return {
    type,
    confidence,
    title: article.title || doc.title,
    author,
    publishDate,
    content: cleanHtml,
    metadata: {
      wordCount,
      estimatedReadTime,
      language,
      source: new URL(url).hostname,
    },
  };
}

// 监听消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    try {
      const content = extractContent();
      const response: ExtractContentResponse = {
        type: 'CONTENT_EXTRACTED',
        data: content,
      };
      sendResponse(response);
    } catch (error) {
      const response: ExtractContentResponse = {
        type: 'EXTRACTION_ERROR',
        error: error instanceof Error ? error.message : '未知错误',
      };
      sendResponse(response);
    }
  }
  return false;
});

export {};
