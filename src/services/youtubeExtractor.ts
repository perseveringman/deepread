/**
 * YouTube 字幕抓取服务
 * 从 YouTube 视频页面提取字幕和元数据
 */

import type { ExtractedContent, TranscriptSegment, YouTubeMetadata } from '@/types';

/**
 * 字幕轨道信息
 */
interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  isTranslatable: boolean;
  kind?: string;  // 'asr' 表示自动生成
}

/**
 * YouTube 播放器响应中的字幕信息
 */
interface PlayerCaptionsData {
  playerCaptionsTracklistRenderer?: {
    captionTracks?: CaptionTrack[];
    defaultAudioTrackIndex?: number;
  };
}

/**
 * YouTube timedtext API 返回的字幕事件
 */
interface TimedTextEvent {
  tStartMs: number;
  dDurationMs: number;
  segs?: Array<{ utf8: string }>;
}

/**
 * 检测是否为 YouTube 视频页面
 */
export function isYouTubePage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') &&
      urlObj.pathname === '/watch' &&
      urlObj.searchParams.has('v')
    );
  } catch {
    return false;
  }
}

/**
 * 从 URL 中提取视频 ID
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * 从页面中获取 ytInitialPlayerResponse 数据
 */
function getPlayerResponse(): Record<string, unknown> | null {
  // 尝试从全局变量获取
  const win = window as unknown as { ytInitialPlayerResponse?: Record<string, unknown> };
  if (win.ytInitialPlayerResponse) {
    return win.ytInitialPlayerResponse;
  }

  // 尝试从页面脚本中解析
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * 从页面提取视频元数据
 */
function extractVideoMetadata(playerResponse: Record<string, unknown>): Partial<YouTubeMetadata> {
  const videoDetails = playerResponse.videoDetails as Record<string, unknown> | undefined;
  
  if (!videoDetails) {
    // 回退到 DOM 提取
    return {
      title: document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() ||
             document.querySelector('meta[name="title"]')?.getAttribute('content') ||
             document.title,
      channelName: document.querySelector('#channel-name a')?.textContent?.trim() ||
                   document.querySelector('ytd-channel-name a')?.textContent?.trim() ||
                   'Unknown',
    };
  }

  return {
    videoId: videoDetails.videoId as string,
    title: videoDetails.title as string,
    channelName: videoDetails.author as string,
    duration: parseInt(videoDetails.lengthSeconds as string, 10) || 0,
  };
}

/**
 * 获取字幕轨道列表
 */
function getCaptionTracks(playerResponse: Record<string, unknown>): CaptionTrack[] {
  const captions = playerResponse.captions as PlayerCaptionsData | undefined;
  const trackList = captions?.playerCaptionsTracklistRenderer?.captionTracks;
  
  if (!trackList || trackList.length === 0) {
    return [];
  }

  return trackList.map(track => ({
    baseUrl: track.baseUrl,
    languageCode: track.languageCode,
    name: typeof track.name === 'object' 
      ? (track.name as { simpleText?: string }).simpleText || track.languageCode
      : track.languageCode,
    isTranslatable: track.isTranslatable || false,
    kind: track.kind,
  }));
}

/**
 * 智能选择最佳字幕轨道
 * 优先级: 用户偏好语言 > 视频原声语言 > 第一个可用轨道
 */
function selectBestTrack(tracks: CaptionTrack[], preferredLang: string): CaptionTrack | null {
  if (tracks.length === 0) {
    return null;
  }

  // 标准化语言代码
  const normalizedPref = preferredLang.toLowerCase().split('-')[0];

  // 1. 尝试匹配用户偏好语言
  const preferredTrack = tracks.find(t => 
    t.languageCode.toLowerCase().startsWith(normalizedPref)
  );
  if (preferredTrack) {
    return preferredTrack;
  }

  // 2. 尝试查找非自动生成的轨道（优先人工字幕）
  const manualTrack = tracks.find(t => t.kind !== 'asr');
  if (manualTrack) {
    return manualTrack;
  }

  // 3. 回退到第一个轨道
  return tracks[0];
}

/**
 * 抓取并解析字幕
 */
async function fetchTranscript(track: CaptionTrack): Promise<TranscriptSegment[]> {
  // 添加 fmt=json3 参数获取 JSON 格式字幕
  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`获取字幕失败: ${response.status}`);
  }

  const data = await response.json();
  const events = data.events as TimedTextEvent[] | undefined;

  if (!events) {
    return [];
  }

  const segments: TranscriptSegment[] = [];

  for (const event of events) {
    // 跳过没有文本的事件（如空行、格式标记等）
    if (!event.segs || event.segs.length === 0) {
      continue;
    }

    const text = event.segs
      .map(seg => seg.utf8 || '')
      .join('')
      .trim();

    if (text) {
      segments.push({
        text,
        startTime: event.tStartMs / 1000,
        duration: event.dDurationMs / 1000,
      });
    }
  }

  return segments;
}

