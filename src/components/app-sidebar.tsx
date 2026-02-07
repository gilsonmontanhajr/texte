"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
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
import {
    ChevronRight,
    ChevronDown,
    MoreHorizontal,
    Plus,
    Trash2,
    Edit2,
    Share2
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faFolder, faListUl, faCalendar } from "@fortawesome/free-solid-svg-icons";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { ShareProjectDialog } from "./share-project-dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users } from "lucide-react";
import { useProjectCollaborators } from "@/hooks/use-project-collaborators";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FileNode {
    id: string;
    title: string;
    parent_id: string | null;
    is_folder: boolean;
    icon?: string;
    type?: string;
    updated_at?: string;
    children?: FileNode[];
}

interface AppSidebarProps {
    projectId: string;
    currentDocId: string;
    className?: string;
    user: User;
    projectTitle?: string;
    projectIcon?: string;
}

export function AppSidebar({ projectId, currentDocId, className, user, projectTitle, projectIcon }: AppSidebarProps) {
    const [files, setFiles] = useState<FileNode[]>([]);
    const supabase = createClient();
    const router = useRouter();

    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [isRenameOpen, setIsRenameOpen] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    const [isShareOpen, setIsShareOpen] = useState(false);
    const [creatingParentId, setCreatingParentId] = useState<string | null | 'root'>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const { collaborators } = useProjectCollaborators(projectId, user);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const draggedId = active.id as string;
        const targetId = over.id as string;

        if (draggedId === targetId) return;

        await supabase.from("documents").update({
            parent_id: targetId,
            project_id: projectId
        }).eq("id", draggedId);

        fetchFiles();
    };

    const activeNode = activeId ? findNode(files, activeId) : null;
    const currentDocNode = currentDocId ? findNode(files, currentDocId) : null;

    const fetchFiles = async () => {
        if (!projectId) return;

        const { data } = await supabase
            .from("documents")
            .select("id, title, parent_id, is_folder, icon, updated_at, type")
            .eq("project_id", projectId)
            .order("is_folder", { ascending: false }) // Folders first
            .order("title");

        if (data) {
            setFiles(buildTree(data));
        }
    };

    useEffect(() => {
        fetchFiles();

        // Realtime subscription
        const channel = supabase
            .channel(`project-${projectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'documents',
                filter: `project_id=eq.${projectId}`
            }, () => {
                fetchFiles();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, supabase]);

    const buildTree = (flatList: any[]): FileNode[] => {
        const idMapping = flatList.reduce((acc: any, el: any, i: number) => {
            acc[el.id] = i;
            return acc;
        }, {});

        const root: FileNode[] = [];

        flatList.forEach((el) => {
            if (el.id === projectId) return;

            if (!el.parent_id || el.parent_id === projectId) {
                root.push(el);
                return;
            }

            const parentEl = flatList[idMapping[el.parent_id]];
            if (parentEl) {
                parentEl.children = [...(parentEl.children || []), el];
            } else {
                root.push(el);
            }
        });

        return root;
    };

    const promptDelete = (id: string) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        await supabase.from("documents").delete().eq("id", deleteId);

        if (deleteId === currentDocId) {
            router.push(`/editor/${projectId}`);
        }

        setIsDeleteOpen(false);
        setDeleteId(null);
        fetchFiles();
    };

    const startRename = (id: string, currentTitle: string) => {
        setRenamingId(id);
        setNewName(currentTitle);
        setIsRenameOpen(true);
    };

    const handleRename = async () => {
        if (!renamingId || !newName.trim()) return;

        await supabase.from("documents").update({ title: newName }).eq("id", renamingId);
        setIsRenameOpen(false);
        setRenamingId(null);
        fetchFiles();
    };

    const handleCreateStart = (parentId: string | null, isFolder: boolean) => {
        setCreatingParentId(parentId || 'root');
        setIsCreatingFolder(isFolder);
    };

    const handleCreateConfirm = async (name: string, parentId: string | null) => {
        setCreatingParentId(null);
        if (!name.trim()) return;

        const { data, error } = await supabase.from("documents").insert({
            title: name.trim(),
            parent_id: parentId === 'root' ? projectId : parentId,
            project_id: projectId,
            is_folder: isCreatingFolder,
            icon: isCreatingFolder ? null : "📄",
            user_id: user.id,
            content: [
                {
                    type: "heading",
                    props: { level: 1, textColor: "default", backgroundColor: "default", textAlignment: "left" },
                    content: [{ type: "text", text: name.trim(), styles: {} }],
                    children: []
                }
            ]
        }).select().single();

        if (error) {
            console.error("Error creating file:", error);
            alert("Failed to create file: " + error.message);
        } else {
            // Refresh list immediately
            fetchFiles();
            // Open the new page if it's not a folder (folders don't have editor pages usually, or do they?)
            if (!isCreatingFolder) {
                router.push(`/editor/${data.id}`);
            }
        }
    };

    const handleCreateCancel = () => {
        setCreatingParentId(null);
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={cn("w-64 border-r h-full bg-muted/5 flex flex-col transition-all duration-300 no-print print:hidden", className)}>
                {/* Branding Level */}
                <Link href="/dashboard" className="p-4 border-b flex items-center gap-2 hover:bg-muted/50 transition-colors">
                    <span className="bg-primary text-primary-foreground p-1 rounded font-bold">Tx</span>
                    <span className="font-bold text-xl">Texte</span>
                </Link>

                {/* Project Level */}
                <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg flex-shrink-0">{projectIcon || "📁"}</span>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate max-w-[120px]" title={projectTitle}>
                                {projectTitle || "Project"}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsShareOpen(true)} title="Share Project">
                            <Share2 className="h-4 w-4" />
                        </Button>

                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCreateStart(null, false)} title="New Page">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ShareProjectDialog
                    projectId={projectId}
                    projectTitle={projectTitle || "Project"}
                    open={isShareOpen}
                    onOpenChange={setIsShareOpen}
                />

                <div className="flex-1 overflow-y-auto p-2">
                    {files.map(node => (
                        <FileItem
                            key={node.id}
                            node={node}
                            projectId={projectId}
                            currentDocId={currentDocId}
                            onCreate={handleCreateStart}
                            onDelete={promptDelete}
                            onRename={startRename}
                            creatingParentId={creatingParentId}
                            onConfirmCreate={handleCreateConfirm}
                            onCancelCreate={handleCreateCancel}
                            isCreatingFolder={isCreatingFolder}
                        />
                    ))}
                    {creatingParentId === 'root' && (
                        <NewFileItem
                            isFolder={isCreatingFolder}
                            onConfirm={(name) => handleCreateConfirm(name, 'root')}
                            onCancel={handleCreateCancel}
                        />
                    )}
                </div>

                {/* Bottom Footer: Calendar + Save Info */}
                <div className="border-t mt-auto bg-background">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start rounded-none h-10 px-4 border-b hover:bg-muted/50">
                                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-left text-sm font-medium">Online Users</span>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border">
                                    {collaborators.length}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-60 mb-2" align="center" side="top">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">ProjecT Team</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-[200px] overflow-y-auto">
                                {collaborators.map((c, i) => (
                                    <DropdownMenuItem key={i} className="gap-2 cursor-pointer">
                                        <Avatar className="h-6 w-6 border">
                                            <AvatarFallback className="text-[10px]" style={{ backgroundColor: c.color + '20', color: c.color }}>
                                                {c.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate text-sm font-medium leading-none">{c.name}</span>
                                            <span className="truncate text-[10px] text-muted-foreground">{c.email}</span>
                                        </div>
                                        {c.email === user?.email && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">You</span>}
                                    </DropdownMenuItem>
                                ))}
                                {collaborators.length === 0 && (
                                    <div className="p-2 text-xs text-center text-muted-foreground">
                                        No other users active
                                    </div>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="p-2 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={new Date()}
                            className="rounded-md border shadow scale-90 origin-bottom"
                        />
                    </div>

                    {currentDocNode?.updated_at && (
                        <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                            Saved at {format(new Date(currentDocNode.updated_at), "yyyy/MM/dd - HH:mm")}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this file/folder and all of its contents.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* DragOverlay */}
            <DragOverlay>
                {activeNode ? (
                    <div className="bg-background border rounded px-2 py-1 shadow-lg opacity-80 flex items-center gap-2">
                        {activeNode.is_folder ? (
                            <FontAwesomeIcon icon={faFolder} className="h-4 w-4 text-blue-400" />
                        ) : activeNode.type === 'kanban' ? (
                            <FontAwesomeIcon icon={faListUl} className="h-4 w-4" />
                        ) : activeNode.type === 'calendar' ? (
                            <FontAwesomeIcon icon={faCalendar} className="h-4 w-4 text-purple-500" />
                        ) : (
                            <FontAwesomeIcon icon={faFile} className="h-4 w-4" />
                        )}
                        <span>{activeNode.title}</span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function findNode(nodes: FileNode[], id: string): FileNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

function hasActiveDescendant(node: FileNode, activeId: string): boolean {
    if (node.id === activeId) return true;
    if (node.children) {
        return node.children.some(child => hasActiveDescendant(child, activeId));
    }
    return false;
}

function FileItem({ node, projectId, currentDocId, onCreate, onDelete, onRename, creatingParentId, onConfirmCreate, onCancelCreate, isCreatingFolder }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = node.id === currentDocId;
    const isCreatingInside = creatingParentId === node.id;

    useEffect(() => {
        if (isCreatingInside) {
            setIsOpen(true);
        } else if (currentDocId && hasActiveDescendant(node, currentDocId)) {
            setIsOpen(true);
        }
    }, [isCreatingInside, currentDocId, node]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div className={cn(
                        "group flex items-center py-1 px-2 rounded-md hover:bg-muted/50 mb-1 select-none cursor-pointer",
                        isActive && "bg-muted font-medium text-primary"
                    )}>
                        {node.is_folder ? (
                            <CollapsibleTrigger asChild>
                                <button className="mr-1 p-0.5 hover:bg-muted-foreground/20 rounded">
                                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                            </CollapsibleTrigger>
                        ) : (
                            <span className="w-4" /> // Spacer
                        )}

                        <Link href={`/editor/${node.id}`} className="flex-1 flex items-center gap-2 truncate text-sm">
                            <span className="text-lg leading-none text-foreground">
                                {node.type === 'kanban' ? (
                                    <FontAwesomeIcon icon={faListUl} className="h-4 w-4 text-orange-500/80" />
                                ) : node.type === 'calendar' ? (
                                    <FontAwesomeIcon icon={faCalendar} className="h-4 w-4 text-purple-500" />
                                ) : (
                                    <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-muted-foreground" />
                                )}
                            </span>
                            <span className="truncate">{node.title}</span>
                        </Link>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => {
                        setIsOpen(true);
                        onCreate(node.id, false);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> New Page
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => onRename(node.id, node.title)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onDelete(node.id)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <CollapsibleContent className="pl-4 border-l ml-2">
                {isCreatingInside && (
                    <NewFileItem
                        isFolder={isCreatingFolder}
                        onConfirm={(name: string) => onConfirmCreate(name, node.id)}
                        onCancel={onCancelCreate}
                    />
                )}
                {node.children?.map((child: any) => (
                    <FileItem
                        key={child.id}
                        node={child}
                        projectId={projectId}
                        currentDocId={currentDocId}
                        onCreate={onCreate}
                        onDelete={onDelete}
                        onRename={onRename}
                        creatingParentId={creatingParentId}
                        onConfirmCreate={onConfirmCreate}
                        onCancelCreate={onCancelCreate}
                        isCreatingFolder={isCreatingFolder}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

function NewFileItem({ isFolder, onConfirm, onCancel }: { isFolder: boolean, onConfirm: (name: string) => void, onCancel: () => void }) {
    const [name, setName] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onConfirm(name);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex items-center py-1 px-2 mb-1 gap-2">
            <span className="text-lg leading-none text-foreground opacity-70">
                {isFolder ? <FontAwesomeIcon icon={faFolder} className="h-4 w-4 text-blue-400" /> : <FontAwesomeIcon icon={faFile} className="h-4 w-4" />}
            </span>
            <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (name.trim()) onConfirm(name); else onCancel();
                }}
                autoFocus
                className="h-6 text-sm py-0 px-1"
                placeholder={isFolder ? "Folder Name" : "Page Name"}
            />
        </div>
    );
}
