"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { PageNodeData } from "@/types";
import { cn, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { toast } from "sonner";
import { LayoutPanelTop, FileText, Settings, Component, Loader2 } from "lucide-react";
import { PRDViewerDialog } from "../prd-viewer-dialog";

export const PageNode = memo(function PageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as PageNodeData;
  const { setSelectedNode, setConfigDialogNodeId, getNodeContext, project, updateNode } = useCanvasStore();
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false);
  const [isPRDDialogOpen, setIsPRDDialogOpen] = useState(false);

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
  };

  const handlePRDClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPRDDialogOpen(true);
  };

  const handleGeneratePRD = async () => {
    setIsGeneratingPRD(true);
    updateNode(id, { status: "building" });
    const toastId = toast.loading("Generating PRD...");

    try {
      // Gather context from connected nodes
      const context = getNodeContext(id);

      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          context,
          projectSettings: project?.settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PRD");
      }

      const result = await response.json();

      updateNode(id, {
        status: "complete",
        prd: result.prd,
      });

      toast.success("PRD generated!", {
        id: toastId,
        description: `Version ${result.prd.version}`,
      });
    } catch (error) {
      console.error("PRD generation error:", error);
      updateNode(id, { status: "planning" });
      toast.error("PRD generation failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGeneratingPRD(false);
    }
  };

  return (
    <div
      className={cn(
        "w-[200px] rounded-xl border bg-card p-3 shadow-md transition-all",
        selected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-border hover:border-blue-500/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <LayoutPanelTop className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Page
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Component className="w-3 h-3 mr-1" />
          {nodeData.section_ids?.length || 0}
        </Badge>
      </div>

      {/* Content */}
      <h4 className="font-medium text-foreground mb-1">
        {nodeData.name || "Untitled Page"}
      </h4>
      <p className="text-xs text-muted-foreground font-mono mb-2">
        {nodeData.route || "/"}
      </p>

      {/* Status */}
      <Badge variant="outline" className={cn("text-xs mb-3", getStatusColor(nodeData.status))}>
        {nodeData.status}
      </Badge>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2"
          onClick={handleSettings}
        >
          <Settings className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant={nodeData.prd ? "ghost" : "outline"}
          className="flex-1 text-xs h-7 px-2"
          onClick={handlePRDClick}
          disabled={isGeneratingPRD}
        >
          {isGeneratingPRD ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-3 h-3 mr-1" />
              {nodeData.prd ? "View PRD" : "PRD"}
            </>
          )}
        </Button>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />

      {/* PRD Viewer Dialog */}
      <PRDViewerDialog
        open={isPRDDialogOpen}
        onOpenChange={setIsPRDDialogOpen}
        pageName={nodeData.name || "Untitled Page"}
        prd={nodeData.prd}
        onRegenerate={handleGeneratePRD}
        isRegenerating={isGeneratingPRD}
      />
    </div>
  );
});
