"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  BackgroundVariant,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "@/lib/stores/canvas-store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Plus, Globe, Palette, LayoutPanelTop, Component } from "lucide-react";
import type { NodeType, NodeData, CompetitorNodeData, DesignNodeData, PageNodeData, SectionNodeData, ProjectNodeData } from "@/types";

// Import custom nodes
import { ProjectNode } from "./nodes/project-node";
import { CompetitorNode } from "./nodes/competitor-node";
import { DesignNode } from "./nodes/design-node";
import { PageNode } from "./nodes/page-node";
import { SectionNode } from "./nodes/section-node";
import { NodeConfigDialog } from "./node-config-dialog";

interface StrategyCanvasProps {
  projectId: string;
}

// Register custom node types
const nodeTypes: NodeTypes = {
  project: ProjectNode,
  competitor: CompetitorNode,
  design: DesignNode,
  page: PageNode,
  section: SectionNode,
};

export function StrategyCanvas({ projectId }: StrategyCanvasProps) {
  const supabase = createClient();
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    setSelectedNode,
    updateNodePosition,
    configDialogNodeId,
    setConfigDialogNodeId,
  } = useCanvasStore();

  // React Flow state - cast to React Flow types
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes as Node[]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges as Edge[]);

  // Sync store changes to React Flow
  useEffect(() => {
    setRfNodes(nodes as Node[]);
  }, [nodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(edges as Edge[]);
  }, [edges, setRfEdges]);

  // Handle connection
  const onConnect = useCallback(
    async (params: Connection) => {
      const newEdge: Edge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle ?? null,
        targetHandle: params.targetHandle ?? null,
        type: "default",
      };
      setRfEdges((eds) => [...eds, newEdge]);

      // Save to database
      const { error } = await supabase.from("edges").insert({
        project_id: projectId,
        source_id: params.source,
        target_id: params.target,
        type: "default",
      });

      if (error) {
        console.error("Failed to save edge:", error);
      }
    },
    [projectId, setRfEdges, supabase]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Handle node drag end - persist position
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
      updateNodePosition(node.id, node.position);

      // Save to database
      const { error } = await supabase
        .from("nodes")
        .update({ position: node.position })
        .eq("id", node.id);

      if (error) {
        console.error("Failed to update node position:", error);
      }
    },
    [updateNodePosition, supabase]
  );

  // Add new node
  const handleAddNode = async (type: NodeType) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };

    const nodeDataMap: Record<NodeType, NodeData> = {
      project: { type: "project", name: "New Project" } as ProjectNodeData,
      competitor: { type: "competitor", url: "", status: "pending" } as CompetitorNodeData,
      design: { type: "design", source_type: "url", source: "", status: "pending" } as DesignNodeData,
      page: { type: "page", name: "New Page", route: "/new-page", section_ids: [], status: "planning" } as PageNodeData,
      section: { type: "section", section_type: "hero", name: "New Section", config: {}, status: "draft" } as SectionNodeData,
      goals: { type: "goals", objectives: [] },
      feature: { type: "feature", name: "New Feature", status: "draft" },
      prd: { type: "prd", source_node_ids: [], content: "", format: "markdown", generated_at: new Date().toISOString(), version: 1 },
    };

    // Add to store
    const nodeId = addNode({
      type,
      position,
      data: nodeDataMap[type],
    });

    // Save to database
    const { error } = await supabase.from("nodes").insert({
      id: nodeId,
      project_id: projectId,
      type,
      position,
      data: nodeDataMap[type],
    });

    if (error) {
      console.error("Failed to save node:", error);
    }

    // Select the new node
    setSelectedNode(nodeId);
  };

  return (
    <div className="w-full h-full">
      <NodeConfigDialog
        open={configDialogNodeId !== null}
        onOpenChange={(open) => !open && setConfigDialogNodeId(null)}
        nodeId={configDialogNodeId}
      />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-card border border-border rounded-lg"
        />

        {/* Add Node Panel */}
        <Panel position="top-right">
          <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
              Add Node
            </p>
            <div className="space-y-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Node
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Planning</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleAddNode("competitor" as NodeType)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Competitor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddNode("design" as NodeType)}>
                    <Palette className="w-4 h-4 mr-2" />
                    Design Inspiration
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Structure</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleAddNode("page" as NodeType)}>
                    <LayoutPanelTop className="w-4 h-4 mr-2" />
                    Page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddNode("section" as NodeType)}>
                    <Component className="w-4 h-4 mr-2" />
                    Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Panel>

        {/* Help Text */}
        <Panel position="bottom-left">
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
            Drag to connect nodes • Click to select • Scroll to zoom
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
