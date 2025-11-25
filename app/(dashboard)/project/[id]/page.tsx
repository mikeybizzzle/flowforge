import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "@/components/layout/project-editor";
import type { Project, CanvasNode, CanvasEdge, Message } from "@/types";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch nodes
  const { data: nodes } = await supabase
    .from("nodes")
    .select("*")
    .eq("project_id", id);

  // Fetch edges
  const { data: edges } = await supabase
    .from("edges")
    .select("*")
    .eq("project_id", id);

  // Fetch messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return (
    <ProjectEditor
      project={project as Project}
      initialNodes={(nodes || []) as CanvasNode[]}
      initialEdges={(edges || []) as CanvasEdge[]}
      initialMessages={(messages || []) as Message[]}
    />
  );
}
