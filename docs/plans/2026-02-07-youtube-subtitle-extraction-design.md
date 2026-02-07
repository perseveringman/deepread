# YouTube 字幕抓取功能设计

**日期:** 2026-02-07  
**状态:** 待实现

## 概述

为 DeepRead 扩展增加 YouTube 视频字幕抓取能力，将字幕作为文本内容，复用现有的文章分析功能（摘要、问答、标签、导出等）。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 字幕来源 | 仅官方字幕 | 保持简单，官方字幕质量较高 |
| 触发方式 | 自动检测 | 与文章行为一致，用户体验统一 |
| 语言选择 | 智能匹配 | 优先用户设置，回退原声语言 |
| 元数据 | 基础 + 时间戳 | 满足定位需求，不过度复杂 |
| 内容类型 | 新增 `youtube` | 便于针对性处理和后续扩展 |
| UI 展示 | 可切换视图 | 兼顾阅读体验和视频定位 |

## 功能范围

### 包含

- YouTube 官方字幕抓取
- 自动检测 YouTube 页面
- 智能语言匹配
- 时间戳保留与跳转
- 复用现有分析能力（摘要、问答、标签、导出）

### 不包含

- ASR 语音识别转录
- 其他视频平台支持
- 视频内容分析（画面）
- 字幕翻译功能
- 视频下载

## 架构设计

```
YouTube 页面
    ↓
Content Script 检测 (youtube.com/watch)
    ↓
提取视频 ID → 获取字幕列表 → 智能选择语言
    ↓
抓取字幕 (YouTube timedtext API)
    ↓
解析为 TranscriptSegment[] (text + startTime + duration)
    ↓
构建 ExtractedContent (contentType: 'youtube')
    ↓
复用现有流程: 摘要 / 问答 / 标签 / 导出
```

## 数据结构

### 新增类型定义

```typescript
// 字幕片段
interface TranscriptSegment {
  text: string;
  startTime: number;  // 秒
  duration: number;   // 秒
}

// YouTube 视频元数据
interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  publishDate?: string;
  duration: number;  // 视频总时长（秒）
  transcript: TranscriptSegment[];
  language: string;  // 字幕语言
}
```

### 扩展现有类型

```typescript
// contentType 新增 'youtube'
type ContentType = 'paper' | 'blog' | 'twitter' | 'news' 
                 | 'documentation' | 'generic' | 'youtube';

// ExtractedContent 扩展
interface ExtractedContent {
  // ... 现有字段
  youtubeMetadata?: YouTubeMetadata;
}
```

## 字幕抓取实现

### 新增服务文件

`src/services/youtubeExtractor.ts`

### 抓取流程

1. **检测 YouTube 页面**
   - URL 匹配: `youtube.com/watch?v={videoId}`
   - 提取 videoId

2. **获取视频元数据**
   - 从页面 DOM 提取: 标题、频道名、发布日期、时长
   - 或从 `ytInitialPlayerResponse` 全局变量解析

3. **获取字幕列表**
   - 解析 `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer`
   - 获取可用字幕轨道列表 (`captionTracks[]`)

4. **智能选择语言**
   - 优先匹配用户设置语言 (zh/en)
   - 回退到视频原声语言 (默认轨道)
   - 都没有则取第一个可用轨道

5. **抓取字幕内容**
   - 请求字幕 URL (`baseUrl + &fmt=json3`)
   - 解析 JSON 格式字幕数据

6. **转换为统一格式**
   - 构建 `TranscriptSegment[]`
   - 合并到 `ExtractedContent`

### 核心函数设计

```typescript
// 主入口
export async function extractYouTubeContent(
  url: string
): Promise<ExtractedContent | null>

// 从页面提取元数据
function extractVideoMetadata(): YouTubeMetadata

// 获取字幕轨道列表
function getCaptionTracks(): CaptionTrack[]

// 选择最佳字幕轨道
function selectBestTrack(
  tracks: CaptionTrack[], 
  preferredLang: string
): CaptionTrack | null

// 抓取并解析字幕
async function fetchTranscript(
  track: CaptionTrack
): Promise<TranscriptSegment[]>

// 字幕转纯文本（用于 AI 分析）
export function transcriptToPlainText(
  segments: TranscriptSegment[]
): string

// 格式化时间戳 (秒 → "MM:SS" 或 "HH:MM:SS")
export function formatTimestamp(seconds: number): string
```

