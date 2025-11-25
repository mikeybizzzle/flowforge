# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowForge is an AI-powered website builder that uses a visual node-based strategy canvas. Users map their website structure, add competitor analysis and design inspiration, then use AI chat to generate React/Next.js code.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- **Next.js 14+** with App Router
- **Tailwind CSS** + **shadcn/ui** components
- **React Flow** (@xyflow/react) for the strategy canvas
- **Zustand** for state management
- **Supabase** for PostgreSQL database and auth
- **Claude API** (@anthropic-ai/sdk) for AI features
- **Sandpack** (@codesandbox/sandpack-react) for live code preview
- **Sonner** for toast notifications

### Key Directories

- `app/(auth)/` - Authentication pages (login, signup)
- `app/(dashboard)/` - Dashboard and project editor routes
- `app/api/chat/` - AI chat endpoint using Claude API
- `app/api/generate/` - Code generation endpoint for sections
- `app/api/analyze/` - Competitor analysis endpoint using Claude
- `components/canvas/` - Strategy canvas and node components
- `components/canvas/nodes/` - Custom node types (project, competitor, design, page, section)
- `components/canvas/node-config-dialog.tsx` - Configuration dialog for all node types
- `components/preview/preview-panel.tsx` - Sandpack-based live preview
- `components/layout/project-settings-dialog.tsx` - Project settings dialog
- `lib/stores/` - Zustand stores (`canvas-store.ts`, `chat-store.ts`)
- `lib/supabase/` - Supabase client configuration (client, server, middleware)
- `types/index.ts` - All TypeScript types including Database types

### API Endpoints

- `POST /api/generate` - Generate React code for section nodes
- `POST /api/analyze` - Analyze competitor websites (returns structured JSON with strengths, weaknesses, design patterns, etc.)
- `POST /api/chat` - AI chat for project assistance

### State Management

The `useCanvasStore` (lib/stores/canvas-store.ts) manages:
- Project and canvas state (nodes, edges)
- Node selection (single and multi-select)
- Active view (canvas vs preview) and active panel (chat, config, code)
- Config dialog state (`configDialogNodeId`)
- Viewport state
- Context gathering for AI (`getNodeContext` walks up the graph to find parent nodes)

### Node Types

Nodes are typed in `types/index.ts` and have corresponding React components in `components/canvas/nodes/`:
- `project` - Root context (business info, audience, brand voice)
- `competitor` - Competitor URL for analysis (with Analyze button)
- `design` - Design inspiration with color/typography extraction
- `page` - Website page containing sections
- `section` - Page section with Build button (hero, features, testimonials, etc.)
- `goals`, `feature`, `prd` - Additional planning nodes

All node data types include `[key: string]: unknown` index signature for React Flow compatibility.

### Database Schema

Run `supabase/schema.sql` in Supabase SQL Editor. Tables:
- `projects` - User projects with settings (JSONB)
- `nodes` - Canvas nodes with position and data (JSONB)
- `edges` - Connections between nodes
- `generations` - AI-generated content (PRD, code, analysis)
- `messages` - Chat history per project

All tables have RLS policies scoped to `auth.uid()`.

### Path Aliases

Use `@/*` for imports from the project root (configured in tsconfig.json).

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

### Supabase Client Usage

- Browser: `import { createClient } from '@/lib/supabase/client'`
- Server Components/API Routes: `import { createClient } from '@/lib/supabase/server'`
- Middleware: Uses `@/lib/supabase/middleware`

### TypeScript Patterns

When working with React Flow nodes, use double assertion for NodeProps data:
```typescript
const nodeData = data as unknown as SectionNodeData;
```

FlowEdge type requires `sourceHandle` and `targetHandle` properties (can be `null`).
