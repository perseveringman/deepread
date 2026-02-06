# DeepRead Project Initialization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize a Chrome Extension project with React, TypeScript, Vite, and all necessary configurations for DeepRead.

**Architecture:** Chrome Extension using Manifest V3, with Side Panel as primary UI, Content Script for page extraction, and Background Service Worker for coordination.

**Tech Stack:** React 18, TypeScript, Vite + CRXJS, Tailwind CSS, Zustand, Dexie.js

---

## Task 1: Initialize Project with Vite

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

**Step 1: Initialize npm project**

Run:
```bash
npm init -y
```

**Step 2: Install core dependencies**

Run:
```bash
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react @crxjs/vite-plugin@beta
npm install -D @types/react @types/react-dom @types/chrome
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        popup: 'src/popup/index.html',
      },
    },
  },
});
```

**Step 6: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts
git commit -m "chore: initialize project with Vite and TypeScript"
```

---

## Task 2: Create Chrome Extension Manifest

**Files:**
- Create: `manifest.json`
- Create: `public/icons/icon16.png` (placeholder)
- Create: `public/icons/icon48.png` (placeholder)
- Create: `public/icons/icon128.png` (placeholder)

**Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "DeepRead",
  "description": "AI-powered article reading assistant - understand why it matters and how to apply",
  "version": "0.1.0",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"]
    }
  ],
  "permissions": [
    "activeTab",
    "storage",
    "sidePanel"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

**Step 2: Create placeholder icons directory**

Run:
```bash
mkdir -p public/icons
```

**Step 3: Create simple placeholder icons (SVG converted to PNG or use placeholder)**

For now, we'll create a simple script to generate placeholder icons. Create `scripts/generate-icons.js`:

```javascript
// Placeholder - replace with actual icons later
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create simple 1x1 pixel PNG placeholders (will be replaced with real icons)
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
]);

sizes.forEach(size => {
  const filePath = path.join(iconsDir, `icon${size}.png`);
  // Write a minimal valid PNG (1x1 transparent pixel)
  fs.writeFileSync(filePath, Buffer.concat([
    pngHeader,
    Buffer.from([
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ])
  ]));
  console.log(`Created ${filePath}`);
});
```

Run:
```bash
mkdir -p scripts
node scripts/generate-icons.js
```

**Step 4: Commit**

```bash
git add manifest.json public/icons scripts/generate-icons.js
git commit -m "chore: add Chrome Extension manifest and placeholder icons"
```

---

## Task 3: Setup Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/styles/globals.css`

**Step 1: Install Tailwind dependencies**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontSize: {
        'xxs': '0.625rem',
      },
    },
  },
  plugins: [],
};
```

**Step 3: Create src/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-white text-gray-900 antialiased;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors;
  }
  
  .btn-secondary {
    @apply px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-lg border border-gray-200 shadow-sm;
  }
}
```

**Step 4: Commit**

```bash
git add tailwind.config.js postcss.config.js src/styles/globals.css
git commit -m "chore: setup Tailwind CSS configuration"
```

---

## Task 4: Install Additional Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install state management and storage**

Run:
```bash
npm install zustand dexie
```

**Step 2: Install content extraction and markdown**

Run:
```bash
npm install @mozilla/readability marked
npm install -D @types/dompurify
npm install dompurify
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install zustand, dexie, readability, and marked"
```

---

## Task 5: Create Directory Structure

**Files:**
- Create: `src/background/index.ts`
- Create: `src/content/index.ts`
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/index.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/popup/index.html`
- Create: `src/popup/index.tsx`
- Create: `src/popup/App.tsx`
- Create: `src/types/index.ts`

**Step 1: Create background service worker**

Create `src/background/index.ts`:

```typescript
// DeepRead Background Service Worker
console.log('DeepRead background service worker loaded');

// Handle side panel opening
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'EXTRACT_CONTENT') {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CONTENT' }, sendResponse);
      }
    });
    return true; // Keep channel open for async response
  }
  
  return false;
});

export {};
```

**Step 2: Create content script**

Create `src/content/index.ts`:

```typescript
// DeepRead Content Script
console.log('DeepRead content script loaded');

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CONTENT') {
    const content = {
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML,
    };
    sendResponse(content);
  }
  return false;
});

export {};
```

**Step 3: Create sidepanel HTML**

Create `src/sidepanel/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepRead</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

**Step 4: Create sidepanel entry**

Create `src/sidepanel/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Create sidepanel App**

Create `src/sidepanel/App.tsx`:

```tsx
import React from 'react';

