"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { CompetitorNodeData } from "@/types";
import { cn, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Settings,
  Search,
} from "lucide-react";

// Safe URL hostname extraction
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const CompetitorNode = memo(function CompetitorNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as CompetitorNodeData;
  const { setSelectedNode, setConfigDialogNodeId, updateNode } = useCanvasStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const statusIcon = {
    pending: null,
    analyzing: <Loader2 className="w-3 h-3 animate-spin" />,
    complete: <Check className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setConfigDialogNodeId(id);
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!nodeData.url) {
      toast.error("Please add a URL first", {
        description: "Click the settings button to add a competitor URL",
      });
      setConfigDialogNodeId(id);
      return;
    }

    setIsAnalyzing(true);
    updateNode(id, { status: "analyzing" });

    const toastId = toast.loading(`Analyzing ${nodeData.name || getHostname(nodeData.url)}...`);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          url: nodeData.url,
          name: nodeData.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze competitor");
      }

      const result = await response.json();

      // Update node with analysis results
      updateNode(id, {
        status: "complete",
        analysis: result.analysis,
      });

      toast.success("Analysis complete!", {
        id: toastId,
        description: `Found ${result.analysis.strengths?.length || 0} strengths and ${result.analysis.unique_features?.length || 0} unique features`,
      });

    } catch (error) {
      console.error("Analysis error:", error);
      updateNode(id, { status: "error" });
      toast.error("Analysis failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);

    if (nodeData.analysis) {
      toast.info(
        <div className="space-y-2">
          <p className="font-medium">Strengths:</p>
          <ul className="text-xs list-disc pl-4">
            {nodeData.analysis.strengths?.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {nodeData.analysis.messaging_style && (
            <>
              <p className="font-medium mt-2">Messaging:</p>
              <p className="text-xs">{nodeData.analysis.messaging_style}</p>
            </>
          )}
        </div>,
        {
          duration: 10000,
        }
      );
    }
  };

  const currentStatus = isAnalyzing ? "analyzing" : nodeData.status;

  return (
    <div
      className={cn(
        "w-[220px] rounded-xl border bg-card p-3 shadow-md transition-all",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Competitor
          </span>
        </div>
        <Badge variant="outline" className={cn("text-xs", getStatusColor(currentStatus))}>
          {statusIcon[currentStatus]}
          <span className="ml-1 capitalize">{currentStatus}</span>
        </Badge>
      </div>

      {/* Content */}
      <h4 className="font-medium text-foreground mb-1 truncate">
        {nodeData.name || "Unnamed Competitor"}
      </h4>
      {nodeData.url && (
        <a
          href={nodeData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {getHostname(nodeData.url)}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )}

      {/* Screenshot Thumbnail */}
      {nodeData.screenshot && (
        <div className="mt-2 rounded-md overflow-hidden border border-border">
          <img
            src={nodeData.screenshot}
            alt={nodeData.name || "Competitor"}
            className="w-full h-24 object-cover"
          />
        </div>
      )}

      {/* Analysis Summary */}
      {nodeData.analysis && nodeData.status === "complete" && (
        <div className="mt-2 p-2 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Key Insights:</p>
          <div className="flex flex-wrap gap-1">
            {nodeData.analysis.strengths?.slice(0, 2).map((strength, i) => (
              <Badge key={i} variant="secondary" className="text-xs truncate max-w-full">
                {strength.length > 25 ? strength.substring(0, 25) + "..." : strength}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2"
          onClick={handleSettings}
          disabled={isAnalyzing}
        >
          <Settings className="w-3 h-3" />
        </Button>

        {currentStatus === "pending" || currentStatus === "error" ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Search className="w-3 h-3 mr-1" />
                Analyze
              </>
            )}
          </Button>
        ) : currentStatus === "complete" ? (
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs h-7"
            onClick={handleViewAnalysis}
          >
            View Analysis
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-7" disabled>
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Analyzing...
          </Button>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
});
