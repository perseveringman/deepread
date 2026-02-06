# 内容提取功能实现计划

**目标:** 实现文章内容提取，使用 Readability.js 从当前页面提取文章，并在 Side Panel 中以调试模式展示。

---

## Task 1: 创建内容提取服务

**文件:**
- 创建: `src/services/extractor.ts`

**步骤 1: 实现 Readability 提取器**

```typescript
// 使用 @mozilla/readability 提取文章内容
// 使用 DOMPurify 清理 HTML
// 返回 ExtractedContent 类型
```

**步骤 2: 实现内容类型检测**

根据 URL 和内容特征判断类型：
- twitter.com / x.com → twitter
- arxiv.org, .pdf → paper
- 有 author + date → blog/news
- 其他 → generic

**验证:** TypeScript 编译通过

---

## Task 2: 更新 Content Script

**文件:**
- 修改: `src/content/index.ts`

**步骤 1: 集成提取服务**

监听 `GET_CONTENT` 消息时，调用提取服务返回结构化内容。

**验证:** `npm run build` 成功

---

## Task 3: 更新消息类型定义

**文件:**
- 创建: `src/types/messages.ts`

**步骤 1: 定义消息类型**

```typescript
type MessageType = 'EXTRACT_CONTENT' | 'CONTENT_EXTRACTED' | 'EXTRACTION_ERROR';

interface ExtractContentRequest { type: 'EXTRACT_CONTENT' }
interface ContentExtractedResponse { type: 'CONTENT_EXTRACTED'; data: ExtractedContent }
interface ExtractionErrorResponse { type: 'EXTRACTION_ERROR'; error: string }
```

**验证:** TypeScript 编译通过

---

## Task 4: 更新 Background Service Worker

**文件:**
- 修改: `src/background/index.ts`

**步骤 1: 完善消息路由**

处理 Side Panel → Content Script 的消息转发。

**验证:** `npm run build` 成功

---

## Task 5: 创建 Side Panel 状态管理

**文件:**
- 创建: `src/store/articleStore.ts`

**步骤 1: 使用 Zustand 创建状态**

```typescript
interface ArticleState {
  content: ExtractedContent | null;
  loading: boolean;
  error: string | null;
  extractContent: () => Promise<void>;
}
```

**验证:** TypeScript 编译通过

---

## Task 6: 更新 Side Panel UI（调试模式）

**文件:**
- 修改: `src/sidepanel/App.tsx`

**步骤 1: 添加提取按钮**

点击后触发内容提取。

**步骤 2: 显示调试信息**

以 JSON 格式展示：
- 内容类型和置信度
- 标题、作者、发布日期
- 元数据（字数、阅读时间、语言、来源）
- 文章正文预览（前 500 字）

**验证:** 
1. `npm run build` 成功
2. 加载扩展，打开任意文章页面
3. 点击提取按钮，Side Panel 显示提取的内容

---

## Task 7: 提交代码

```bash
git add .
git commit -m "feat: implement content extraction with Readability.js"
git push origin dev
```
