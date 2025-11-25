"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NodeData } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, getNodeTypeLabel } from "@/lib/utils";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";

interface ChatPanelProps {
  projectId: string;
}

// Helper to get node name safely
function getNodeName(data: NodeData): string {
  if ('name' in data && typeof data.name === 'string' && data.name) {
    return data.name;
  }
  return 'Untitled';
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { selectedNodeId, nodes, getSelectedNodeData, getNodeContext } = useCanvasStore();
  const { messages, isLoading, addMessage, setLoading } = useChatStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = getSelectedNodeData();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to local state (optimistic update)
    addMessage({
      project_id: projectId,
      node_id: selectedNodeId || undefined,
      role: "user",
      content: userMessage,
    });

    setLoading(true);

    try {
      // Get context from selected node
      const context = selectedNodeId ? getNodeContext(selectedNodeId) : [];

      // Call the actual AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          projectId,
          nodeId: selectedNodeId,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant message to local state
      // Note: The API also saves both messages to the database,
      // so we only need to update local state here
      addMessage({
        project_id: projectId,
        node_id: selectedNodeId || undefined,
        role: "assistant",
        content: data.message,
      });

    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message to chat
      addMessage({
        project_id: projectId,
        role: "assistant",
        content: "Sorry, I encountered an error processing your message. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Context Badge */}
      {selectedNode && (
        <div className="p-3 border-b border-border">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Working on
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {selectedNodeData ? getNodeName(selectedNodeData) : getNodeTypeLabel(selectedNode.type)}
              </span>
              <Badge variant="outline" className="text-xs">
                {getNodeTypeLabel(selectedNode.type)}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-2">
                Start Building with AI
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Select a node on the canvas or describe what you want to build. I&apos;ll help you strategize and generate code.
              </p>
              
              {/* Quick Actions */}
              <div className="mt-6 space-y-2 w-full max-w-xs">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setInput("Analyze my competitors")}>
                  🔍 Analyze competitors
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setInput("Generate a homepage PRD")}>
                  📄 Generate homepage PRD
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setInput("Build hero section")}>
                  🏗️ Build hero section
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-xl px-4 py-3 max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="pr-12 resize-none min-h-[44px] max-h-[150px]"
            rows={1}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
