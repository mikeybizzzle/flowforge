import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DesignNodeData, DesignExtraction } from "@/types";

// Validate API keys at startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DESIGN_SYSTEM_PROMPT = `You are an expert UI/UX designer and design system analyst. Your task is to analyze website branding data and extract actionable design patterns.

When analyzing, focus on:
1. **Color Palette** - Identify all significant colors used (primary, secondary, accent, background, text colors)
2. **Typography** - Detect fonts used and suggest web-safe alternatives
3. **Layout Patterns** - Identify common UI patterns (hero layouts, grids, card systems)
4. **Style Mood** - Describe the overall design aesthetic and mood
5. **UI Components** - List key UI components and patterns observed

Provide your analysis in a structured JSON format.`;

const DESIGN_USER_PROMPT = `Analyze the following website branding and design data to extract design patterns.

Website URL: {url}
Branding/Style Data:
{brandingData}

Please analyze this design and return a JSON object with the following structure:
{
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "typography": {
    "detected": ["FontName1", "FontName2"],
    "suggestions": ["WebSafeAlt1", "WebSafeAlt2"]
  },
  "layout_patterns": ["Pattern1", "Pattern2", "Pattern3"],
  "style_mood": "Brief description of the overall design mood and aesthetic",
  "components": ["Component1", "Component2", "Component3"]
}

Return ONLY the JSON object, no additional text or markdown formatting. Ensure all colors are valid hex codes starting with #.`;

/**
 * Scrape website branding data using Firecrawl API
 */
async function scrapeWithFirecrawl(url: string): Promise<{ branding?: unknown; markdown?: string }> {
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (!firecrawlApiKey) {
    // If no Firecrawl key, return minimal data and let Claude analyze based on URL
    console.warn("FIRECRAWL_API_KEY not set - using URL-only analysis");
    return { branding: null, markdown: `Website URL: ${url}` };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false,
        // Request branding extraction if available
        extract: {
          schema: {
            type: "object",
            properties: {
              colors: { type: "array", items: { type: "string" } },
              fonts: { type: "array", items: { type: "string" } },
              logo: { type: "string" },
              primaryColor: { type: "string" },
              backgroundColor: { type: "string" },
            },
          },
          prompt: "Extract the brand colors (as hex codes), fonts, and any styling information from this website",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl API error:", response.status, errorText);
      // Fall back to URL-only analysis
      return { branding: null, markdown: `Website URL: ${url}` };
    }

    const result = await response.json();
    return {
      branding: result.data?.extract || result.data?.llm_extraction,
      markdown: result.data?.markdown || "",
    };
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    return { branding: null, markdown: `Website URL: ${url}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, url } = body;

    if (!nodeId || !url) {
      return NextResponse.json(
        { error: "nodeId and url are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
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

    const node = nodeData as { id: string; project_id: string; data: DesignNodeData };

    // Update node status to extracting
    const currentData = node.data;
    await supabase
      .from("nodes")
      .update({
        data: {
          ...currentData,
          status: "extracting",
        },
      })
      .eq("id", nodeId);

    // Scrape website with Firecrawl
    const { branding, markdown } = await scrapeWithFirecrawl(url);

    // Build the analysis prompt with scraped data
    const brandingDataStr = branding
      ? JSON.stringify(branding, null, 2)
      : markdown
        ? `Page content preview:\n${markdown.substring(0, 2000)}...`
        : "No branding data available - analyze based on common patterns for this type of website.";

    const prompt = DESIGN_USER_PROMPT
      .replace("{url}", url)
      .replace("{brandingData}", brandingDataStr);

    // Call Claude API for design analysis
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: DESIGN_SYSTEM_PROMPT,
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
    let extraction: DesignExtraction;
    try {
      // Clean up potential markdown formatting
      const cleanJson = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      extraction = JSON.parse(cleanJson);

      // Validate and normalize color palette
      if (extraction.color_palette) {
        extraction.color_palette = extraction.color_palette
          .filter((c) => typeof c === "string")
          .map((c) => c.startsWith("#") ? c : `#${c}`)
          .slice(0, 10); // Limit to 10 colors
      }
    } catch (parseError) {
      console.error("Failed to parse design extraction JSON:", parseError);
      // Provide a fallback extraction structure
      extraction = {
        color_palette: ["#3B82F6", "#6B7280", "#F59E0B", "#FFFFFF", "#111827"],
        typography: {
          detected: [],
          suggestions: ["Inter", "System UI"],
        },
        layout_patterns: ["Unable to extract patterns - please check the URL"],
        style_mood: "Unable to determine",
        components: [],
      };
    }

    // Update node with extraction results
    const updatedData: DesignNodeData = {
      ...currentData,
      extraction,
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
      type: "analysis",
      content: JSON.stringify(extraction),
      metadata: { url, source: "design-extract" },
      version: 1,
    });

    return NextResponse.json({
      extraction,
      usage: response.usage,
    });

  } catch (error) {
    console.error("Design extract API error:", error);

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
                ...(node.data as DesignNodeData),
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
      { error: "Failed to extract design patterns" },
      { status: 500 }
    );
  }
}
