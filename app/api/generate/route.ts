import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SectionType, SectionNodeData } from "@/types";

// Validate API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Section-specific prompts and templates
const SECTION_PROMPTS: Record<SectionType, string> = {
  hero: `Generate a Hero section component with:
- Compelling headline and subheadline
- Clear value proposition
- Primary CTA button
- Optional secondary CTA
- Background styling (gradient or image)
- Responsive design for all devices`,

  features: `Generate a Features section component with:
- Section headline and description
- Grid of feature cards (3-4 features)
- Icons for each feature (use Lucide icons)
- Feature titles and descriptions
- Hover effects and animations`,

  testimonials: `Generate a Testimonials section with:
- Section headline
- Testimonial cards with quotes
- Author name, title, and company
- Avatar/photo placeholders
- Optional star ratings
- Carousel or grid layout`,

  cta: `Generate a Call-to-Action section with:
- Attention-grabbing headline
- Supporting copy
- Primary action button
- Visual treatment (background color/gradient)
- Urgency or benefit statement`,

  pricing: `Generate a Pricing section with:
- Section headline
- 3 pricing tiers (Basic, Pro, Enterprise)
- Feature list for each tier
- Monthly/yearly toggle (optional)
- Highlighted recommended plan
- CTA buttons for each tier`,

  faq: `Generate an FAQ section with:
- Section headline
- Accordion-style questions and answers
- Expand/collapse functionality
- At least 5 common questions
- Contact support link at bottom`,

  team: `Generate a Team section with:
- Section headline
- Grid of team member cards
- Photo placeholders
- Name, title, and bio
- Social media links
- Hover effects`,

  stats: `Generate a Statistics section with:
- Section headline
- 3-4 key metrics
- Large numbers with labels
- Optional animated counters
- Visual separators`,

  gallery: `Generate a Gallery section with:
- Grid of images
- Lightbox functionality
- Image captions
- Filter/category options (optional)
- Responsive masonry layout`,

  contact: `Generate a Contact section with:
- Section headline
- Contact form (name, email, message)
- Form validation
- Contact information (email, phone, address)
- Social media links
- Map placeholder (optional)`,

  newsletter: `Generate a Newsletter signup section with:
- Compelling headline
- Email input field
- Subscribe button
- Privacy notice
- Success/error states
- Optional incentive text`,

  footer: `Generate a Footer component with:
- Logo and tagline
- Navigation links organized by category
- Social media links
- Copyright notice
- Legal links (Privacy, Terms)
- Newsletter signup (optional)`,

  custom: `Generate a custom section based on the provided requirements.
Include proper responsive design, accessibility, and modern styling.`,
};

const SYSTEM_PROMPT = `You are an expert React/Next.js developer specializing in creating beautiful, conversion-optimized website sections.

Guidelines:
- Use Next.js 14+ with App Router patterns
- Style exclusively with Tailwind CSS
- Follow shadcn/ui component patterns where applicable
- Ensure fully responsive design (mobile-first)
- Include TypeScript types and interfaces
- Add helpful comments for customization
- Use Lucide icons for any icons needed
- Make colors and content easily customizable
- Follow accessibility best practices (ARIA labels, semantic HTML)
- Include subtle animations and hover effects

Output format:
Provide the complete React component code that can be directly used in a Next.js project.
Include any necessary imports at the top.
Do not include any explanation outside the code - just the component.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, sectionType, config, context } = body;

    if (!nodeId || !sectionType) {
      return NextResponse.json(
        { error: "nodeId and sectionType are required" },
        { status: 400 }
      );
    }

    // Verify user owns the node (via project ownership)
    const { data: node, error: nodeError } = await supabase
      .from("nodes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: "Node not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get the section-specific prompt
    const sectionPrompt = SECTION_PROMPTS[sectionType as SectionType] || SECTION_PROMPTS.custom;

    // Build the full prompt
    let fullPrompt = sectionPrompt;
    
    if (config) {
      fullPrompt += `\n\nConfiguration:\n${JSON.stringify(config, null, 2)}`;
    }
    
    if (context) {
      fullPrompt += `\n\nProject Context (use for styling/branding):\n${JSON.stringify(context, null, 2)}`;
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    });

    // Extract code from response
    const generatedCode = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join("\n");

    // Get current version
    const { data: existingGenerations } = await supabase
      .from("generations")
      .select("version")
      .eq("node_id", nodeId)
      .eq("type", "code")
      .order("version", { ascending: false })
      .limit(1);

    const newVersion = existingGenerations && existingGenerations.length > 0 
      ? existingGenerations[0].version + 1 
      : 1;

    // Save generation to database
    const { data: generationData, error: saveError } = await supabase
      .from("generations")
      .insert({
        node_id: nodeId,
        type: "code",
        content: generatedCode,
        metadata: { sectionType, config },
        version: newVersion,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save generation:", saveError);
    }

    const generation = generationData as { id: string } | null;

    // Update node with generated content - fetch current data and merge
    const { data: currentNodeData } = await supabase
      .from("nodes")
      .select("data")
      .eq("id", nodeId)
      .single();

    if (currentNodeData) {
      const currentData = (currentNodeData as { data: SectionNodeData }).data;
      await supabase
        .from("nodes")
        .update({
          data: {
            ...currentData,
            content: {
              generated: generatedCode,
              version: newVersion,
              generated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", nodeId);
    }

    return NextResponse.json({
      code: generatedCode,
      version: newVersion,
      generationId: generation?.id,
      usage: response.usage,
    });

  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
