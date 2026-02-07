"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Users, FileText } from "lucide-react";
import Link from "next/link";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    created_at: string;
    user_id: string;
    parent_id?: string | null;
    project_id?: string | null;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);
            fetchDocuments(user.id);
        };
        checkUser();
    }, [router, supabase]);

    const fetchDocuments = async (userId: string) => {
        // Fetch own documents OR shared documents
        // Since Supabase JS client doesn't support complex OR logic easily with RLS, 
        // we rely on the RLS policy "Users can view own or shared documents" 
        // and just select * from documents.
        const { data, error } = await supabase
            .from("documents")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setDocuments(data);
        }
        setLoading(false);
    };

    const promptDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        await supabase.from("documents").delete().eq("id", deleteId);
        setDocuments(documents.filter(doc => doc.id !== deleteId));
        setIsDeleteOpen(false);
        setDeleteId(null);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar user={user} />
            <div className="w-full p-4 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your Projects</h1>
                    <Button onClick={() => setIsNewProjectOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Button>
                </div>

                {documents.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No projects yet. Create one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.filter(doc => !doc.parent_id || doc.parent_id === doc.id).map((doc) => {
                            const isOwner = user?.id === doc.user_id;

                            // Find last edited child page for this project
                            const projectPages = documents.filter(d => d.project_id === doc.id && d.id !== doc.id);
                            // Sort by created_at (or updated_at if we had it, falling back to created_at)
                            // Assuming 'created_at' is proxy for last activity if we don't have updated_at yet, 
                            // BUT user asked for "Edited". 
                            // Editor updates 'content' but maybe not 'updated_at' column automatically?
                            // Supabase usually has updated_at. Let's assume we can sort by likely activity.
                            // If we added 'updated_at' to schema it would be better.
                            // For now, let's just pick the most recently CREATED page as a proxy, or just pick one.
                            // Better: Filter by those that are children.
                            const lastPage = projectPages.length > 0 ? projectPages[0] : null;
                            // Note: documents is already sorted by created_at desc from fetch.

                            return (
                                <div key={doc.id} className="flex flex-col h-full bg-card text-card-foreground rounded-xl border shadow-sm hover:border-primary transition-all group relative overflow-hidden">
                                    {/* Link Wrapper for the whole card EXCEPT buttons/links inside */}
                                    {/* Actually simpler to make Card clickable via router push or wrapping content */}
                                    <div
                                        className="absolute top-0 left-0 w-1 h-full opacity-80 z-0"
                                        style={{ backgroundColor: doc.color || "#000000" }}
                                    />

                                    <div className="p-6 pb-2 pl-8 relative z-10 flex-1 flex flex-col">
                                        <Link href={`/editor/${doc.id}`} className="block flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div
                                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-sm"
                                                    style={{ backgroundColor: (doc.color || "#000000") + '20' }}
                                                >
                                                    {doc.icon || "📁"}
                                                </div>
                                                {isOwner && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity -mt-2 -mr-2"
                                                        onClick={(e) => {
                                                            promptDelete(doc.id, e);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {!isOwner && (
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" /> Shared
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-semibold leading-none tracking-tight mb-2 truncate">{doc.title || "Untitled Project"}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {doc.description || "No description"}
                                            </p>
                                        </Link>
                                    </div>

                                    <div className="p-6 pt-0 pl-8 mt-auto relative z-10">
                                        {lastPage && (
                                            <div className="mt-4 pt-4 border-t text-sm">
                                                <span className="text-muted-foreground">Last edited: </span>
                                                <Link
                                                    href={`/editor/${lastPage.id}`}
                                                    className="font-medium hover:underline text-primary inline-flex items-center gap-1"
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    {lastPage.title}
                                                </Link>
                                            </div>
                                        )}
                                        {!lastPage && (
                                            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                                                No pages yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {user && (
                <NewProjectDialog
                    user={user}
                    open={isNewProjectOpen}
                    onOpenChange={setIsNewProjectOpen}
                />
            )}

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this project and all pages inside it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
