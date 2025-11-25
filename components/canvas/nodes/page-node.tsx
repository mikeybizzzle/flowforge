"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { PageNodeData } from "@/types";
import { cn, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { LayoutPanelTop, FileText, Settings, Component } from "lucide-react";

export const PageNode = memo(function PageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as PageNodeData;
  const { setSelectedNode, setConfigDialogNodeId } = useCanvasStore();

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
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
          className="flex-1 text-xs h-7 px-2"
          onClick={handleSettings}
        >
          <Settings className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7 px-2">
          <FileText className="w-3 h-3 mr-1" />
          PRD
        </Button>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />
    </div>
  );
});
