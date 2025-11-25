"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { DesignNodeData } from "@/types";
import { cn, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { Palette, Loader2, Check, ImagePlus, Settings } from "lucide-react";

export const DesignNode = memo(function DesignNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as DesignNodeData;
  const { setSelectedNode, setConfigDialogNodeId } = useCanvasStore();

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
  };

  return (
    <div
      className={cn(
        "w-[220px] rounded-xl border bg-card p-3 shadow-md transition-all",
        selected
          ? "border-purple-500 ring-2 ring-purple-500/20"
          : "border-border hover:border-purple-500/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-500" />
          <span className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            Design
          </span>
        </div>
        <Badge variant="outline" className={cn("text-xs", getStatusColor(nodeData.status))}>
          {nodeData.status === "extracting" && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {nodeData.status === "complete" && <Check className="w-3 h-3 mr-1" />}
          <span className="capitalize">{nodeData.status}</span>
        </Badge>
      </div>

      {/* Content */}
      <h4 className="font-medium text-foreground mb-2">
        Design Inspiration
      </h4>

      {/* Thumbnail or Placeholder */}
      {nodeData.thumbnail ? (
        <div className="rounded-md overflow-hidden border border-border mb-2">
          <img
            src={nodeData.thumbnail}
            alt="Design inspiration"
            className="w-full h-24 object-cover"
          />
        </div>
      ) : (
        <div className="rounded-md border-2 border-dashed border-border mb-2 h-24 flex items-center justify-center">
          <div className="text-center">
            <ImagePlus className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">Upload or enter URL</span>
          </div>
        </div>
      )}

      {/* Extracted Colors */}
      {nodeData.extraction?.color_palette && nodeData.extraction.color_palette.length > 0 && (
        <div className="flex gap-1 mb-2">
          {nodeData.extraction.color_palette.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Style Mood */}
      {nodeData.extraction?.style_mood && (
        <Badge variant="secondary" className="text-xs">
          {nodeData.extraction.style_mood}
        </Badge>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2"
          onClick={handleSettings}
        >
          <Settings className="w-3 h-3" />
        </Button>
        {nodeData.status === "pending" ? (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
            <Palette className="w-3 h-3 mr-1" />
            Extract Patterns
          </Button>
        ) : nodeData.status === "complete" ? (
          <Button size="sm" variant="ghost" className="flex-1 text-xs h-7">
            Apply to Project
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-7" disabled>
            {nodeData.status === "extracting" ? "Extracting..." : "Error"}
          </Button>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
    </div>
  );
});
