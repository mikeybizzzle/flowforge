-- ===========================================
-- FlowForge Database Schema
-- ===========================================
-- Run this in your Supabase SQL Editor to set up the database
-- Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ===========================================
-- Enable UUID Extension
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Projects Table
-- ===========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- ===========================================
-- Nodes Table
-- ===========================================
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('project', 'competitor', 'design', 'goals', 'page', 'section', 'feature', 'prd')),
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_nodes_project_id ON nodes(project_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);

-- ===========================================
-- Edges Table
-- ===========================================
CREATE TABLE IF NOT EXISTS edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'default' CHECK (type IN ('default', 'data-flow', 'hierarchy')),
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_edges_project_id ON edges(project_id);
CREATE INDEX idx_edges_source_id ON edges(source_id);
CREATE INDEX idx_edges_target_id ON edges(target_id);

-- Unique constraint to prevent duplicate edges
CREATE UNIQUE INDEX idx_edges_unique ON edges(source_id, target_id);

-- ===========================================
-- Generations Table
-- ===========================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('prd', 'code', 'analysis')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generations_node_id ON generations(node_id);
CREATE INDEX idx_generations_type ON generations(type);

-- ===========================================
-- Messages Table (Chat History)
-- ===========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_node_id ON messages(node_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Projects Policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Nodes Policies (via project ownership)
CREATE POLICY "Users can view nodes in their projects"
  ON nodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = nodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create nodes in their projects"
  ON nodes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = nodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update nodes in their projects"
  ON nodes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = nodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete nodes in their projects"
  ON nodes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = nodes.project_id AND projects.user_id = auth.uid()
  ));

-- Edges Policies
CREATE POLICY "Users can view edges in their projects"
  ON edges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = edges.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create edges in their projects"
  ON edges FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = edges.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete edges in their projects"
  ON edges FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = edges.project_id AND projects.user_id = auth.uid()
  ));

-- Generations Policies
CREATE POLICY "Users can view generations for their nodes"
  ON generations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nodes 
    JOIN projects ON projects.id = nodes.project_id 
    WHERE nodes.id = generations.node_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create generations for their nodes"
  ON generations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM nodes 
    JOIN projects ON projects.id = nodes.project_id 
    WHERE nodes.id = generations.node_id AND projects.user_id = auth.uid()
  ));

-- Messages Policies
CREATE POLICY "Users can view messages in their projects"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their projects"
  ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid()
  ));

-- ===========================================
-- Updated At Trigger
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Realtime Subscriptions
-- ===========================================
-- Enable realtime for collaborative features (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE edges;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ===========================================
-- Done!
-- ===========================================
-- Your database is now set up for FlowForge.
-- 
-- Next steps:
-- 1. Copy .env.local.example to .env.local
-- 2. Add your Supabase URL and anon key
-- 3. Run: npm install && npm run dev