/**
 * 将字幕转换为纯文本（用于 AI 分析）
 */
export function transcriptToPlainText(segments: TranscriptSegment[]): string {
  return segments.map(seg => seg.text).join(' ');
}

/**
 * 将字幕转换为带时间戳的文本
 */
export function transcriptToTimestampedText(segments: TranscriptSegment[]): string {
  return segments
    .map(seg => `[${formatTimestamp(seg.startTime)}] ${seg.text}`)
    .join('\n');
}

/**
 * 格式化时间戳 (秒 → "MM:SS" 或 "HH:MM:SS")
 */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 检测字幕语言
 */
function detectTranscriptLanguage(text: string): string {
  const chineseRegex = /[\u4e00-\u9fa5]/g;
  const chineseMatches = text.match(chineseRegex) || [];
  const chineseRatio = chineseMatches.length / text.length;
  
  return chineseRatio > 0.1 ? 'zh' : 'en';
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
 * 计算预计阅读/观看时间（分钟）
 */
function calculateReadTime(wordCount: number, language: string): number {
  const wordsPerMinute = language === 'zh' ? 400 : 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * 主入口：提取 YouTube 视频内容
 */
export async function extractYouTubeContent(
  url: string,
  preferredLang: string = 'zh'
): Promise<ExtractedContent> {
  // 验证是否为 YouTube 页面
  if (!isYouTubePage(url)) {
    throw new Error('不是有效的 YouTube 视频页面');
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('无法提取视频 ID');
  }

  // 获取播放器响应数据
  const playerResponse = getPlayerResponse();
  if (!playerResponse) {
    throw new Error('无法获取视频数据，请确保页面已完全加载');
  }

  // 提取视频元数据
  const metadata = extractVideoMetadata(playerResponse);

  // 获取字幕轨道
  const captionTracks = getCaptionTracks(playerResponse);
  if (captionTracks.length === 0) {
    throw new Error('该视频没有可用字幕');
  }

  // 选择最佳字幕轨道
  const selectedTrack = selectBestTrack(captionTracks, preferredLang);
  if (!selectedTrack) {
    throw new Error('无法选择合适的字幕轨道');
  }

  // 抓取字幕
  const transcript = await fetchTranscript(selectedTrack);
  if (transcript.length === 0) {
    throw new Error('字幕内容为空');
  }

  // 转换为纯文本
  const plainText = transcriptToPlainText(transcript);
  const language = detectTranscriptLanguage(plainText);
  const wordCount = countWords(plainText, language);

  // 构建 YouTubeMetadata
  const youtubeMetadata: YouTubeMetadata = {
    videoId,
    title: metadata.title || document.title,
    channelName: metadata.channelName || 'Unknown',
    publishDate: undefined, // YouTube 页面中不易获取精确发布日期
    duration: metadata.duration || 0,
    transcript,
    language: selectedTrack.languageCode,
  };

  // 构建 ExtractedContent
  return {
    type: 'youtube',
    confidence: 0.95,
    title: youtubeMetadata.title,
    author: youtubeMetadata.channelName,
    publishDate: youtubeMetadata.publishDate,
    content: plainText,  // 用于 AI 分析的纯文本
    metadata: {
      wordCount,
      estimatedReadTime: calculateReadTime(wordCount, language),
      language,
      source: 'youtube.com',
    },
    youtubeMetadata,
  };
}
