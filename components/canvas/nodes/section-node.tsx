"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { SectionNodeData } from "@/types";
import { cn, getStatusColor, getSectionTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { toast } from "sonner";
import {
  Component,
  Play,
  Settings,
  Sparkles,
  LayoutTemplate,
  MessageSquareQuote,
  DollarSign,
  HelpCircle,
  Users,
  BarChart3,
  Images,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";

const sectionIcons: Record<string, React.ReactNode> = {
  hero: <Sparkles className="w-4 h-4" />,
  features: <LayoutTemplate className="w-4 h-4" />,
  testimonials: <MessageSquareQuote className="w-4 h-4" />,
  cta: <Sparkles className="w-4 h-4" />,
  pricing: <DollarSign className="w-4 h-4" />,
  faq: <HelpCircle className="w-4 h-4" />,
  team: <Users className="w-4 h-4" />,
  stats: <BarChart3 className="w-4 h-4" />,
  gallery: <Images className="w-4 h-4" />,
  contact: <Phone className="w-4 h-4" />,
  newsletter: <Mail className="w-4 h-4" />,
  footer: <LayoutTemplate className="w-4 h-4" />,
  custom: <Component className="w-4 h-4" />,
};

export const SectionNode = memo(function SectionNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as SectionNodeData;
  const icon = sectionIcons[nodeData.section_type] || <Component className="w-4 h-4" />;
  const [isBuilding, setIsBuilding] = useState(false);

  const { updateNode, getNodeContext, project, setSelectedNode, setConfigDialogNodeId } = useCanvasStore();

  const handleBuild = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!project) {
      toast.error("No project loaded");
      return;
    }

    setIsBuilding(true);
    updateNode(id, { status: "building" });

    const toastId = toast.loading(`Building ${getSectionTypeLabel(nodeData.section_type)} section...`);

    try {
      // Gather context from parent nodes
      const context = getNodeContext(id);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          sectionType: nodeData.section_type,
          config: nodeData.config,
          context: {
            projectName: project.name,
            industry: project.settings?.industry,
            targetAudience: project.settings?.target_audience,
            brandVoice: project.settings?.brand_voice,
            colorPalette: project.settings?.color_palette,
            typography: project.settings?.typography,
            parentNodes: context,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate code");
      }

      const result = await response.json();

      // Update node with generated content
      updateNode(id, {
        status: "complete",
        content: {
          generated: result.code,
          version: result.version,
          generated_at: new Date().toISOString(),
        },
      });

      toast.success(`${getSectionTypeLabel(nodeData.section_type)} section built successfully!`, {
        id: toastId,
        description: `Version ${result.version} generated`,
      });

      // Select the node to show in preview
      setSelectedNode(id);

    } catch (error) {
      console.error("Build error:", error);
      updateNode(id, { status: "error" });
      toast.error("Failed to build section", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
  };

  return (
    <div
      className={cn(
        "w-[180px] rounded-xl border bg-card p-3 shadow-md transition-all",
        selected
          ? "border-green-500 ring-2 ring-green-500/20"
          : "border-border hover:border-green-500/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          {icon}
          <span className="text-xs uppercase tracking-wide">
            Section
          </span>
        </div>
      </div>

      {/* Content */}
      <h4 className="font-medium text-foreground text-sm mb-1">
        {nodeData.name || getSectionTypeLabel(nodeData.section_type)}
      </h4>
      <Badge variant="secondary" className="text-xs mb-2">
        {getSectionTypeLabel(nodeData.section_type)}
      </Badge>

      {/* Status */}
      <Badge variant="outline" className={cn("text-xs block mb-3", getStatusColor(nodeData.status))}>
        {isBuilding ? "building..." : nodeData.status}
      </Badge>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-xs h-7 px-2"
          onClick={handleSettings}
          disabled={isBuilding}
        >
          <Settings className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs h-7 px-2"
          onClick={handleBuild}
          disabled={isBuilding}
        >
          {isBuilding ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Build
            </>
          )}
        </Button>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
      />
    </div>
  );
});
