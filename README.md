# FlowForge 🔥

**AI-Powered Website Builder with Visual Strategy Planning**

Build expert-level websites by mapping your strategy before building. FlowForge combines the power of AI with a visual node-based canvas to help you think, plan, and build better websites.

![FlowForge Preview](./public/og-image.png)

## ✨ Features

### 🎯 Strategy Canvas
- **Visual Planning**: Map your website structure with a node-based canvas
- **Competitor Analysis**: Add competitor URLs and get AI-powered insights
- **Design Inspiration**: Extract color palettes and patterns from inspiration sites
- **Page & Section Nodes**: Define your site architecture visually

### 🤖 AI-Powered Building
- **Chat Interface**: Describe what you want, get expert guidance
- **PRD Generation**: Auto-generate requirements from your canvas
- **Code Generation**: Convert sections to React/Next.js components
- **Context-Aware**: AI understands your entire strategy canvas

### 👁️ Live Preview
- **Real-time Preview**: See your generated code rendered instantly
- **Responsive Testing**: Desktop, tablet, and mobile viewports
- **Code View**: Toggle between preview and source code

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Anthropic API key (Claude)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/flowforge.git
cd flowforge
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema:

```bash
# Copy contents of supabase/schema.sql and run in Supabase SQL Editor
```

3. Get your project URL and anon key from Settings > API

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📁 Project Structure

```
flowforge/
├── app/
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── (dashboard)/         # Dashboard pages
│   │   ├── projects/        # Projects list
│   │   └── project/[id]/    # Project editor
│   ├── api/                  # API routes
│   │   ├── chat/            # AI chat endpoint
│   │   └── generate/        # Code generation endpoint
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── canvas/              # Strategy canvas components
│   │   ├── nodes/           # Custom node types
│   │   └── strategy-canvas.tsx
│   ├── chat/                # Chat panel
│   ├── layout/              # Layout components
│   ├── preview/             # Preview panel
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── stores/              # Zustand stores
│   ├── supabase/            # Supabase clients
│   └── utils.ts
├── types/
│   └── index.ts             # TypeScript types
└── supabase/
    └── schema.sql           # Database schema
```

## 🎨 Node Types

| Node | Purpose | Color |
|------|---------|-------|
| **Project** | Root context (business, audience, goals) | Amber |
| **Competitor** | Competitor URL for AI analysis | Gray |
| **Design** | Design inspiration for style extraction | Purple |
| **Page** | Website page (contains sections) | Blue |
| **Section** | Page section (Hero, Features, etc.) | Green |

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Canvas**: React Flow (@xyflow/react)
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Claude API (Anthropic)
- **Panels**: react-resizable-panels

## 📝 API Routes

### POST /api/chat
Chat with AI assistant.

```typescript
{
  message: string;
  projectId: string;
  nodeId?: string;
  context?: NodeData[];
}
```

### POST /api/generate
Generate section code.

```typescript
{
  nodeId: string;
  sectionType: SectionType;
  config?: object;
  context?: object;
}
```

## 🗺️ Roadmap

### Phase 1 (Current) - MVP
- [x] Project CRUD
- [x] Strategy Canvas with nodes
- [x] Basic chat interface
- [x] Split-view layout
- [ ] Code generation API
- [ ] Live preview with Sandpack

### Phase 2 - AI Features
- [ ] Competitor screenshot & analysis
- [ ] Design extraction (colors, typography)
- [ ] PRD auto-generation
- [ ] Multi-section page assembly

### Phase 3 - Export & Deploy
- [ ] GitHub export
- [ ] Vercel one-click deploy
- [ ] Custom domain support
- [ ] Export to ZIP

### Phase 4 - Polish
- [ ] Real-time collaboration
- [ ] Template library
- [ ] Version history
- [ ] Custom components

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork and clone
git checkout -b feature/your-feature
npm run dev
# Make changes
git commit -m "Add your feature"
git push origin feature/your-feature
# Open PR
```

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev) - Canvas library
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Supabase](https://supabase.com) - Backend
- [Anthropic](https://anthropic.com) - AI

---

Built with ❤️ by [Your Name]

**Think → Map → Build → Refine**
