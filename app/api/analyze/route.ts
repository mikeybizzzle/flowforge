import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CompetitorNodeData, CompetitorAnalysis } from "@/types";

// Validate API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANALYSIS_SYSTEM_PROMPT = `You are an expert website analyst and competitive intelligence specialist. Your task is to analyze competitor websites and extract actionable insights.

When analyzing a website, focus on:
1. **Value Proposition & Messaging**: What are they promising? How do they communicate their unique value?
2. **Design Patterns**: What UI patterns, layouts, and visual styles do they use?
3. **Call-to-Actions**: What CTAs do they use? Where are they placed?
4. **Content Strategy**: How do they structure their content? What topics do they cover?
5. **Trust Signals**: What social proof, testimonials, or credibility indicators do they use?
6. **Features & Benefits**: What key features do they highlight?

Provide your analysis in a structured JSON format.`;

const ANALYSIS_USER_PROMPT = `Analyze the following website and provide competitive intelligence. I'll describe what I know about the website, and you should provide a structured analysis.

Website URL: {url}
Website Name: {name}

Please analyze this competitor and return a JSON object with the following structure:
{
  "strengths": ["string array of 3-5 key strengths"],
  "weaknesses": ["string array of 2-4 potential weaknesses or gaps"],
  "design_patterns": ["string array of notable UI/UX patterns used"],
  "messaging_style": "string describing their overall messaging tone and approach",
  "unique_features": ["string array of standout features or differentiators"],
  "ctas": ["string array of main call-to-action phrases used"]
}

Return ONLY the JSON object, no additional text or markdown formatting.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, url, name } = body;

    if (!nodeId || !url) {
      return NextResponse.json(
        { error: "nodeId and url are required" },
        { status: 400 }
      );
    }

    // Verify user owns the node (via project ownership)
    const { data: node, error: nodeError } = await supabase
      .from("nodes")
      .select("id, project_id, data, projects!inner(user_id)")
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: "Node not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update node status to analyzing
    const currentData = node.data as CompetitorNodeData;
    await supabase
      .from("nodes")
      .update({
        data: {
          ...currentData,
          status: "analyzing",
        },
      })
      .eq("id", nodeId);

    // Build the analysis prompt
    const prompt = ANALYSIS_USER_PROMPT
      .replace("{url}", url)
      .replace("{name}", name || "Unknown");

    // Call Claude API for analysis
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract analysis from response
    const analysisText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join("");

    // Parse the JSON response
    let analysis: CompetitorAnalysis;
    try {
      // Clean up potential markdown formatting
      const cleanJson = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", parseError);
      // Provide a fallback analysis structure
      analysis = {
        strengths: ["Unable to fully analyze - please check the URL"],
        weaknesses: ["Analysis incomplete"],
        design_patterns: [],
        messaging_style: "Unable to determine",
        unique_features: [],
        ctas: [],
      };
    }

    // Update node with analysis results
    const updatedData: CompetitorNodeData = {
      ...currentData,
      analysis,
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
    await supabase
      .from("generations")
      .insert({
        node_id: nodeId,
        type: "analysis",
        content: JSON.stringify(analysis),
        metadata: { url, name },
        version: 1,
      });

    return NextResponse.json({
      analysis,
      usage: response.usage,
    });

  } catch (error) {
    console.error("Analyze API error:", error);

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
                ...(node.data as CompetitorNodeData),
                status: "error",
              },
            })
            .eq("id", body.nodeId);
        }
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: "Failed to analyze competitor" },
      { status: 500 }
    );
  }
}
