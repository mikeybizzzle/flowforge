"use client";

import { useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useChatStore } from "@/lib/stores/chat-store";
import type { Project, CanvasNode, CanvasEdge, Message, FlowNode, FlowEdge } from "@/types";
import { ProjectEditorHeader } from "./project-editor-header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { StrategyCanvas } from "@/components/canvas/strategy-canvas";
import { PreviewPanel } from "@/components/preview/preview-panel";

interface ProjectEditorProps {
  project: Project;
  initialNodes: CanvasNode[];
  initialEdges: CanvasEdge[];
  initialMessages: Message[];
}

// Transform database nodes to React Flow nodes
function transformNodes(nodes: CanvasNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

// Transform database edges to React Flow edges
function transformEdges(edges: CanvasEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source_id,
    target: edge.target_id,
    type: edge.type,
    data: edge.data,
    sourceHandle: null,
    targetHandle: null,
  }));
}

export function ProjectEditor({
  project,
  initialNodes,
  initialEdges,
  initialMessages,
}: ProjectEditorProps) {
  const { setProject, setNodes, setEdges, activeView } = useCanvasStore();
  const { setMessages } = useChatStore();

  // Initialize stores with data
  useEffect(() => {
    setProject(project);
    setNodes(transformNodes(initialNodes));
    setEdges(transformEdges(initialEdges));
    setMessages(initialMessages);

    // Cleanup on unmount
    return () => {
      useCanvasStore.getState().reset();
      useChatStore.getState().clearMessages();
    };
  }, [project, initialNodes, initialEdges, initialMessages, setProject, setNodes, setEdges, setMessages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Editor Header */}
      <ProjectEditorHeader project={project} />

      {/* Split View */}
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Chat */}
        <Panel defaultSize={35} minSize={25} maxSize={50}>
          <ChatPanel projectId={project.id} />
        </Panel>

        <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors" />

        {/* Right Panel - Canvas or Preview */}
        <Panel defaultSize={65} minSize={40}>
          {activeView === "canvas" ? (
            <StrategyCanvas projectId={project.id} />
          ) : (
            <PreviewPanel />
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}
