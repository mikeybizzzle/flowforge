"use client";

import { useState, useMemo } from "react";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackLayout,
} from "@codesandbox/sandpack-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Code,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SectionNodeData } from "@/types";

type ViewportSize = "desktop" | "tablet" | "mobile";

const viewportSizes: Record<ViewportSize, { width: string; icon: React.ReactNode }> = {
  desktop: { width: "100%", icon: <Monitor className="w-4 h-4" /> },
  tablet: { width: "768px", icon: <Tablet className="w-4 h-4" /> },
  mobile: { width: "375px", icon: <Smartphone className="w-4 h-4" /> },
};

// Extract code from markdown code blocks if present
function extractCode(code: string): string {
  // Check for ```tsx or ```jsx code block
  const codeBlockMatch = code.match(/```(?:tsx|jsx|javascript|typescript)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return code;
}

// Wrap the generated component for Sandpack
function wrapForSandpack(code: string): string {
  const cleanCode = extractCode(code);

  // Check if the code already has a default export
  if (cleanCode.includes("export default")) {
    return cleanCode;
  }

  // Check for named function or const that could be the main component
  const componentMatch = cleanCode.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
  if (componentMatch) {
    const componentName = componentMatch[1];
    // Check if it's already exported
    if (!cleanCode.includes(`export { ${componentName}`) && !cleanCode.includes(`export const ${componentName}`)) {
      return `${cleanCode}\n\nexport default ${componentName};`;
    }
    // If exported but not as default
    return cleanCode.replace(
      new RegExp(`export (?:const|function) ${componentName}`),
      `export default function ${componentName}`
    );
  }

  // Wrap raw JSX in a component
  if (cleanCode.includes("<") && !cleanCode.includes("function") && !cleanCode.includes("const")) {
    return `export default function GeneratedComponent() {\n  return (\n    ${cleanCode}\n  );\n}`;
  }

  return cleanCode;
}

export function PreviewPanel() {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { nodes, selectedNodeId } = useCanvasStore();

  // Get generated content from selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const sectionData = selectedNode?.data?.type === "section"
    ? selectedNode.data as SectionNodeData
    : null;
  const generatedCode = sectionData?.content?.generated || "";
  const hasGeneratedContent = Boolean(generatedCode);

  // Prepare code for Sandpack
  const sandpackCode = useMemo(() => {
    if (!generatedCode) return "";
    return wrapForSandpack(generatedCode);
  }, [generatedCode]);

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(extractCode(generatedCode));
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {/* Viewport Switcher */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setViewport(size)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewport === size
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={size.charAt(0).toUpperCase() + size.slice(1)}
              >
                {viewportSizes[size].icon}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setShowCode(false)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                !showCode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setShowCode(true)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                showCode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code className="w-3 h-3" />
              Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasGeneratedContent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyCode}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={!hasGeneratedContent}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          className={cn(
            "bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300",
            viewport === "desktop" ? "w-full" : ""
          )}
          style={{
            width: viewportSizes[viewport].width,
            maxWidth: "100%",
          }}
        >
          {hasGeneratedContent ? (
            showCode ? (
              /* Code View with Sandpack Editor */
              <div className="h-[500px]">
                <SandpackProvider
                  key={`code-${refreshKey}`}
                  template="react-ts"
                  theme="dark"
                  files={{
                    "/App.tsx": sandpackCode,
                  }}
                  customSetup={{
                    dependencies: {
                      "lucide-react": "latest",
                    },
                  }}
                >
                  <SandpackCodeEditor
                    showLineNumbers
                    showTabs={false}
                    style={{ height: "100%" }}
                  />
                </SandpackProvider>
              </div>
            ) : (
              /* Live Preview with Sandpack */
              <div className="min-h-[400px]">
                <SandpackProvider
                  key={`preview-${refreshKey}`}
                  template="react-ts"
                  theme="light"
                  files={{
                    "/App.tsx": sandpackCode,
                  }}
                  customSetup={{
                    dependencies: {
                      "lucide-react": "latest",
                    },
                  }}
                  options={{
                    externalResources: [
                      "https://cdn.tailwindcss.com",
                    ],
                  }}
                >
                  <SandpackLayout>
                    <SandpackPreview
                      showOpenInCodeSandbox={false}
                      showRefreshButton={false}
                      style={{ height: "500px" }}
                    />
                  </SandpackLayout>
                </SandpackProvider>
              </div>
            )
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Preview Available
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                Select a section on the canvas and click &quot;Build&quot; to generate code,
                then see a live preview here.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className="text-slate-600">
                  1. Add sections to canvas
                </Badge>
                <Badge variant="outline" className="text-slate-600">
                  2. Configure content
                </Badge>
                <Badge variant="outline" className="text-slate-600">
                  3. Click Build
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Viewport: {viewport}</span>
          {selectedNode && (
            <span>
              Selected: {(selectedNode.data as SectionNodeData)?.name || selectedNode.type}
            </span>
          )}
          {sectionData?.content?.version && (
            <span>Version: {sectionData.content.version}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            hasGeneratedContent ? "bg-green-500" : "bg-yellow-500"
          )} />
          <span>{hasGeneratedContent ? "Ready" : "No content"}</span>
        </div>
      </div>
    </div>
  );
}
