"use client";

import { useEffect, useState } from "react";
import { Task } from "./kanban-view";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { KanbanEditor } from "./kanban-editor";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Check, ChevronsUpDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TaskDetailsSheetProps {
    task: Task | null;
    open: boolean;
    onClose: () => void;
    onUpdate: (taskId: string | number, updates: Partial<Task>) => void;
    currentUser: any;
    collaborators: { email: string }[];
    readOnly?: boolean;
}

export function TaskDetailsSheet({ task, open, onClose, onUpdate, currentUser, collaborators, readOnly }: TaskDetailsSheetProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [newTag, setNewTag] = useState("");
    const [newComment, setNewComment] = useState("");
    const [assigneeEmail, setAssigneeEmail] = useState("");
    const [openAssignee, setOpenAssignee] = useState(false);

    // Sync state with task when opened
    useEffect(() => {
        if (task) {
            setTitle(task.content);
            setDescription(task.description || "");
            setAssigneeEmail(task.assignee?.email || "");
            setNewTag("");
            setNewComment("");
        }
    }, [task]);

    // Debounced description save
    useEffect(() => {
        if (!task || readOnly) return;

        const handler = debounce((desc: string) => {
            if (task && desc !== task.description) {
                onUpdate(task.id, { description: desc });
            }
        }, 1000);

        if (description !== task.description) {
            handler(description);
        }

        return () => {
            handler.cancel();
        };
    }, [description, task, onUpdate, readOnly]);

    const handleSaveTitle = () => {
        if (!task || readOnly) return;
        if (title !== task.content) {
            onUpdate(task.id, { content: title });
        }
    };

    const handleAddTag = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!task || !newTag.trim() || readOnly) return;
        const currentTags = task.tags || [];
        if (!currentTags.includes(newTag.trim())) {
            onUpdate(task.id, { tags: [...currentTags, newTag.trim()] });
        }
        setNewTag("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        if (!task || readOnly) return;
        const currentTags = task.tags || [];
        onUpdate(task.id, { tags: currentTags.filter(t => t !== tagToRemove) });
    };

    const handleAddComment = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!task || !newComment.trim() || readOnly) return;

        const comment = {
            id: uuidv4(),
            userId: currentUser?.id || "anonymous",
            userName: currentUser?.email || "Anonymous",
            text: newComment,
            createdAt: new Date().toISOString(),
        };

        const currentComments = task.comments || [];
        onUpdate(task.id, { comments: [...currentComments, comment] });
        setNewComment("");
    };

    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 sm:max-w-none gap-0 z-[9999]">
                <SheetHeader className="sr-only">
                    <SheetTitle>Task Details</SheetTitle>
                    <SheetDescription>Edit task details</SheetDescription>
                </SheetHeader>
                {task && (
                    <div className="grid grid-cols-2 h-full w-full">
                        {/* Left Column: Task Details */}
                        <div className="flex flex-col gap-6 p-8 overflow-y-auto border-r">
                            <div className="flex flex-col gap-2">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={handleSaveTitle}
                                    className="text-3xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 disabled:opacity-100"
                                    placeholder="Task Title"
                                    disabled={readOnly}
                                />
                                <div className="text-sm text-muted-foreground">
                                    in Column <span className="font-semibold text-foreground">{task.columnId}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 flex-grow min-h-[200px]">
                                <Label className="text-muted-foreground">Description</Label>
                                <KanbanEditor
                                    key={task.id}
                                    initialContent={description}
                                    onUpdate={(content) => {
                                        setDescription(content);
                                    }}
                                    collaborators={collaborators}
                                    readOnly={readOnly}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label className="text-muted-foreground">Assignee</Label>
                                <Popover open={openAssignee} onOpenChange={setOpenAssignee}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openAssignee}
                                            className="w-[300px] justify-between h-10 disabled:opacity-100"
                                            disabled={readOnly}
                                        >
                                            <div className="flex gap-2 items-center">
                                                {assigneeEmail ? (
                                                    <>
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback>{assigneeEmail.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        {assigneeEmail}
                                                    </>
                                                ) : (
                                                    "Select user..."
                                                )}
                                            </div>
                                            {!readOnly && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 z-[100]">
                                        <Command>
                                            <CommandInput placeholder="Search user..." />
                                            <CommandList>
                                                <CommandEmpty>No user found.</CommandEmpty>
                                                <CommandGroup>
                                                    {collaborators.map((user) => (
                                                        <CommandItem
                                                            key={user.email}
                                                            value={user.email}
                                                            onSelect={(currentValue) => {
                                                                const email = currentValue;
                                                                setAssigneeEmail(email === assigneeEmail ? "" : email);
                                                                setOpenAssignee(false);
                                                                if (email !== assigneeEmail) {
                                                                    onUpdate(task.id, {
                                                                        assignee: {
                                                                            id: email,
                                                                            email: email,
                                                                            name: email.split("@")[0]
                                                                        }
                                                                    });
                                                                } else {
                                                                    onUpdate(task.id, { assignee: undefined });
                                                                }
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    assigneeEmail === user.email ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {user.email}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label className="text-muted-foreground">Tags</Label>
                                <div className="flex flex-wrap gap-2">
                                    {task.tags?.map(tag => (
                                        <Badge key={tag} variant="secondary" className="pr-1 text-sm py-1">
                                            {tag}
                                            {!readOnly && (
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </Badge>
                                    ))}
                                    {!readOnly && (
                                        <form onSubmit={handleAddTag} className="w-[120px]">
                                            <Input
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="+ Tag"
                                                className="h-8 text-sm px-2"
                                            />
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Comments */}
                        <div className="flex flex-col gap-4 p-8 bg-muted/10 h-full overflow-hidden">
                            <Label className="text-lg font-semibold">Comments</Label>

                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                                {(!task.comments || task.comments.length === 0) && (
                                    <div className="text-muted-foreground text-sm italic py-4">No comments yet.</div>
                                )}
                                {task.comments?.map(comment => (
                                    <div key={comment.id} className="flex gap-3 bg-card p-3 rounded-lg border shadow-sm">
                                        <Avatar className="h-8 w-8 mt-1">
                                            <AvatarFallback>{comment.userName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-semibold text-sm">{comment.userName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!readOnly && (
                                <div className="mt-auto flex gap-3 items-start pt-4 border-t">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>ME</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 flex gap-2">
                                        <Textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Write a comment..."
                                            className="min-h-[60px]"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddComment();
                                                }
                                            }}
                                        />
                                        <Button size="icon" className="h-[60px] w-[60px]" onClick={handleAddComment} disabled={!newComment.trim()}>
                                            <Send size={20} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
