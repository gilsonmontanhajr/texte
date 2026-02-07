"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Mail, UserPlus, Trash2, Link, RefreshCw, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ShareProjectDialogProps {
    projectId: string;
    projectTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Collaborator {
    user_email: string;
    role: string;
    created_at: string;
}

export function ShareProjectDialog({ projectId, projectTitle, open, onOpenChange }: ShareProjectDialogProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [fetching, setFetching] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [loadingPublicToggle, setLoadingPublicToggle] = useState(false);
    const [showRecursiveDialog, setShowRecursiveDialog] = useState(false);
    const [pendingPublicState, setPendingPublicState] = useState<boolean | null>(null);

    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    const fetchCollaborators = async () => {
        if (!projectId) return;
        setFetching(true);

        // Fetch project owner and public status
        const { data: projectData } = await supabase
            .from("documents")
            .select("user_id, is_public")
            .eq("id", projectId)
            .single();

        const { data: { user } } = await supabase.auth.getUser();

        if (projectData && user) {
            setIsOwner(projectData.user_id === user.id);
            setIsPublic(projectData.is_public || false);
        }

        const { data, error } = await supabase
            .from("document_collaborators")
            .select("*")
            .eq("document_id", projectId);

        if (error) {
            console.error("Error fetching collaborators:", error);
        } else {
            setCollaborators(data || []);
        }
        setFetching(false);
    };

    const performPublicUpdate = async (checked: boolean, recursive: boolean) => {
        setLoadingPublicToggle(true);
        try {
            if (recursive) {
                const { error } = await supabase.rpc('set_document_public_recursive', {
                    doc_id: projectId,
                    is_public_val: checked
                });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('documents')
                    .update({ is_public: checked })
                    .eq('id', projectId);
                if (error) throw error;
            }
            setIsPublic(checked);
        } catch (error) {
            console.error("Failed to update public status", error);
            toast.error("Failed to update status");
            setIsPublic(!checked); // result
        } finally {
            setLoadingPublicToggle(false);
            setShowRecursiveDialog(false);
        }
    };

    const handleTogglePublic = async (checked: boolean) => {
        // Optimistic update for UI feel, but we might revert if using dialog
        // Actually, better to wait for decision if dialog is needed.

        if (checked) {
            // Check for subpages
            setLoadingPublicToggle(true);
            const { count, error } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('parent_id', projectId);

            setLoadingPublicToggle(false);

            if (count && count > 0) {
                // Has subpages, ask user
                setPendingPublicState(checked);
                setShowRecursiveDialog(true);
                return;
            }
        }

        // No subpages or turning off (default behavior for now)
        // If turning off, we could also ask, but user request specified "in case of positive"
        performPublicUpdate(checked, false);
    };

    useEffect(() => {
        if (open) {
            fetchCollaborators();
        }
    }, [open, projectId]);

    const handleInvite = async () => {
        if (!email.trim()) return;
        setLoading(true);

        try {
            if (collaborators.some(c => c.user_email === email.trim())) {
                toast.error("User is already invited.");
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("document_collaborators")
                .insert({
                    document_id: projectId,
                    user_email: email.trim(),
                    role: 'view',
                    owner_id: user.id // Denormalized owner_id
                });

            if (error) throw error;

            setEmail("");
            fetchCollaborators();
        } catch (error: any) {
            console.error("Error inviting user:", error);
            toast.error("Failed to invite user: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!userToDelete) return;

        try {
            const { error } = await supabase
                .from("document_collaborators")
                .delete()
                .eq("document_id", projectId)
                .eq("user_email", userToDelete);

            if (error) throw error;
            fetchCollaborators();
        } catch (error: any) {
            console.error("Error removing user:", error);
            toast.error("Failed to remove user");
        } finally {
            setUserToDelete(null);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/editor/${projectId}`;
        navigator.clipboard.writeText(url);
        setCopied("main");
        setTimeout(() => setCopied(null), 2000);
    };

    const handleResend = (email: string) => {
        const url = `${window.location.origin}/editor/${projectId}`;
        navigator.clipboard.writeText(url);
        toast.success(`Link copied to clipboard for ${email}`);
    };

    return (
        <>
            <AlertDialog open={showRecursiveDialog} onOpenChange={setShowRecursiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish Subpages?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This page has subpages. Do you want to publish them as well?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => performPublicUpdate(pendingPublicState!, false)}>
                            No, only this page
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => performPublicUpdate(pendingPublicState!, true)}>
                            Yes, publish all
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Collaborator?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{userToDelete}</strong>? They will lose access immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Share Project</DialogTitle>
                        <DialogDescription>
                            Invite users to collaborate on <strong>{projectTitle}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-6 py-4 max-w-full overflow-hidden">
                        {isOwner && (
                            <div className="flex flex-col gap-4">
                                <Label>Invite by Email</Label>
                                <div className="flex gap-2 w-full max-w-full">
                                    <Input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                        className="flex-1 min-w-0"
                                    />
                                    <Button onClick={handleInvite} disabled={loading || !email.trim()} className="shrink-0">
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        <span className="ml-2">Invite</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Link Section */}
                        <div className="flex flex-col gap-2">
                            <Label>Project Link</Label>
                            <div className="flex gap-2 items-center border rounded-md p-2 bg-muted/30 max-w-full">
                                <Link className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                                <div className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/editor/${projectId}` : 'Loading...'}
                                </div>
                                <Button size="sm" variant="ghost" onClick={handleCopyLink} className="h-8 shrink-0">
                                    {copied === "main" ? <Check className="h-4 w-4 text-green-500" /> : "Copy"}
                                </Button>
                            </div>
                        </div>

                        {/* Public Form Toggle */}
                        {isOwner && (
                            <div className="flex flex-col gap-2 border-t pt-4 mt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <Label>Publish to Web</Label>
                                        <span className="text-xs text-muted-foreground">Allow anyone to view and submit forms</span>
                                    </div>
                                    <Switch
                                        checked={isPublic}
                                        onCheckedChange={handleTogglePublic}
                                        disabled={loadingPublicToggle}
                                    />
                                </div>
                                {isPublic && (
                                    <div className="flex gap-2 items-center border rounded-md p-2 bg-primary/5 mt-2 max-w-full">
                                        <div className="text-sm text-primary truncate flex-1 min-w-0 font-medium">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/forms/${projectId}` : 'Loading...'}
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            const url = `${window.location.origin}/forms/${projectId}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success("Public link copied");
                                        }} className="h-8 shrink-0">
                                            Copy
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Collaborators List */}
                        <div className="flex flex-col gap-2 border-t pt-4">
                            <Label>Invited Users ({collaborators.length})</Label>
                            <ScrollArea className="h-[200px] border rounded-md p-2 w-full max-w-full">
                                {fetching ? (
                                    <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                                    </div>
                                ) : collaborators.length === 0 ? (
                                    <div className="flex justify-center items-center h-full text-muted-foreground text-sm italic">
                                        No invitations sent yet.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {collaborators.map((c) => (
                                            <div key={c.user_email} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group max-w-full">
                                                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarFallback>{c.user_email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col truncate min-w-0">
                                                        <span className="text-sm font-medium truncate">{c.user_email}</span>
                                                        <span className="text-xs text-muted-foreground">Editor</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {isOwner && (
                                                        <>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8"
                                                                onClick={() => handleResend(c.user_email)}
                                                                title="Copy Link (Resend)"
                                                            >
                                                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => setUserToDelete(c.user_email)}
                                                                title="Remove Access"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
