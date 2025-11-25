"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, Download, RefreshCw, FileText, Clock } from "lucide-react";

interface PRDData {
  content: string;
  generated_at: string;
  version: number;
}

interface PRDViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageName: string;
  prd: PRDData | undefined;
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
}

export function PRDViewerDialog({
  open,
  onOpenChange,
  pageName,
  prd,
  onRegenerate,
  isRegenerating = false,
}: PRDViewerDialogProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (!prd?.content) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(prd.content);
      toast.success("PRD copied to clipboard");
    } catch {
      toast.error("Failed to copy PRD");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = () => {
    if (!prd?.content) return;

    const blob = new Blob([prd.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pageName.toLowerCase().replace(/\s+/g, "-")}-prd.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("PRD downloaded");
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <DialogTitle>{pageName} - PRD</DialogTitle>
            </div>
            {prd && (
              <Badge variant="secondary" className="text-xs">
                v{prd.version}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Product Requirements Document for the {pageName} page
          </DialogDescription>
        </DialogHeader>

        {prd ? (
          <>
            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Generated: {formatDate(prd.generated_at)}</span>
              </div>
            </div>

            <Separator />

            {/* PRD Content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <PRDContent content={prd.content} />
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium text-foreground">No PRD Generated</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a PRD to get detailed requirements for this page.
                </p>
              </div>
              {onRegenerate && (
                <Button onClick={onRegenerate} disabled={isRegenerating}>
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate PRD"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex gap-2">
            {prd && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {isCopying ? "Copying..." : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {prd && onRegenerate && (
              <Button
                variant="outline"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple markdown-like content renderer
 * Renders basic markdown formatting without external dependencies
 */
function PRDContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let currentKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === "ol") {
        elements.push(
          <ol key={currentKey++} className="list-decimal list-inside mb-4 space-y-1">
            {listItems.map((item, i) => (
              <li key={i} className="text-sm">{renderInlineFormatting(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={currentKey++} className="list-disc list-inside mb-4 space-y-1">
            {listItems.map((item, i) => (
              <li key={i} className="text-sm">{renderInlineFormatting(item)}</li>
            ))}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={currentKey++} className="text-xl font-bold mt-6 mb-3 text-foreground">
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={currentKey++} className="text-lg font-semibold mt-5 mb-2 text-foreground">
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={currentKey++} className="text-base font-medium mt-4 mb-2 text-foreground">
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4 key={currentKey++} className="text-sm font-medium mt-3 mb-1 text-foreground">
          {renderInlineFormatting(line.slice(5))}
        </h4>
      );
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      flushList();
      elements.push(<Separator key={currentKey++} className="my-4" />);
    }
    // Unordered list item
    else if (line.match(/^[-*]\s/)) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(line.slice(2));
    }
    // Ordered list item
    else if (line.match(/^\d+\.\s/)) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(line.replace(/^\d+\.\s/, ""));
    }
    // Empty line
    else if (line.trim() === "") {
      flushList();
      elements.push(<div key={currentKey++} className="h-2" />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={currentKey++} className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  flushList();

  return <>{elements}</>;
}

/**
 * Render inline markdown formatting (bold, italic, code)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Split by markdown patterns and render appropriately
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/) ||
                      remaining.match(/^(.*?)__(.+?)__(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) {
        parts.push(<span key={key++}>{processCodeAndLinks(boldMatch[1])}</span>);
      }
      parts.push(<strong key={key++} className="font-semibold text-foreground">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/) ||
                        remaining.match(/^(.*?)_(.+?)_(.*)$/);
    if (italicMatch) {
      if (italicMatch[1]) {
        parts.push(<span key={key++}>{processCodeAndLinks(italicMatch[1])}</span>);
      }
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }

    // No more formatting found
    parts.push(<span key={key++}>{processCodeAndLinks(remaining)}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Process inline code and links
 */
function processCodeAndLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) {
        parts.push(codeMatch[1]);
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    // No more patterns
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
