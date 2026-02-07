import { createReactBlockSpec } from "@blocknote/react";
import { KanbanView, Column, Task } from "@/components/kanban/kanban-view";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { useProjectCollaborators } from "@/hooks/use-project-collaborators";

// Default columns for new blocks
const defaultCols: Column[] = [
    { id: "todo", title: "To Do" },
    { id: "doing", title: "In Progress" },
    { id: "done", title: "Done" },
];

export const KanbanBlock = createReactBlockSpec(
    {
        type: "kanban",
        propSchema: {
            // we store data as JSON strings because BlockNote props are simple types
            columns: {
                default: JSON.stringify(defaultCols),
            },
            tasks: {
                default: "[]",
            },
        },
        content: "none",
    },
    {
        render: (props) => {
            const params = useParams();
            const currentDocId = params?.id as string;
            const [kanbanDocData, setKanbanDocData] = useState<{ columns: Column[], tasks: Task[] } | null>(null);
            const [loading, setLoading] = useState(true);
            const [projectId, setProjectId] = useState<string | null>(null);
            const [user, setUser] = useState<any>(null);

            // Fetch user
            useEffect(() => {
                const supabase = createClient();
                const getUser = async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    setUser(user);
                };
                getUser();
            }, []);

            // 1. Identify Project ID
            useEffect(() => {
                const supabase = createClient();
                const fetchProject = async () => {
                    if (!currentDocId) return;
                    const { data: doc } = await supabase.from('documents').select('project_id, id').eq('id', currentDocId).single();
                    if (doc) {
                        setProjectId(doc.project_id || doc.id); // If it has no project_id, it is the project root
                    }
                };
                fetchProject();
            }, [currentDocId]);

            // 2. Search for Kanban Board in this Project
            useEffect(() => {
                if (!projectId) return;
                const supabase = createClient();
                const fetchKanban = async () => {
                    setLoading(true);
                    // Fetch all docs in project
                    const { data: docs } = await supabase
                        .from('documents')
                        .select('*')
                        .or(`project_id.eq.${projectId},id.eq.${projectId}`);

                    if (docs) {
                        // Find a document that looks like a Kanban Board
                        // Heuristic: Check formatting or specific flag. 
                        // Since we don't have a "type" column, we check content structure.
                        // Ideally, we'd check if `content.columns` exists.
                        const kanbanDoc = docs.find(d =>
                            d.content &&
                            typeof d.content === 'object' &&
                            'columns' in d.content &&
                            Array.isArray(d.content.columns)
                        );

                        if (kanbanDoc) {
                            setKanbanDocData(kanbanDoc.content as any);
                        } else {
                            setKanbanDocData(null);
                        }
                    }
                    setLoading(false);
                };
                fetchKanban();
            }, [projectId]);

            const { collaborators } = useProjectCollaborators(projectId || "", user);

            if (loading) return <div className="p-4 text-muted-foreground">Loading Kanban Mirror...</div>;

            if (!kanbanDocData) {
                return (
                    <div className="w-full border-2 border-dashed rounded-md p-8 text-center bg-muted/20 my-4">
                        <p className="font-semibold text-muted-foreground">No Kanban Page found in this project.</p>
                        <p className="text-sm text-muted-foreground mt-2">Create a Kanban Page in this project to see it reflected here.</p>
                    </div>
                );
            }

            return (
                <div className="w-full h-[400px] border rounded-md my-4 bg-background relative">
                    <div className="absolute top-2 right-2 z-10 bg-primary/10 text-primary text-xs px-2 py-1 rounded font-medium border border-primary/20 pointer-events-none">
                        Read Only Mirror
                    </div>
                    <KanbanView
                        columns={kanbanDocData.columns}
                        tasks={kanbanDocData.tasks}
                        setColumns={() => { }} // No-op
                        setTasks={() => { }} // No-op
                        currentUser={user}
                        collaborators={collaborators}
                        readOnly={true}
                    />
                </div>
            );
        },
    }
);
