/**
 * 对话问答服务
 */

import { callOpenRouter, type OpenRouterMessage } from './openrouter';
import type { ExtractedContent, ChatMessage } from '@/types';

/**
 * 构建对话系统提示词
 */
function buildChatSystemPrompt(content: ExtractedContent, language: 'zh' | 'en' | 'auto'): string {
  // 从 HTML 中提取纯文本
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content.content;
  const textContent = tempDiv.textContent || '';
  
  const outputLang = language === 'auto' ? content.metadata.language : language;
  const langInstruction = outputLang === 'zh' 
    ? '请用中文回答问题。' 
    : 'Please answer in English.';

  return `You are a helpful reading assistant. You help users understand and discuss the article they are reading.

${langInstruction}

Article Information:
- Title: ${content.title}
- Author: ${content.author || 'Unknown'}
- Source: ${content.metadata.source}
- Type: ${content.type}

Article Content:
${textContent}

Guidelines:
- Answer questions based on the article content
- If the question is not related to the article, politely redirect to the article topic
- Cite specific parts of the article when relevant
- Be concise but thorough
- If you're not sure about something, say so`;
}

/**
 * 将 ChatMessage 转换为 OpenRouter 格式
 */
function convertToOpenRouterMessages(
  systemPrompt: string,
  chatHistory: ChatMessage[]
): OpenRouterMessage[] {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of chatHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  return messages;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 发送消息并获取回复
 */
export async function sendChatMessage(
  apiKey: string,
  model: string,
  content: ExtractedContent,
  chatHistory: ChatMessage[],
  userMessage: string,
  language: 'zh' | 'en' | 'auto' = 'auto'
): Promise<ChatMessage> {
  const systemPrompt = buildChatSystemPrompt(content, language);
  
  // 添加用户消息到历史
  const updatedHistory: ChatMessage[] = [
    ...chatHistory,
    {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    },
  ];

  const messages = convertToOpenRouterMessages(systemPrompt, updatedHistory);

  const response = await callOpenRouter(apiKey, {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1500,
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('AI 未返回任何内容');
  }

  return {
    id: generateId(),
    role: 'assistant',
    content: responseText,
    timestamp: Date.now(),
  };
}

/**
 * 创建用户消息对象
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateId(),
    role: 'user',
    content,
    timestamp: Date.now(),
  };
}
