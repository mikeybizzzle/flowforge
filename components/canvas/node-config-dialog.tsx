"use client";

import { useState, useEffect } from "react";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
  NodeData,
  SectionNodeData,
  PageNodeData,
  CompetitorNodeData,
  DesignNodeData,
  SectionType,
} from "@/types";
import { getSectionTypeLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NodeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string | null;
}

const sectionTypes: SectionType[] = [
  "hero",
  "features",
  "testimonials",
  "cta",
  "pricing",
  "faq",
  "team",
  "stats",
  "gallery",
  "contact",
  "newsletter",
  "footer",
  "custom",
];

export function NodeConfigDialog({ open, onOpenChange, nodeId }: NodeConfigDialogProps) {
  const { nodes, updateNode, project } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data;

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when node changes
  useEffect(() => {
    if (nodeData) {
      setFormData({ ...nodeData });
    }
  }, [nodeData, nodeId]);

  const handleSave = async () => {
    if (!nodeId || !project) return;

    setIsSaving(true);
    try {
      // Update local state
      updateNode(nodeId, formData as Partial<NodeData>);

      // Persist to database
      const supabase = createClient();
      const { error } = await supabase
        .from("nodes")
        .update({ data: formData })
        .eq("id", nodeId);

      if (error) throw error;

      toast.success("Node configuration saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedFormData = (parent: string, key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as Record<string, unknown> || {}),
        [key]: value,
      },
    }));
  };

  if (!nodeData) return null;

  const renderFields = () => {
    switch (nodeData.type) {
      case "section":
        return <SectionFields formData={formData} updateFormData={updateFormData} />;
      case "page":
        return <PageFields formData={formData} updateFormData={updateFormData} updateNestedFormData={updateNestedFormData} />;
      case "competitor":
        return <CompetitorFields formData={formData} updateFormData={updateFormData} />;
      case "design":
        return <DesignFields formData={formData} updateFormData={updateFormData} />;
      default:
        return <GenericFields formData={formData} updateFormData={updateFormData} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure {nodeData.type.charAt(0).toUpperCase() + nodeData.type.slice(1)}
            <Badge variant="secondary" className="text-xs">
              {nodeData.type}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edit the properties for this node. Changes will be saved to your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {renderFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Section-specific fields
function SectionFields({
  formData,
  updateFormData,
}: {
  formData: Record<string, unknown>;
  updateFormData: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Section Name</Label>
        <Input
          id="name"
          value={(formData.name as string) || ""}
          onChange={(e) => updateFormData("name", e.target.value)}
          placeholder="e.g., Main Hero Section"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="section_type">Section Type</Label>
        <select
          id="section_type"
          value={(formData.section_type as string) || "hero"}
          onChange={(e) => updateFormData("section_type", e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {sectionTypes.map((type) => (
            <option key={type} value={type}>
              {getSectionTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={(formData.description as string) || ""}
          onChange={(e) => updateFormData("description", e.target.value)}
          placeholder="Describe what this section should contain..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Custom Configuration (JSON)</Label>
        <Textarea
          value={JSON.stringify(formData.config || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateFormData("config", parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"headline": "Welcome", "subheadline": "..."}'
          rows={4}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Add custom config to influence AI generation (headline, colors, etc.)
        </p>
      </div>
    </>
  );
}

// Page-specific fields
function PageFields({
  formData,
  updateFormData,
  updateNestedFormData,
}: {
  formData: Record<string, unknown>;
  updateFormData: (key: string, value: unknown) => void;
  updateNestedFormData: (parent: string, key: string, value: unknown) => void;
}) {
  const seo = (formData.seo as Record<string, unknown>) || {};

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Page Name</Label>
        <Input
          id="name"
          value={(formData.name as string) || ""}
          onChange={(e) => updateFormData("name", e.target.value)}
          placeholder="e.g., Home Page"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">Route Path</Label>
        <Input
          id="route"
          value={(formData.route as string) || ""}
          onChange={(e) => updateFormData("route", e.target.value)}
          placeholder="e.g., /home or /about"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Page Description</Label>
        <Textarea
          id="description"
          value={(formData.description as string) || ""}
          onChange={(e) => updateFormData("description", e.target.value)}
          placeholder="Describe the purpose of this page..."
          rows={2}
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">SEO Settings</h4>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="seo-title">SEO Title</Label>
            <Input
              id="seo-title"
              value={(seo.title as string) || ""}
              onChange={(e) => updateNestedFormData("seo", "title", e.target.value)}
              placeholder="Page title for search engines"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-description">Meta Description</Label>
            <Textarea
              id="seo-description"
              value={(seo.description as string) || ""}
              onChange={(e) => updateNestedFormData("seo", "description", e.target.value)}
              placeholder="Brief description for search results..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-keywords">Keywords (comma-separated)</Label>
            <Input
              id="seo-keywords"
              value={((seo.keywords as string[]) || []).join(", ")}
              onChange={(e) =>
                updateNestedFormData(
                  "seo",
                  "keywords",
                  e.target.value.split(",").map((k) => k.trim()).filter(Boolean)
                )
              }
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Competitor-specific fields
function CompetitorFields({
  formData,
  updateFormData,
}: {
  formData: Record<string, unknown>;
  updateFormData: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Competitor Name</Label>
        <Input
          id="name"
          value={(formData.name as string) || ""}
          onChange={(e) => updateFormData("name", e.target.value)}
          placeholder="e.g., Acme Inc"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          type="url"
          value={(formData.url as string) || ""}
          onChange={(e) => updateFormData("url", e.target.value)}
          placeholder="https://competitor.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Analysis Status</Label>
        <Badge variant="outline">
          {(formData.status as string) || "pending"}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          Click &quot;Analyze&quot; on the node to run competitor analysis
        </p>
      </div>
    </>
  );
}

// Design-specific fields
function DesignFields({
  formData,
  updateFormData,
}: {
  formData: Record<string, unknown>;
  updateFormData: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="source_type">Source Type</Label>
        <select
          id="source_type"
          value={(formData.source_type as string) || "url"}
          onChange={(e) => updateFormData("source_type", e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="url">URL</option>
          <option value="upload">Upload</option>
          <option value="screenshot">Screenshot</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">
          {(formData.source_type as string) === "url" ? "Design URL" : "Source Path"}
        </Label>
        <Input
          id="source"
          value={(formData.source as string) || ""}
          onChange={(e) => updateFormData("source", e.target.value)}
          placeholder={
            (formData.source_type as string) === "url"
              ? "https://dribbble.com/shots/..."
              : "/path/to/image.png"
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Design Notes</Label>
        <Textarea
          id="notes"
          value={(formData.notes as string) || ""}
          onChange={(e) => updateFormData("notes", e.target.value)}
          placeholder="What do you like about this design?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Extraction Status</Label>
        <Badge variant="outline">
          {(formData.status as string) || "pending"}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          Click &quot;Extract Patterns&quot; on the node to analyze this design
        </p>
      </div>
    </>
  );
}

// Generic fields for other node types
function GenericFields({
  formData,
  updateFormData,
}: {
  formData: Record<string, unknown>;
  updateFormData: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={(formData.name as string) || ""}
          onChange={(e) => updateFormData("name", e.target.value)}
          placeholder="Node name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={(formData.description as string) || ""}
          onChange={(e) => updateFormData("description", e.target.value)}
          placeholder="Describe this node..."
          rows={3}
        />
      </div>
    </>
  );
}