function App() {
  return (
    <div className="w-full h-full min-h-screen bg-gray-50 p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">DeepRead</h1>
        <p className="text-sm text-gray-500">AI-powered reading assistant</p>
      </header>
      
      <main>
        <div className="card p-4">
          <p className="text-gray-600">
            Open an article to get started.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 6: Create popup HTML**

Create `src/popup/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepRead Settings</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

**Step 7: Create popup entry**

Create `src/popup/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 8: Create popup App**

Create `src/popup/App.tsx`:

```tsx
import React from 'react';

function App() {
  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  };

  return (
    <div className="w-80 p-4 bg-white">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">DeepRead</h1>
      </header>
      
      <button
        onClick={openSidePanel}
        className="btn-primary w-full mb-3"
      >
        Open Side Panel
      </button>
      
      <div className="text-xs text-gray-500 text-center">
        Configure API key in Side Panel settings
      </div>
    </div>
  );
}

export default App;
```

**Step 9: Create types index**

Create `src/types/index.ts`:

```typescript
// Content Types
export type ContentType = 
  | 'paper'
  | 'blog'
  | 'twitter'
  | 'news'
  | 'documentation'
  | 'generic';

export interface ExtractedContent {
  type: ContentType;
  confidence: number;
  title: string;
  author?: string;
  publishDate?: string;
  content: string;
  metadata: {
    wordCount: number;
    estimatedReadTime: number;
    language: string;
    source: string;
  };
}

// Summary Types
export interface SmartSummary {
  oneLiner: string;
  coreInsights: {
    mainPoint: string;
    whyItMatters: string;
    howToApply: string;
  };
  evidenceStrength: {
    level: 'strong' | 'moderate' | 'weak' | 'opinion';
    reasoning: string;
  };
  detailedSummary: {
    sections: Array<{
      heading: string;
      summary: string;
      keyQuotes?: string[];
    }>;
  };
  thoughtTriggers?: {
    applicationPrompt: string;
    conflictPrompt: string;
    relatedQuestions: string[];
  };
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: Array<{
    text: string;
    position: number;
  }>;
}

export interface ChatSession {
  articleId: string;
  messages: ChatMessage[];
}

// AI Provider Types
export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kTokens?: number;
}

export interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIProvider {
  name: string;
  models: ModelInfo[];
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat?(request: ChatRequest): AsyncGenerator<string>;
}

// Settings Types
export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  defaultReadingLevel: 'quick' | 'core' | 'detailed';
  language: 'zh' | 'en' | 'auto';
}

// Storage Types
export interface StoredArticle {
  id: string;
  url: string;
  title: string;
  extractedContent: ExtractedContent;
  summary?: SmartSummary;
  chatHistory: ChatMessage[];
  createdAt: number;
  lastAccessedAt: number;
}
```

**Step 10: Commit**

```bash
git add src/
git commit -m "feat: create basic project structure with background, content, sidepanel, and popup"
```

---

## Task 6: Verify Build Works

**Step 1: Add build scripts to package.json**

Ensure package.json has these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**Step 2: Run build**

Run:
```bash
npm run build
```

Expected: Build completes successfully, `dist/` folder created with extension files.

**Step 3: Verify dist structure**

Run:
```bash
ls -la dist/
```

Expected: manifest.json, background scripts, content scripts, HTML files present.

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: verify build configuration works"
```

---

## Task 7: Add .gitignore and README

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Create .gitignore**

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# Logs
*.log
npm-debug.log*
```

**Step 2: Create README.md**

```markdown
# DeepRead

AI-powered Chrome extension for intelligent article reading.

## Features

- **Smart Summary 2.0**: Core insights + why it matters + how to apply
- **Content Type Adaptation**: Optimized for papers, blogs, tweets, news
- **Progressive Reading**: 10-second overview → 2-minute core → full detail
- **Contextual Q&A**: Ask questions about the article
- **Obsidian Export**: Save your reading notes

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
npm run dev
```

### Load Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### Build

```bash
npm run build
```

## Tech Stack

- React 18
- TypeScript
- Vite + CRXJS
- Tailwind CSS
- Zustand
- Dexie.js
```

**Step 3: Commit**

```bash
git add .gitignore README.md
git commit -m "docs: add gitignore and README"
```

---

## Summary

After completing all tasks, you will have:

1. A working Vite + React + TypeScript Chrome Extension project
2. Manifest V3 configuration with Side Panel support
3. Tailwind CSS styling setup
4. Basic project structure ready for feature development
5. Type definitions for all core data structures

Next steps (future plans):
- Implement content extraction with Readability.js
- Build AI provider adapter for OpenRouter
- Create summary generation with prompts
- Build Side Panel UI components
- Add chat functionality
- Implement Obsidian export
