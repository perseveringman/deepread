# AI 智能摘要功能实现计划

**目标:** 接入 OpenRouter API，实现文章智能摘要生成（Smart Summary 2.0）

---

## Task 1: 创建 OpenRouter API 服务

**文件:**
- 创建: `src/services/openrouter.ts`

**步骤:**
1. 实现 OpenRouter API 调用
2. 支持流式响应（streaming）
3. 错误处理（API key 无效、配额用尽等）

---

## Task 2: 创建摘要生成服务

**文件:**
- 创建: `src/services/summarizer.ts`

**步骤:**
1. 设计 Smart Summary 2.0 的 prompt
2. 调用 OpenRouter 生成摘要
3. 解析返回的 JSON 结构

---

## Task 3: 创建设置存储

**文件:**
- 创建: `src/store/settingsStore.ts`

**步骤:**
1. 使用 Zustand + chrome.storage 持久化
2. 存储 API Key、模型选择、语言偏好

---

## Task 4: 更新 articleStore

**文件:**
- 修改: `src/store/articleStore.ts`

**步骤:**
1. 添加 summary 状态
2. 添加 generateSummary 方法

---

## Task 5: 创建设置页面组件

**文件:**
- 创建: `src/components/Settings.tsx`

**步骤:**
1. API Key 输入框
2. 模型选择下拉框
3. 语言选择

---

## Task 6: 更新 Side Panel UI

**文件:**
- 修改: `src/sidepanel/App.tsx`

**步骤:**
1. 添加"生成摘要"按钮
2. 显示摘要结果（调试模式）
3. 添加设置入口

---

## Task 7: 提交代码

```bash
git commit -m "feat: implement AI-powered smart summary with OpenRouter"
git push origin dev
```
