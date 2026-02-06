/**
 * 多语言配置
 */

export const translations = {
  zh: {
    // 通用
    common: {
      loading: '加载中...',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      clear: '清除',
      copy: '复制',
      copied: '已复制',
      download: '下载',
      preview: '预览',
      close: '关闭',
      confirm: '确认',
      error: '错误',
      success: '成功',
    },
    
    // 主页面
    app: {
      title: 'DeepRead',
      subtitle: 'AI 阅读助手',
      extractArticle: '提取文章',
      extracting: '提取中...',
      generateSummary: '生成摘要',
      generating: '生成中...',
      apiKeyRequired: '请先配置 API Key 以使用 AI 功能',
      configureApiKey: '配置 API Key',
      emptyState: '打开一篇文章，然后点击"提取文章"按钮开始。',
    },
    
    // 标签页
    tabs: {
      summary: '摘要',
      chat: '对话',
      history: '历史',
      review: '综述',
    },
    
    // 摘要
    summary: {
      oneLiner: '一句话总结',
      coreInsights: '核心洞察',
      mainPoint: '主要观点',
      whyItMatters: '为什么重要',
      howToApply: '如何应用',
      evidenceStrength: '证据强度',
      evidenceLevels: {
        strong: '强',
        moderate: '中等',
        weak: '弱',
        opinion: '观点',
      },
      detailedSummary: '详细摘要',
      thoughtTriggers: '延伸思考',
      applicationPrompt: '应用',
      conflictPrompt: '质疑',
      relatedQuestions: '相关问题',
    },
    
    // 内容信息
    content: {
      contentType: '内容类型',
      type: '类型',
      confidence: '置信度',
      basicInfo: '基本信息',
      title: '标题',
      author: '作者',
      publishDate: '发布日期',
      metadata: '元数据',
      wordCount: '字数',
      readTime: '预计阅读',
      minutes: '分钟',
      language: '语言',
      source: '来源',
      contentPreview: '内容预览',
      first500: '前500字',
    },
    
    // 对话
    chat: {
      placeholder: '输入你的问题...',
      send: '发送',
      clearChat: '清除对话',
      suggestedQuestions: '试试这些问题：',
      emptyState: '针对文章内容提问，AI 将基于文章回答',
      extractFirst: '请先提取文章内容',
      apiKeyRequired: '请先在设置中配置 API Key',
      questions: {
        mainArgument: '这篇文章的主要论点是什么？',
        evidence: '作者提供了哪些证据？',
        application: '这对我有什么实际应用？',
        critique: '有哪些值得质疑的地方？',
      },
    },
    
    // 历史
    history: {
      searchPlaceholder: '搜索历史记录...',
      totalRecords: '共 {count} 条记录',
      clearAll: '清空全部',
      confirmClear: '再次点击确认清空',
      noResults: '没有找到匹配的记录',
      empty: '暂无阅读历史',
      hasSummary: '已摘要',
      messages: '{count} 条对话',
      types: {
        paper: '论文',
        blog: '博客',
        news: '新闻',
        twitter: '推文',
        documentation: '文档',
        generic: '文章',
      },
    },
    
    // 设置
    settings: {
      title: '设置',
      apiKey: 'OpenRouter API Key',
      apiKeyPlaceholder: 'sk-or-v1-...',
      apiKeyHelp: '从 openrouter.ai/keys 获取',
      model: 'AI 模型',
      presetModels: '预设模型',
      customModel: '自定义模型',
      customModelPlaceholder: '例如: anthropic/claude-3-opus',
      customModelHelp: '从 openrouter.ai/models 查看所有可用模型',
      summaryLanguage: '摘要语言',
      uiLanguage: '界面语言',
      languageOptions: {
        auto: '自动检测',
        zh: '中文',
        en: 'English',
        system: '跟随系统',
      },
      saveSuccess: '设置已保存',
      saveFailed: '保存失败',
      saving: '保存中...',
      saveSettings: '保存设置',
    },
    
    // 导出
    export: {
      title: '导出到 Obsidian',
      exportContent: '导出内容',
      yamlFrontmatter: 'YAML Frontmatter',
      yamlDescription: '包含标题、来源、标签等元数据',
      smartSummary: '智能摘要',
      summaryDescription: '核心洞察、证据评估、详细摘要',
      noSummary: '(尚未生成摘要)',
      chatHistory: '对话记录',
      chatDescription: '{count} 条对话消息',
      noChat: '(无对话记录)',
      originalContent: '原文内容',
      originalDescription: '包含完整原文 ({count} 字)',
      hidePreview: '隐藏预览',
      showPreview: '预览',
      downloadMd: '下载 .md',
    },
    
    // 文献综述
    literatureReview: {
      noArticles: '没有可用文章',
      readFirstHint: '请先阅读一些文章',
      selectedCount: '已选择 {count} 篇',
      clearSelection: '清除',
      selectAll: '全选',
      selectAtLeast2: '请至少选择2篇文章',
      generateReview: '生成文献综述',
      estimatedTokens: '预计使用约 {tokens} tokens',
      noApiKey: '请先配置 API Key',
      generating: '正在分析 {count} 篇文章...',
      waitingResponse: '等待AI响应...',
      backToSelect: '返回',
      confirmDelete: '确定删除这篇综述？',
      history: '历史综述',
      articles: '篇文章',
      coreFindings: '核心发现',
      mainThemes: '主要主题',
      keyArguments: '核心论点',
      consensusAndDisagreements: '共识与分歧',
      agreements: '共识点',
      disagreements: '分歧点',
      knowledgeGaps: '知识空白',
      furtherReading: '延伸阅读建议',
      conclusion: '综合结论',
      references: '参考文章',
    },
  },
  
  en: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      clear: 'Clear',
      copy: 'Copy',
      copied: 'Copied',
      download: 'Download',
      preview: 'Preview',
      close: 'Close',
      confirm: 'Confirm',
      error: 'Error',
      success: 'Success',
    },
    
    // Main app
    app: {
      title: 'DeepRead',
      subtitle: 'AI Reading Assistant',
      extractArticle: 'Extract Article',
      extracting: 'Extracting...',
      generateSummary: 'Generate Summary',
      generating: 'Generating...',
      apiKeyRequired: 'Please configure API Key to use AI features',
      configureApiKey: 'Configure API Key',
      emptyState: 'Open an article, then click "Extract Article" to start.',
    },
    
    // Tabs
    tabs: {
      summary: 'Summary',
      chat: 'Chat',
      history: 'History',
      review: 'Review',
    },
    
    // Summary
    summary: {
      oneLiner: 'One-liner',
      coreInsights: 'Core Insights',
      mainPoint: 'Main Point',
      whyItMatters: 'Why It Matters',
      howToApply: 'How to Apply',
      evidenceStrength: 'Evidence Strength',
      evidenceLevels: {
        strong: 'Strong',
        moderate: 'Moderate',
        weak: 'Weak',
        opinion: 'Opinion',
      },
      detailedSummary: 'Detailed Summary',
      thoughtTriggers: 'Thought Triggers',
      applicationPrompt: 'Application',
      conflictPrompt: 'Challenge',
      relatedQuestions: 'Related Questions',
    },
    
    // Content info
    content: {
      contentType: 'Content Type',
      type: 'Type',
      confidence: 'Confidence',
      basicInfo: 'Basic Info',
      title: 'Title',
      author: 'Author',
      publishDate: 'Publish Date',
      metadata: 'Metadata',
      wordCount: 'Word Count',
      readTime: 'Read Time',
      minutes: 'min',
      language: 'Language',
      source: 'Source',
      contentPreview: 'Content Preview',
      first500: 'First 500 chars',
    },
    
    // Chat
    chat: {
      placeholder: 'Type your question...',
      send: 'Send',
      clearChat: 'Clear Chat',
      suggestedQuestions: 'Try these questions:',
      emptyState: 'Ask questions about the article, AI will answer based on content',
      extractFirst: 'Please extract article content first',
      apiKeyRequired: 'Please configure API Key in settings',
      questions: {
        mainArgument: 'What is the main argument of this article?',
        evidence: 'What evidence does the author provide?',
        application: 'How can I apply this practically?',
        critique: 'What aspects are worth questioning?',
      },
    },
    
    // History
    history: {
      searchPlaceholder: 'Search history...',
      totalRecords: '{count} records',
      clearAll: 'Clear All',
      confirmClear: 'Click again to confirm',
      noResults: 'No matching records found',
      empty: 'No reading history',
      hasSummary: 'Summarized',
      messages: '{count} messages',
      types: {
        paper: 'Paper',
        blog: 'Blog',
        news: 'News',
        twitter: 'Tweet',
        documentation: 'Docs',
        generic: 'Article',
      },
    },
    
    // Settings
    settings: {
      title: 'Settings',
      apiKey: 'OpenRouter API Key',
      apiKeyPlaceholder: 'sk-or-v1-...',
      apiKeyHelp: 'Get from openrouter.ai/keys',
      model: 'AI Model',
      presetModels: 'Preset Models',
      customModel: 'Custom Model',
      customModelPlaceholder: 'e.g. anthropic/claude-3-opus',
      customModelHelp: 'See all models at openrouter.ai/models',
      summaryLanguage: 'Summary Language',
      uiLanguage: 'UI Language',
      languageOptions: {
        auto: 'Auto Detect',
        zh: '中文',
        en: 'English',
        system: 'System',
      },
      saveSuccess: 'Settings saved',
      saveFailed: 'Save failed',
      saving: 'Saving...',
      saveSettings: 'Save Settings',
    },
    
    // Export
    export: {
      title: 'Export to Obsidian',
      exportContent: 'Export Content',
      yamlFrontmatter: 'YAML Frontmatter',
      yamlDescription: 'Include title, source, tags metadata',
      smartSummary: 'Smart Summary',
      summaryDescription: 'Core insights, evidence, detailed summary',
      noSummary: '(No summary yet)',
      chatHistory: 'Chat History',
      chatDescription: '{count} messages',
      noChat: '(No chat history)',
      originalContent: 'Original Content',
      originalDescription: 'Full article ({count} chars)',
      hidePreview: 'Hide Preview',
      showPreview: 'Preview',
      downloadMd: 'Download .md',
    },
    
    // Literature Review
    literatureReview: {
      noArticles: 'No articles available',
      readFirstHint: 'Please read some articles first',
      selectedCount: '{count} selected',
      clearSelection: 'Clear',
      selectAll: 'Select All',
      selectAtLeast2: 'Select at least 2 articles',
      generateReview: 'Generate Literature Review',
      estimatedTokens: 'Estimated ~{tokens} tokens',
      noApiKey: 'Please configure API Key first',
      generating: 'Analyzing {count} articles...',
      waitingResponse: 'Waiting for AI response...',
      backToSelect: 'Back',
      confirmDelete: 'Delete this review?',
      history: 'Past Reviews',
      articles: 'articles',
      coreFindings: 'Core Findings',
      mainThemes: 'Main Themes',
      keyArguments: 'Key Arguments',
      consensusAndDisagreements: 'Consensus & Disagreements',
      agreements: 'Agreements',
      disagreements: 'Disagreements',
      knowledgeGaps: 'Knowledge Gaps',
      furtherReading: 'Further Reading',
      conclusion: 'Conclusion',
      references: 'References',
    },
  },
} as const;

export type TranslationKeys = typeof translations.zh;
