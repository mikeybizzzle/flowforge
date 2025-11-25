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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ProjectSettings, ColorPalette, Typography } from "@/types";

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultColorPalette: ColorPalette = {
  primary: "#3B82F6",
  secondary: "#6B7280",
  accent: "#F59E0B",
  background: "#FFFFFF",
  text: "#111827",
};

const defaultTypography: Typography = {
  heading_font: "Inter",
  body_font: "Inter",
};

export function ProjectSettingsDialog({ open, onOpenChange }: ProjectSettingsDialogProps) {
  const { project, setProject } = useCanvasStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    settings: ProjectSettings;
  }>({
    name: "",
    description: "",
    settings: {},
  });

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        settings: {
          industry: project.settings?.industry || "",
          target_audience: project.settings?.target_audience || "",
          brand_voice: project.settings?.brand_voice || "",
          color_palette: project.settings?.color_palette || defaultColorPalette,
          typography: project.settings?.typography || defaultTypography,
        },
      });
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          description: formData.description,
          settings: formData.settings,
        })
        .eq("id", project.id);

      if (error) throw error;

      // Update local state
      setProject({
        ...project,
        name: formData.name,
        description: formData.description,
        settings: formData.settings,
      });

      toast.success("Project settings saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save project settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (key: keyof ProjectSettings, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const updateColorPalette = (key: keyof ColorPalette, value: string) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        color_palette: {
          ...(prev.settings.color_palette || defaultColorPalette),
          [key]: value,
        },
      },
    }));
  };

  const updateTypography = (key: keyof Typography, value: string) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        typography: {
          ...(prev.settings.typography || defaultTypography),
          [key]: value,
        },
      },
    }));
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure your project details and branding. These settings influence AI-generated content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="My Website Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of your project..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.settings.industry || ""}
                onChange={(e) => updateSettings("industry", e.target.value)}
                placeholder="e.g., SaaS, E-commerce, Healthcare"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Textarea
                id="target_audience"
                value={formData.settings.target_audience || ""}
                onChange={(e) => updateSettings("target_audience", e.target.value)}
                placeholder="Describe your ideal customer (demographics, needs, pain points)..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_voice">Brand Voice</Label>
              <Textarea
                id="brand_voice"
                value={formData.settings.brand_voice || ""}
                onChange={(e) => updateSettings("brand_voice", e.target.value)}
                placeholder="Describe your brand's tone and personality (e.g., professional, friendly, bold)..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Color Palette */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Color Palette</h3>
            <p className="text-xs text-muted-foreground">
              These colors will be used in generated components
            </p>

            <div className="grid grid-cols-2 gap-4">
              {(["primary", "secondary", "accent", "background", "text"] as const).map((colorKey) => (
                <div key={colorKey} className="space-y-2">
                  <Label htmlFor={`color-${colorKey}`} className="capitalize">
                    {colorKey}
                  </Label>
                  <div className="flex gap-2">
                    <div
                      className="w-10 h-10 rounded-md border border-border cursor-pointer"
                      style={{ backgroundColor: formData.settings.color_palette?.[colorKey] || defaultColorPalette[colorKey] }}
                    >
                      <input
                        type="color"
                        id={`color-${colorKey}`}
                        value={formData.settings.color_palette?.[colorKey] || defaultColorPalette[colorKey]}
                        onChange={(e) => updateColorPalette(colorKey, e.target.value)}
                        className="w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={formData.settings.color_palette?.[colorKey] || defaultColorPalette[colorKey]}
                      onChange={(e) => updateColorPalette(colorKey, e.target.value)}
                      placeholder="#000000"
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Typography */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Typography</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heading_font">Heading Font</Label>
                <Input
                  id="heading_font"
                  value={formData.settings.typography?.heading_font || ""}
                  onChange={(e) => updateTypography("heading_font", e.target.value)}
                  placeholder="e.g., Inter, Playfair Display"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_font">Body Font</Label>
                <Input
                  id="body_font"
                  value={formData.settings.typography?.body_font || ""}
                  onChange={(e) => updateTypography("body_font", e.target.value)}
                  placeholder="e.g., Inter, Open Sans"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