### 字幕数据源

YouTube 字幕通过内嵌的 `ytInitialPlayerResponse` 获取，无需额外 API 调用：

```javascript
// 页面中存在的全局变量
window.ytInitialPlayerResponse.captions
  .playerCaptionsTracklistRenderer.captionTracks

// 每个 track 包含:
{
  baseUrl: "https://www.youtube.com/api/timedtext?...",
  languageCode: "en",
  name: { simpleText: "English" },
  isTranslatable: true
}
```

## UI 组件设计

### 新增组件

`src/components/TranscriptView.tsx`

### 组件结构

```
TranscriptView
├── ViewToggle (视图切换按钮)
│   ├── 阅读模式图标
│   └── 时间戳模式图标
├── ReadingView (纯文本流视图)
│   └── 连续段落文本
└── TimestampView (时间戳列表视图)
    └── TranscriptSegmentItem[] (可点击跳转)
        ├── 时间戳标签 [MM:SS]
        └── 字幕文本
```

### 组件 Props

```typescript
interface TranscriptViewProps {
  segments: TranscriptSegment[];
  videoId: string;
  onTimestampClick?: (seconds: number) => void;
}

type ViewMode = 'reading' | 'timestamp';
```

### 视图模式

| 模式 | 展示方式 | 用途 |
|------|----------|------|
| `reading` | 合并为连续段落，按句子断行 | 阅读理解、AI 分析 |
| `timestamp` | 保留时间戳，每段独立显示 | 定位视频位置 |

### 时间戳跳转实现

```typescript
// 点击时间戳跳转到视频对应位置
function handleTimestampClick(seconds: number) {
  // 方式1: 修改 URL hash
  window.location.href = `https://youtube.com/watch?v=${videoId}&t=${seconds}`;
  
  // 方式2: 通过 Content Script 控制播放器 (更流畅)
  chrome.tabs.sendMessage(tabId, {
    type: 'YOUTUBE_SEEK',
    payload: { seconds }
  });
}
```

## 现有组件修改

### 1. `src/content/index.ts` - 内容检测

```typescript
// 新增 YouTube 检测逻辑
function detectContentType(url: string): ContentType {
  if (url.includes('youtube.com/watch')) {
    return 'youtube';
  }
  // ... 现有检测逻辑
}
```

### 2. `src/services/extractor.ts` - 内容提取

```typescript
export async function extractContent(): Promise<ExtractedContent> {
  const contentType = detectContentType(window.location.href);
  
  if (contentType === 'youtube') {
    return extractYouTubeContent(window.location.href);
  }
  
  // ... 现有文章提取逻辑
}
```

### 3. `src/components/StreamingSummary.tsx` - 摘要展示

```typescript
// 在摘要上方显示内容来源标识
function ContentBadge({ type }: { type: ContentType }) {
  if (type === 'youtube') {
    return <Badge icon={VideoIcon}>YouTube 视频</Badge>;
  }
  // ... 其他类型
}
```

### 4. `src/sidepanel/App.tsx` - 主界面

```typescript
// 根据内容类型渲染不同视图
{contentType === 'youtube' && article.youtubeMetadata && (
  <TranscriptView
    segments={article.youtubeMetadata.transcript}
    videoId={article.youtubeMetadata.videoId}
    onTimestampClick={handleSeek}
  />
)}
```

## UI 交互流程

```
用户打开 YouTube 视频页面
    ↓
扩展自动检测 → 显示加载状态 "正在获取字幕..."
    ↓
[有字幕] → 提取成功 → 显示视频信息卡片
    │         ├── 标题、频道、时长
    │         ├── 字幕语言标识
    │         └── TranscriptView (默认阅读模式)
    │
    ↓
[无字幕] → 显示提示 "该视频没有可用字幕"
    ↓
用户可手动切换视图模式 (阅读 ↔ 时间戳)
    ↓
用户点击时间戳 → 视频跳转到对应位置
    ↓
