import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { PageNodeData, NodeData, ProjectSettings } from "@/types";

// Validate API keys at startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PRD_SYSTEM_PROMPT = `You are an expert product manager and technical writer. Your task is to generate comprehensive Product Requirements Documents (PRDs) for website pages.

A PRD should include:
1. **Page Overview** - Purpose and goals of the page
2. **Target Audience** - Who will use this page
3. **User Stories** - Key user flows and interactions
4. **Functional Requirements** - Specific features and behaviors
5. **Content Requirements** - What content is needed
6. **Design Requirements** - Visual and UX considerations
7. **Technical Requirements** - Implementation considerations
8. **Success Metrics** - How to measure page effectiveness
9. **Dependencies** - What this page depends on
10. **Out of Scope** - What's explicitly not included

Write in clear, concise professional language. Use markdown formatting for structure.`;

function buildUserPrompt(
  pageData: PageNodeData,
  context: NodeData[],
  projectSettings?: ProjectSettings
): string {
  let prompt = `Generate a detailed PRD for the following website page:\n\n`;

  // Page information
  prompt += `## Page Details\n`;
  prompt += `- **Name**: ${pageData.name}\n`;
  prompt += `- **Route**: ${pageData.route}\n`;
  if (pageData.description) {
    prompt += `- **Description**: ${pageData.description}\n`;
  }
  if (pageData.seo) {
    prompt += `- **SEO Title**: ${pageData.seo.title || "Not specified"}\n`;
    prompt += `- **SEO Description**: ${pageData.seo.description || "Not specified"}\n`;
  }
  prompt += `\n`;

  // Project context
  if (projectSettings) {
    prompt += `## Project Context\n`;
    if (projectSettings.industry) {
      prompt += `- **Industry**: ${projectSettings.industry}\n`;
    }
    if (projectSettings.target_audience) {
      prompt += `- **Target Audience**: ${projectSettings.target_audience}\n`;
    }
    if (projectSettings.brand_voice) {
      prompt += `- **Brand Voice**: ${projectSettings.brand_voice}\n`;
    }
    prompt += `\n`;
  }

  // Context from connected nodes
  if (context.length > 0) {
    prompt += `## Additional Context from Connected Nodes\n\n`;

    for (const nodeData of context) {
      if ("type" in nodeData) {
        switch (nodeData.type) {
          case "project":
            prompt += `### Project Information\n`;
            prompt += `- **Name**: ${nodeData.name}\n`;
            if (nodeData.description) prompt += `- **Description**: ${nodeData.description}\n`;
            if (nodeData.industry) prompt += `- **Industry**: ${nodeData.industry}\n`;
            if (nodeData.target_audience) prompt += `- **Audience**: ${nodeData.target_audience}\n`;
            if (nodeData.brand_voice) prompt += `- **Brand Voice**: ${nodeData.brand_voice}\n`;
            prompt += `\n`;
            break;

          case "competitor":
            if (nodeData.analysis) {
              prompt += `### Competitor Analysis: ${nodeData.name || nodeData.url}\n`;
              prompt += `- **Strengths**: ${nodeData.analysis.strengths.join(", ")}\n`;
              prompt += `- **Design Patterns**: ${nodeData.analysis.design_patterns.join(", ")}\n`;
              prompt += `- **CTAs**: ${nodeData.analysis.ctas.join(", ")}\n`;
              prompt += `\n`;
            }
            break;

          case "design":
            if (nodeData.extraction) {
              prompt += `### Design Inspiration\n`;
              prompt += `- **Style Mood**: ${nodeData.extraction.style_mood}\n`;
              prompt += `- **Layout Patterns**: ${nodeData.extraction.layout_patterns.join(", ")}\n`;
              prompt += `- **Components**: ${nodeData.extraction.components.join(", ")}\n`;
              prompt += `\n`;
            }
            break;

          case "goals":
            prompt += `### Project Goals\n`;
            for (const obj of nodeData.objectives) {
              prompt += `- [${obj.priority.toUpperCase()}] ${obj.text}`;
              if (obj.measurable) prompt += ` (Metric: ${obj.measurable})`;
              prompt += `\n`;
            }
            prompt += `\n`;
            break;

          case "section":
            prompt += `### Section: ${nodeData.name} (${nodeData.section_type})\n`;
            if (nodeData.description) prompt += `${nodeData.description}\n`;
            prompt += `\n`;
            break;
        }
      }
    }
  }

  prompt += `\nBased on this information, generate a comprehensive PRD for the "${pageData.name}" page. The PRD should be actionable and provide clear guidance for designers and developers.`;

  return prompt;
}

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
    const { nodeId, context = [], projectSettings } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: "nodeId is required" },
        { status: 400 }
      );
    }

    // Verify user owns the node (via project ownership)
    const { data: nodeData, error: nodeError } = await supabase
      .from("nodes")
      .select("id, project_id, data, projects!inner(user_id)")
      .eq("id", nodeId)
      .single();

    if (nodeError || !nodeData) {
      return NextResponse.json(
        { error: "Node not found or unauthorized" },
        { status: 404 }
      );
    }

    const node = nodeData as { id: string; project_id: string; data: PageNodeData };

    // Validate node is a page type
    if (node.data.type !== "page") {
      return NextResponse.json(
        { error: "PRD generation is only available for page nodes" },
        { status: 400 }
      );
    }

    // Update node status to indicate PRD generation
    const currentData = node.data;
    await supabase
      .from("nodes")
      .update({
        data: {
          ...currentData,
          status: "building",
        },
      })
      .eq("id", nodeId);

    // Build the prompt with context
    const prompt = buildUserPrompt(node.data, context, projectSettings);

    // Call Claude API for PRD generation
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: PRD_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract PRD content from response
    const prdContent = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join("\n");

    // Get current version
    const { data: existingPRD } = await supabase
      .from("generations")
      .select("version")
      .eq("node_id", nodeId)
      .eq("type", "prd")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const newVersion = (existingPRD?.version || 0) + 1;

    // Update node with PRD data
    const prdData = {
      content: prdContent,
      generated_at: new Date().toISOString(),
      version: newVersion,
    };

    const updatedData: PageNodeData = {
      ...currentData,
      prd: prdData,
      status: "complete",
    };

    const { error: updateError } = await supabase
      .from("nodes")
      .update({ data: updatedData })
      .eq("id", nodeId);

    if (updateError) {
      console.error("Failed to update node:", updateError);
    }

    // Save generation record
    await supabase.from("generations").insert({
      node_id: nodeId,
      type: "prd",
      content: prdContent,
      metadata: {
        context_node_count: context.length,
        has_project_settings: !!projectSettings,
      },
      version: newVersion,
    });

    return NextResponse.json({
      prd: prdData,
      usage: response.usage,
    });
  } catch (error) {
    console.error("PRD generation API error:", error);

    // Try to update node status to error
    try {
      const supabase = await createClient();
      const body = await request.clone().json();
      if (body.nodeId) {
        const { data: node } = await supabase
          .from("nodes")
          .select("data")
          .eq("id", body.nodeId)
          .single();

        if (node) {
          await supabase
            .from("nodes")
            .update({
              data: {
                ...(node.data as PageNodeData),
                status: "planning",
              },
            })
            .eq("id", body.nodeId);
        }
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: "Failed to generate PRD" },
      { status: 500 }
    );
  }
}
