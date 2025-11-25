"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import type { ProjectNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { FolderKanban } from "lucide-react";

export const ProjectNode = memo(function ProjectNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as ProjectNodeData;

  return (
    <div
      className={cn(
        "w-[280px] rounded-xl border-2 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-lg transition-all",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-forge-500/50 hover:border-forge-500"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-forge-500/20 flex items-center justify-center">
          <FolderKanban className="w-5 h-5 text-forge-400" />
        </div>
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wide">
            Project
          </span>
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-white mb-1">
        {nodeData.name || "Untitled Project"}
      </h3>
      {nodeData.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-2">
          {nodeData.description}
        </p>
      )}
      
      {/* Meta */}
      <div className="flex flex-wrap gap-2 mt-3">
        {nodeData.industry && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
            {nodeData.industry}
          </span>
        )}
        {nodeData.target_audience && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
            {nodeData.target_audience}
          </span>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-forge-500 !border-2 !border-slate-800"
      />
    </div>
  );
});
