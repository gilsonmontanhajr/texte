"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { EditorProvider } from "@/components/editor/editor-context";

// Dynamically import Editor to avoid SSR issues with Yjs/BlockNote
const Editor = dynamic(() => import("@/components/editor/Editor"), { ssr: false });
const KanbanBoard = dynamic(() => import("@/components/kanban/kanban-board"), { ssr: false });
const CalendarPage = dynamic(() => import("@/components/calendar/calendar-page"), { ssr: false });
const NotificationManager = dynamic(() => import("@/components/notification-manager").then(mod => mod.NotificationManager), { ssr: false });


interface EditorClientProps {
    user: User;
    doc: any;
    projectDoc: any;
    initialContent: string; // or JSON
}

export default function EditorClient({ user, doc, projectDoc, initialContent }: EditorClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const projectId = doc.project_id || doc.id;
    const isProjectRoot = doc.id === projectId;

    return (
        <EditorProvider>
            <NotificationManager user={user} />
            <div className="flex h-screen overflow-hidden">
                {isSidebarOpen && (
                    <AppSidebar
                        projectId={projectId}
                        currentDocId={doc.id}
                        user={user}
                        projectTitle={projectDoc?.title}
                        projectIcon={projectDoc?.icon}
                    />
                )}

                <div className="flex-1 flex flex-col h-full bg-background relative">
                    <Navbar
                        user={user}
                        isSidebarOpen={isSidebarOpen}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />

                    {isProjectRoot ? (
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                            <div className="text-6xl mb-4">{doc.icon || "📁"}</div>
                            <h1 className="text-4xl font-bold mb-2">{doc.title}</h1>
                            <p className="text-xl text-muted-foreground max-w-md mb-8">
                                {doc.description || "Welcome to your project workspace."}
                            </p>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setIsSidebarOpen(true)}>
                                    Explore Files
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden" key={doc.id}>
                            {doc.type === 'kanban' ? (
                                <KanbanBoard
                                    docId={doc.id}
                                    user={user}
                                    initialContent={initialContent}
                                />
                            ) : doc.type === 'calendar' ? (
                                <CalendarPage
                                    docId={doc.id}
                                    user={user}
                                    projectId={projectId}
                                />
                            ) : (
                                <Editor
                                    docId={doc.id}
                                    user={user}
                                    projectId={projectId}
                                    initialContent={initialContent}
                                    docType={doc.type}
                                    docTitle={doc.title}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </EditorProvider>
    );
}
