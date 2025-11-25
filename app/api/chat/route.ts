import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { NodeData } from "@/types";

// Validate API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for FlowForge AI assistant
const SYSTEM_PROMPT = `You are FlowForge AI, an expert website strategist and developer assistant. You help users plan, design, and build professional websites using a visual strategy canvas approach.

Your capabilities:
1. **Strategy Planning**: Help users define their website goals, target audience, and competitive positioning
2. **Competitor Analysis**: Analyze competitor websites and extract insights about design patterns, messaging, and features
3. **Design Guidance**: Suggest color schemes, typography, layouts, and visual hierarchy based on industry best practices
4. **PRD Generation**: Create detailed Product Requirement Documents for pages and sections
5. **Code Generation**: Generate React/Next.js components with Tailwind CSS

When helping with website strategy:
- Ask clarifying questions to understand the user's business and goals
- Reference any competitor analysis or design inspiration nodes in their project
- Suggest a logical information architecture
- Consider conversion optimization and user experience

When generating code:
- Use Next.js 14+ with App Router
- Style with Tailwind CSS
- Follow shadcn/ui component patterns
- Ensure responsive design (mobile-first)
- Include proper TypeScript types
- Add helpful comments

Always be constructive, specific, and actionable in your responses. Guide users through the "Think → Map → Build → Refine" methodology.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, projectId, nodeId, context } = body;

    if (!message || !projectId) {
      return NextResponse.json(
        { error: "Message and projectId are required" },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Build context from project and nodes
    let contextPrompt = "";
    if (context && context.length > 0) {
      contextPrompt = `\n\nProject Context:\n${JSON.stringify(context, null, 2)}`;
    }

    // Get recent messages for conversation history
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(10);

    // Build messages array for Claude
    const messages: Anthropic.Messages.MessageParam[] = [];
    
    // Add recent conversation history
    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    // Add current message with context
    messages.push({
      role: "user",
      content: message + contextPrompt,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Extract text response
    const assistantMessage = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join("\n");

    // Save messages to database
    await supabase.from("messages").insert([
      {
        project_id: projectId,
        node_id: nodeId || null,
        role: "user",
        content: message,
        metadata: { context_nodes: (context as NodeData[] | undefined)?.map((c) => c.type) || [] },
      },
      {
        project_id: projectId,
        node_id: nodeId || null,
        role: "assistant",
        content: assistantMessage,
      },
    ]);

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
