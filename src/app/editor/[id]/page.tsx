import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditorClient from "./editor-client";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 2. Fetch Document
    const { data: currentDoc } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

    if (!currentDoc) {
        // Could show custom 404
        return <div className="flex h-screen items-center justify-center">Document not found</div>;
    }

    // 3. Fetch Project Root (if needed)
    const projectId = currentDoc.project_id || currentDoc.id;
    let projectDoc = null;

    if (projectId) {
        const { data: pDoc } = await supabase
            .from("documents")
            .select("title, icon")
            .eq("id", projectId)
            .single();
        projectDoc = pDoc;
    }

    // 4. Render Client Wrapper
    return (
        <EditorClient
            user={user}
            doc={currentDoc}
            projectDoc={projectDoc}
            initialContent={currentDoc.content}
        />
    );
}
