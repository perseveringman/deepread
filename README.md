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
