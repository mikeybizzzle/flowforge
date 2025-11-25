import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateExportFiles, createZipArchive, type ExportOptions } from "@/lib/export";
import type { Project, FlowNode, NodeData, NodeType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, options } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Get project with ownership check
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get all nodes for the project
    const { data: nodesData, error: nodesError } = await supabase
      .from("nodes")
      .select("*")
      .eq("project_id", projectId);

    if (nodesError) {
      console.error("Failed to fetch nodes:", nodesError);
      return NextResponse.json(
        { error: "Failed to fetch project nodes" },
        { status: 500 }
      );
    }

    // Transform database nodes to FlowNode format
    interface DatabaseNode {
      id: string;
      type: NodeType;
      position: { x: number; y: number };
      data: NodeData;
    }
    const nodes: FlowNode[] = ((nodesData || []) as DatabaseNode[]).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }));

    // Export options with defaults
    const exportOptions: ExportOptions = {
      includeComponents: options?.includeComponents ?? true,
      includeStyles: options?.includeStyles ?? true,
      includeConfigs: options?.includeConfigs ?? true,
      format: options?.format ?? "nextjs",
    };

    // Cast project to proper type
    const typedProject = project as Project;

    // Generate files
    const files = generateExportFiles(typedProject, nodes, exportOptions);

    // Create zip archive
    const zipBuffer = await createZipArchive(files);

    // Generate filename
    const filename = `${typedProject.name.toLowerCase().replace(/\s+/g, "-")}-export.zip`;

    // Return the zip file (convert Buffer to Uint8Array for Next.js 16 compatibility)
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Failed to export project" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check export status or get export preview
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Get project with ownership check
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get node counts for export preview
    const { data: nodesData, error: nodesError } = await supabase
      .from("nodes")
      .select("type")
      .eq("project_id", projectId);

    if (nodesError) {
      return NextResponse.json(
        { error: "Failed to fetch project data" },
        { status: 500 }
      );
    }

    const nodeCounts = (nodesData || []).reduce(
      (acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Cast project to proper type
    const typedProject = project as Project;

    return NextResponse.json({
      projectName: typedProject.name,
      hasSettings: !!(typedProject.settings?.color_palette || typedProject.settings?.typography),
      nodeCounts,
      estimatedFiles:
        (nodeCounts.page || 0) + // Page files
        (nodeCounts.section || 0) + // Section components
        6, // Config files (package.json, tsconfig, tailwind, etc.)
    });
  } catch (error) {
    console.error("Export preview API error:", error);
    return NextResponse.json(
      { error: "Failed to get export preview" },
      { status: 500 }
    );
  }
}
