/**
 * 对话问答服务
 */

import { callOpenRouter, streamOpenRouter, type OpenRouterMessage } from './openrouter';
import type { ExtractedContent, ChatMessage } from '@/types';

/**
 * 构建对话系统提示词
 */
function buildChatSystemPrompt(content: ExtractedContent, language: 'zh' | 'en' | 'auto'): string {
  const outputLang = language === 'auto' ? content.metadata.language : language;
  const langInstruction = outputLang === 'zh' 
    ? '请用中文回答问题。' 
    : 'Please answer in English.';

  // YouTube 视频特殊处理
  if (content.type === 'youtube' && content.youtubeMetadata) {
    const meta = content.youtubeMetadata;
    return `You are a helpful video assistant. You help users understand and discuss the YouTube video they are watching.

${langInstruction}

Video Information:
- Title: ${meta.title}
- Channel: ${meta.channelName}
- Duration: ${Math.floor(meta.duration / 60)} minutes
- Subtitle Language: ${meta.language}

Video Transcript:
${content.content}

Guidelines:
- Answer questions based on the video transcript
- If the question is not related to the video content, politely redirect to the video topic
- Reference specific parts of the transcript when relevant
- Be concise but thorough
- If you're not sure about something, say so
- Remember this is a video transcript, so some context may be missing (visual elements, demonstrations, etc.)`;
  }

  // 普通文章处理
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content.content;
  const textContent = tempDiv.textContent || '';

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
 * 发送消息并获取回复（非流式）
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
 * 流式发送消息
 */
export function sendChatMessageStream(
  apiKey: string,
  model: string,
  content: ExtractedContent,
  chatHistory: ChatMessage[],
  userMessage: string,
  language: 'zh' | 'en' | 'auto' = 'auto',
  onChunk: (chunk: string, fullContent: string) => void,
  onDone: (message: ChatMessage) => void,
  onError: (error: string) => void
): () => void {
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
  let fullContent = '';
  const messageId = generateId();
  const timestamp = Date.now();

  return streamOpenRouter(
    apiKey,
    {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    },
    (chunk) => {
      fullContent += chunk;
      onChunk(chunk, fullContent);
    },
    () => {
      onDone({
        id: messageId,
        role: 'assistant',
        content: fullContent,
        timestamp,
      });
    },
    onError
  );
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

/**
 * 创建助手消息对象
 */
export function createAssistantMessage(content: string): ChatMessage {
  return {
    id: generateId(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  };
}
