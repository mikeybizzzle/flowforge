"use client";

import { useState } from "react";
import Link from "next/link";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Play,
  Download,
  Settings,
  LayoutGrid,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import { toast } from "sonner";

interface ProjectEditorHeaderProps {
  project: Project;
}

export function ProjectEditorHeader({ project }: ProjectEditorHeaderProps) {
  const { activeView, setActiveView, project: storeProject } = useCanvasStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Use store project if available (it gets updated when settings change)
  const currentProject = storeProject || project;

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Preparing export...");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          options: {
            includeComponents: true,
            includeStyles: true,
            includeConfigs: true,
            format: "nextjs",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export project");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, "-")}-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Project exported!", {
        id: toastId,
        description: "Your Next.js project is ready",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeploy = () => {
    toast.info("Deploy feature coming soon", {
      description: "One-click deployment to Vercel or Netlify",
    });
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        {/* Left: Back + Project Name */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/projects">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Projects</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <div>
            <h1 className="font-semibold text-foreground">{currentProject.name}</h1>
            {currentProject.settings?.industry && (
              <p className="text-xs text-muted-foreground">
                {currentProject.settings.industry}
              </p>
            )}
          </div>
        </div>

        {/* Center: View Toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveView("canvas")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeView === "canvas"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Strategy Canvas
          </button>
          <button
            onClick={() => setActiveView("preview")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeView === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="w-4 h-4" />
            Live Preview
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Project Settings</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Project</TooltipContent>
          </Tooltip>

          <Button onClick={handleDeploy}>
            <Play className="w-4 h-4 mr-2" />
            Deploy
          </Button>
        </div>
      </header>

      <ProjectSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
