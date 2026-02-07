"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import debounce from "lodash.debounce";
import { KanbanView, Column, Task } from "./kanban-view";

interface KanbanBoardProps {
    docId: string;
    initialContent?: any;
    user: any;
}

export default function KanbanBoard({ docId, initialContent, user }: KanbanBoardProps) {
    const supabase = createClient();

    // Parse initial content or default
    const defaultCols: Column[] = [
        { id: "todo", title: "To Do" },
        { id: "doing", title: "In Progress" },
        { id: "done", title: "Done" },
    ];

    // State
    const [columns, setColumns] = useState<Column[]>(
        initialContent?.columns || defaultCols
    );
    const [tasks, setTasks] = useState<Task[]>(
        initialContent?.tasks || []
    );
    const [collaborators, setCollaborators] = useState<{ email: string }[]>([]);

    useEffect(() => {
        const fetchCollaborators = async () => {
            const { data: doc } = await supabase.from('documents').select('project_id, parent_id').eq('id', docId).single();
            const projectId = doc?.project_id || docId; // If root or no project logic yet

            const { data: collabs } = await supabase
                .from("document_collaborators")
                .select("user_email")
                .eq("document_id", projectId); // Assuming sharing is at project level

            const emails = collabs ? collabs.map(c => c.user_email) : [];
            // Add current user to the list if logged in
            if (user?.email) {
                emails.push(user.email);
            }

            if (emails.length > 0) {
                const unique = Array.from(new Set(emails)).map(email => ({ email }));
                setCollaborators(unique);
            } else if (user?.email) {
                setCollaborators([{ email: user.email }]);
            }
        };
        fetchCollaborators();
    }, [docId, supabase, user]);

    async function logTaskCompletion(taskName: string) {
        try {
            const { data: current } = await supabase.from('documents').select('parent_id').eq('id', docId).single();
            if (!current?.parent_id) return;

            const { data: parent } = await supabase.from('documents').select('id, content').eq('id', current.parent_id).single();
            if (!parent) return;

            let newContent = parent.content;
            const logMsg = `Task "${taskName}" was marked as done.`;

            if (newContent && newContent.type === 'doc' && Array.isArray(newContent.content)) {
                newContent = {
                    ...newContent, content: [...newContent.content, {
                        type: "paragraph",
                        content: [{ type: "text", text: logMsg }]
                    }]
                };
            } else if (!newContent) {
                newContent = { type: 'doc', content: [{ type: "paragraph", content: [{ type: "text", text: logMsg }] }] };
            } else {
                return;
            }

            await supabase.from('documents').update({ content: newContent }).eq('id', parent.id);
        } catch (e) {
            console.error("Failed to log task completion", e);
        }
    }

    // Persistence
    const saveBoard = useMemo(
        () =>
            debounce(async (cols: Column[], tks: Task[]) => {
                await supabase
                    .from("documents")
                    .update({
                        content: { columns: cols, tasks: tks }
                    })
                    .eq("id", docId);
            }, 1000),
        [docId, supabase]
    );

    useEffect(() => {
        saveBoard(columns, tasks);
    }, [columns, tasks, saveBoard]);

    return (
        <KanbanView
            columns={columns}
            tasks={tasks}
            setColumns={setColumns}
            setTasks={setTasks}
            currentUser={user}
            collaborators={collaborators}
            onTaskComplete={logTaskCompletion}
        />
    );
}
