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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewProjectDialogProps {
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ICONS = ["📄", "📝", "🚀", "💡", "🎨", "📊", "📁", "📚", "📅", "✅", "🔥", "✨"];
const COLORS = [
    "#2563eb", // Blue
    "#dc2626", // Red
    "#d97706", // Amber
    "#16a34a", // Green
    "#9333ea", // Purple
    "#db2777", // Pink
    "#4f46e5", // Indigo
    "#0891b2", // Cyan
];

export function NewProjectDialog({ user, open, onOpenChange }: NewProjectDialogProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("📄");
    const [color, setColor] = useState(COLORS[0]);
    const [collaborators, setCollaborators] = useState(""); // Comma separated emails

    const handleCreate = async () => {
        if (!title.trim()) return;
        setLoading(true);

        try {
            // 1. Create Document
            const { data: doc, error: docError } = await supabase
                .from("documents")
                .insert([{
                    title: title,
                    description: description,
                    icon: icon,
                    color: color,
                    user_id: user.id
                }])
                .select()
                .single();

            if (docError) throw docError;

            // 2. Add Collaborators if any
            if (collaborators.trim()) {
                const emails = collaborators.split(',').map(e => e.trim()).filter(e => e);
                if (emails.length > 0) {
                    const collabRows = emails.map(email => ({
                        document_id: doc.id,
                        user_email: email,
                        role: 'view' // Default to view for now
                    }));

                    const { error: collabError } = await supabase
                        .from("document_collaborators")
                        .insert(collabRows);

                    if (collabError) console.error("Error adding collaborators:", collabError);
                }
            }

            router.push(`/editor/${doc.id}`);
            onOpenChange(false);
        } catch (error: any) {
            alert("Error creating project: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Customize your project icon, color, and details.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            Icon
                        </Label>
                        <div className="col-span-3">
                            <div className="flex flex-wrap gap-2">
                                {ICONS.map((i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setIcon(i)}
                                        className={cn(
                                            "text-2xl w-10 h-10 rounded-md flex items-center justify-center hover:bg-muted transition-colors",
                                            icon === i && "bg-muted ring-2 ring-primary"
                                        )}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            Color
                        </Label>
                        <div className="col-span-3">
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-8 h-8 rounded-full border border-muted flex items-center justify-center transition-transform hover:scale-110",
                                            color === c && "ring-2 ring-offset-2 ring-primary"
                                        )}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                            placeholder="Project Name"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Short description..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="collaborators" className="text-right">
                            Invite
                        </Label>
                        <Input
                            id="collaborators"
                            value={collaborators}
                            onChange={(e) => setCollaborators(e.target.value)}
                            className="col-span-3"
                            placeholder="email@example.com, another@test.com"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleCreate} disabled={loading || !title.trim()}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