用户可正常使用: 生成摘要 / 问答 / 打标签 / 导出
```

## 实现计划

### 阶段 1：基础字幕抓取

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1.1 | 新增 YouTube 相关类型定义 | `src/types/index.ts` |
| 1.2 | 实现字幕抓取服务 | `src/services/youtubeExtractor.ts` (新建) |
| 1.3 | 集成到内容检测流程 | `src/content/index.ts` |
| 1.4 | 集成到提取器 | `src/services/extractor.ts` |

### 阶段 2：UI 组件开发

| 步骤 | 任务 | 文件 |
|------|------|------|
| 2.1 | 实现字幕视图组件 | `src/components/TranscriptView.tsx` (新建) |
| 2.2 | 实现视图切换逻辑 | `src/components/TranscriptView.tsx` |
| 2.3 | 实现时间戳跳转功能 | `src/content/index.ts` |
| 2.4 | 集成到侧边栏主界面 | `src/sidepanel/App.tsx` |

### 阶段 3：复用现有分析能力

| 步骤 | 任务 | 文件 |
|------|------|------|
| 3.1 | 适配摘要服务（字幕转纯文本） | `src/services/streamingSummarizer.ts` |
| 3.2 | 适配问答服务 | `src/services/chat.ts` |
| 3.3 | 适配标签生成 | `src/services/tagGenerator.ts` |
| 3.4 | 适配导出服务 | `src/services/exporter.ts` |

### 阶段 4：状态管理与持久化

| 步骤 | 任务 | 文件 |
|------|------|------|
| 4.1 | 扩展 article store | `src/store/articleStore.ts` |
| 4.2 | 数据库 schema 兼容 | `src/db/index.ts` |

### 阶段 5：国际化与细节优化

| 步骤 | 任务 | 文件 |
|------|------|------|
| 5.1 | 添加中英文文案 | `src/i18n/translations.ts` |
| 5.2 | 无字幕错误处理 | 相关组件 |
| 5.3 | 加载状态优化 | 相关组件 |

## 文件变更清单

### 新建文件 (2 个)

| 文件 | 说明 |
|------|------|
| `src/services/youtubeExtractor.ts` | YouTube 字幕抓取核心服务 |
| `src/components/TranscriptView.tsx` | 字幕展示组件（双视图模式） |

### 修改文件 (10 个)

| 文件 | 变更内容 |
|------|----------|
| `src/types/index.ts` | 新增 `TranscriptSegment`、`YouTubeMetadata` 类型，扩展 `ContentType` |
| `src/content/index.ts` | 添加 YouTube 页面检测、`YOUTUBE_SEEK` 消息处理 |
| `src/services/extractor.ts` | 集成 YouTube 内容提取分支 |
| `src/services/streamingSummarizer.ts` | 处理 `youtube` 类型，使用纯文本字幕 |
| `src/services/chat.ts` | 上下文构建支持字幕内容 |
| `src/services/tagGenerator.ts` | 支持 `youtube` 内容类型 |
| `src/services/exporter.ts` | 导出格式支持视频元数据和字幕 |
| `src/store/articleStore.ts` | 状态结构支持 `youtubeMetadata` |
| `src/sidepanel/App.tsx` | 集成 `TranscriptView`，YouTube 内容展示逻辑 |
| `src/i18n/translations.ts` | 添加 YouTube 相关文案 |

### 可能修改 (1 个)

| 文件 | 变更内容 |
|------|----------|
| `src/db/index.ts` | 如需单独存储字幕，可能升级 schema 版本 |

## 风险与边界情况

| 风险 | 应对策略 |
|------|----------|
| 视频无字幕 | 显示友好提示，引导用户选择有字幕的视频 |
| 字幕数据结构变化 | YouTube 内部 API 可能变动，需监控并适配 |
| 长视频字幕过大 | 设置字幕长度上限，或分段处理 |
| 直播/Premiere 视频 | 检测并提示"暂不支持直播内容" |
| 年龄限制/地区限制视频 | 捕获错误，显示"无法获取该视频字幕" |

## 测试要点

| 场景 | 预期行为 |
|------|----------|
| 有中文字幕的视频 | 自动选择中文，正常抓取 |
| 仅有英文字幕的视频 | 回退到英文，正常抓取 |
| 无字幕的视频 | 显示"该视频没有可用字幕" |
| 自动生成字幕 | 正常抓取（标记为自动生成） |
| 点击时间戳 | 视频跳转到对应位置 |
| 视图模式切换 | 阅读/时间戳视图正确切换 |
| 生成摘要 | 基于字幕文本生成有效摘要 |
| 问答功能 | 能针对视频内容进行问答 |
| 导出功能 | Markdown 包含视频元数据和字幕 |
