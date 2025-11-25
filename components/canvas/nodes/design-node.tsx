"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { DesignNodeData, ColorPalette, Typography } from "@/types";
import { cn, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Palette, Loader2, Check, ImagePlus, Settings } from "lucide-react";

export const DesignNode = memo(function DesignNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as DesignNodeData;
  const { setSelectedNode, setConfigDialogNodeId, updateNode, project, setProject } = useCanvasStore();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
  };

  const handleExtract = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if source URL is provided
    if (!nodeData.source) {
      toast.error("Please add a URL first", {
        description: "Click the settings button to configure the design source",
      });
      setSelectedNode(id);
      setConfigDialogNodeId(id);
      return;
    }

    setIsExtracting(true);
    updateNode(id, { status: "extracting" });
    const toastId = toast.loading("Extracting design patterns...");

    try {
      const response = await fetch("/api/design-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          url: nodeData.source,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract design");
      }

      const result = await response.json();

      updateNode(id, {
        status: "complete",
        extraction: result.extraction,
      });

      toast.success("Design patterns extracted!", {
        id: toastId,
        description: `Found ${result.extraction.color_palette?.length || 0} colors`,
      });
    } catch (error) {
      console.error("Extraction error:", error);
      updateNode(id, { status: "error" });
      toast.error("Extraction failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyToProject = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!nodeData.extraction || !project) {
      toast.error("No extraction data or project available");
      return;
    }

    setIsApplying(true);
    const toastId = toast.loading("Applying design to project...");

    try {
      const { color_palette, typography } = nodeData.extraction;

      // Map extracted colors to project color palette
      const newColorPalette: ColorPalette = {
        primary: color_palette[0] || project.settings?.color_palette?.primary || "#3B82F6",
        secondary: color_palette[1] || project.settings?.color_palette?.secondary || "#6B7280",
        accent: color_palette[2] || project.settings?.color_palette?.accent || "#F59E0B",
        background: color_palette[3] || project.settings?.color_palette?.background || "#FFFFFF",
        text: color_palette[4] || project.settings?.color_palette?.text || "#111827",
      };

      // Map extracted typography
      const newTypography: Typography = {
        heading_font: typography?.detected?.[0] || typography?.suggestions?.[0] || "Inter",
        body_font: typography?.detected?.[1] || typography?.suggestions?.[1] || "Inter",
      };

      // Update project settings
      const supabase = createClient();
      const newSettings = {
        ...project.settings,
        color_palette: newColorPalette,
        typography: newTypography,
      };

      const { error } = await supabase
        .from("projects")
        .update({ settings: newSettings })
        .eq("id", project.id);

      if (error) throw error;

      // Update store
      setProject({ ...project, settings: newSettings });

      toast.success("Design applied to project!", {
        id: toastId,
        description: "Colors and typography have been updated",
      });
    } catch (error) {
      console.error("Apply error:", error);
      toast.error("Failed to apply design", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const isLoading = isExtracting || nodeData.status === "extracting";

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

      {/* Source URL display */}
      {nodeData.source && (
        <p className="text-xs text-muted-foreground mb-2 truncate" title={nodeData.source}>
          {nodeData.source}
        </p>
      )}

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
        <Badge variant="secondary" className="text-xs mb-2">
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
        {nodeData.status === "pending" || nodeData.status === "error" ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={handleExtract}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Palette className="w-3 h-3 mr-1" />
                Extract Patterns
              </>
            )}
          </Button>
        ) : nodeData.status === "complete" ? (
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs h-7"
            onClick={handleApplyToProject}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply to Project"
            )}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-7" disabled>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Extracting...
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
