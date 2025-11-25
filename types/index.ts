// Database types (matches Supabase schema)
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          settings: ProjectSettings;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          settings?: ProjectSettings;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          settings?: ProjectSettings;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nodes: {
        Row: {
          id: string;
          project_id: string;
          type: NodeType;
          position: { x: number; y: number };
          data: NodeData;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: NodeType;
          position: { x: number; y: number };
          data: NodeData;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: NodeType;
          position?: { x: number; y: number };
          data?: NodeData;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      edges: {
        Row: {
          id: string;
          project_id: string;
          source_id: string;
          target_id: string;
          type: 'default' | 'data-flow' | 'hierarchy';
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source_id: string;
          target_id: string;
          type?: 'default' | 'data-flow' | 'hierarchy';
          data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          source_id?: string;
          target_id?: string;
          type?: 'default' | 'data-flow' | 'hierarchy';
          data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          node_id: string;
          type: 'prd' | 'code' | 'analysis';
          content: string;
          metadata: Record<string, unknown> | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          node_id: string;
          type: 'prd' | 'code' | 'analysis';
          content: string;
          metadata?: Record<string, unknown> | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          node_id?: string;
          type?: 'prd' | 'code' | 'analysis';
          content?: string;
          metadata?: Record<string, unknown> | null;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          node_id: string | null;
          role: 'user' | 'assistant';
          content: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          node_id?: string | null;
          role: 'user' | 'assistant';
          content: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          node_id?: string | null;
          role?: 'user' | 'assistant';
          content?: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Project
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  industry?: string;
  target_audience?: string;
  brand_voice?: string;
  color_palette?: ColorPalette;
  typography?: Typography;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface Typography {
  heading_font: string;
  body_font: string;
}

// Canvas Node Types
export type NodeType = 
  | 'project' 
  | 'competitor' 
  | 'design' 
  | 'goals'
  | 'page' 
  | 'section' 
  | 'feature'
  | 'prd';

export interface CanvasNode {
  id: string;
  project_id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

// Node Data by Type
export type NodeData = 
  | ProjectNodeData 
  | CompetitorNodeData 
  | DesignNodeData 
  | GoalsNodeData
  | PageNodeData 
  | SectionNodeData 
  | FeatureNodeData
  | PRDNodeData;

export interface ProjectNodeData {
  type: 'project';
  name: string;
  description?: string;
  industry?: string;
  target_audience?: string;
  brand_voice?: string;
  [key: string]: unknown;
}

export interface CompetitorNodeData {
  type: 'competitor';
  url: string;
  name?: string;
  screenshot?: string;
  analysis?: CompetitorAnalysis;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  [key: string]: unknown;
}

export interface CompetitorAnalysis {
  strengths: string[];
  weaknesses: string[];
  design_patterns: string[];
  messaging_style: string;
  unique_features: string[];
  ctas: string[];
}

export interface DesignNodeData {
  type: 'design';
  source_type: 'url' | 'upload' | 'screenshot';
  source: string;
  thumbnail?: string;
  extraction?: DesignExtraction;
  notes?: string;
  status: 'pending' | 'extracting' | 'complete' | 'error';
  [key: string]: unknown;
}

export interface DesignExtraction {
  color_palette: string[];
  typography: {
    detected: string[];
    suggestions: string[];
  };
  layout_patterns: string[];
  style_mood: string;
  components: string[];
}

export interface GoalsNodeData {
  type: 'goals';
  objectives: {
    id: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
    measurable?: string;
  }[];
  constraints?: string[];
  timeline?: string;
  [key: string]: unknown;
}

export interface PageNodeData {
  type: 'page';
  name: string;
  route: string;
  description?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  section_ids: string[];
  prd?: {
    content: string;
    generated_at: string;
    version: number;
  };
  status: 'planning' | 'building' | 'complete';
  [key: string]: unknown;
}

export type SectionType = 
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'pricing'
  | 'faq'
  | 'team'
  | 'stats'
  | 'gallery'
  | 'contact'
  | 'newsletter'
  | 'footer'
  | 'custom';

export interface SectionNodeData {
  type: 'section';
  section_type: SectionType;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  content?: {
    generated: string;
    version: number;
    generated_at: string;
  };
  status: 'draft' | 'building' | 'complete' | 'error';
  [key: string]: unknown;
}

export interface FeatureNodeData {
  type: 'feature';
  name: string;
  description?: string;
  requirements?: string[];
  integrations?: string[];
  status: 'draft' | 'building' | 'complete';
  [key: string]: unknown;
}

export interface PRDNodeData {
  type: 'prd';
  source_node_ids: string[];
  content: string;
  format: 'markdown' | 'notion' | 'linear';
  generated_at: string;
  version: number;
  [key: string]: unknown;
}

// Canvas Edge
export interface CanvasEdge {
  id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  type: 'default' | 'data-flow' | 'hierarchy';
  data?: Record<string, unknown>;
  created_at: string;
}

// Generation
export interface Generation {
  id: string;
  node_id: string;
  type: 'prd' | 'code' | 'analysis';
  content: string;
  metadata?: Record<string, unknown>;
  version: number;
  created_at: string;
}

// Message (Chat)
export interface Message {
  id: string;
  project_id: string;
  node_id?: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    context_nodes?: string[];
    action?: 'analyze' | 'build' | 'generate' | 'chat';
  };
  created_at: string;
}

// UI State Types
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export type ActivePanel = 'chat' | 'config' | 'code' | null;
export type ActiveView = 'canvas' | 'preview';

// React Flow Node/Edge types for UI
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  data?: Record<string, unknown>;
  sourceHandle: string | null;
  targetHandle: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface AIGenerationRequest {
  node_id: string;
  node_data: NodeData;
  context: NodeData[];
  project_settings?: ProjectSettings;
}

export interface AIGenerationResponse {
  content: string;
  metadata?: Record<string, unknown>;
}
