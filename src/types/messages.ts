import type { ExtractedContent } from './index';

// 消息类型
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'CONTENT_EXTRACTED'
  | 'EXTRACTION_ERROR';

// 请求消息
export interface ExtractContentRequest {
  type: 'EXTRACT_CONTENT';
}

// 成功响应
export interface ContentExtractedResponse {
  type: 'CONTENT_EXTRACTED';
  data: ExtractedContent;
}

// 错误响应
export interface ExtractionErrorResponse {
  type: 'EXTRACTION_ERROR';
  error: string;
}

// 响应联合类型
export type ExtractContentResponse = ContentExtractedResponse | ExtractionErrorResponse;

// 所有消息类型
export type Message = ExtractContentRequest | ContentExtractedResponse | ExtractionErrorResponse;
