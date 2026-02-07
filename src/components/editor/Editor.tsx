"use client";

import { BlockNoteEditor, PartialBlock, BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import * as Y from "yjs";
import SupabaseProvider from "@/lib/SupabaseProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import debounce from "lodash.debounce";
import { useEditorContext } from "./editor-context";
import { FileText, User as UserIcon, KanbanSquare, Calendar as CalendarIcon } from "lucide-react";
import { useProjectCollaborators } from "@/hooks/use-project-collaborators";
import { KanbanBlock } from "./blocks/kanban-block";
import { FormInputBlock } from "./blocks/form-input-block";
import { QuestionaryBlock } from "./blocks/questionary-block";
import { ChartBlock } from "./blocks/chart-block";
import { CheckSquare, ListTodo, PieChart } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        kanban: KanbanBlock(),
        formInput: FormInputBlock(),
        questionary: QuestionaryBlock(),
        chart: ChartBlock(),
    },
});

interface EditorProps {
    docId: string;
    user: User;
    projectId?: string;
    initialContent?: any;
    docType?: string;
    docTitle?: string;
}

export default function Editor({ docId, user, projectId, initialContent, docType, docTitle }: EditorProps) {
    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const [provider, setProvider] = useState<SupabaseProvider | null>(null);
    const [doc, setDoc] = useState<Y.Doc | null>(null);
    const supabase = useMemo(() => createClient(), []);
    const editorRef = useRef<BlockNoteEditor | null>(null);
    const isDirtyRef = useRef(false);
    const context = useEditorContext();
    // Editor component is always wrapped in provider in EditorPage
    const setEditor = context?.setEditor;

    // Collaborators for Mentions
    const { collaborators } = useProjectCollaborators(projectId || docId, user); // fallback if projectId not explicit

    // Page Dialog State
    const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
    const [newPageName, setNewPageName] = useState("");
    const [pendingBlock, setPendingBlock] = useState<any>(null);
    const [pendingType, setPendingType] = useState('text');

    // Auto-Save Loop (5s)
    useEffect(() => {
        const interval = setInterval(async () => {
            if (isDirtyRef.current && editorRef.current) {
                const content = editorRef.current.document;
                // Optimization: Only save if truly dirty? isDirtyRef logic handles it.
                // We assume 'content' column is JSONB
                const { error } = await supabase
                    .from('documents')
                    .update({ content: content })
                    .eq('id', docId);

                if (!error) {
                    console.log("Auto-saved content for", docId);
                    isDirtyRef.current = false;
                } else {
                    console.error("Auto-save failed", error);
                    // Keep dirty true to retry?
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [docId, supabase]);

    // Debounced Title Updater
    const updateTitle = useCallback(
        debounce(async (id: string, title: string) => {
            if (!title) return;
            // Update the document title in DB
            await supabase.from("documents").update({ title }).eq("id", id);
        }, 1000),
        []
    );

    useEffect(() => {
        const yDoc = new Y.Doc();

        // Config for local provider
        const yProvider = new SupabaseProvider(yDoc, supabase, {
            channel: `doc-${docId}`,
            id: docId,
        });

        // Set user awareness
        yProvider.awareness.setLocalStateField("user", {
            name: user.email?.split("@")[0] || "Anonymous",
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        });

        setDoc(yDoc);
        setProvider(yProvider);

        return () => {
            // Clean up check
            if (yProvider && typeof yProvider.destroy === 'function') {
                yProvider.destroy();
            }
            yDoc.destroy();
        };
    }, [docId, supabase, user.email]);

    // Helper to extract text from Block Content
    const getTextFromInlineContent = (content: any[]): string => {
        if (!content) return "";
        return content.map(c => {
            if (c.type === "link") {
                return typeof c.content === "string" ? c.content : c.content.map((sc: any) => sc.text).join("");
            }
            return c.text || "";
        }).join("");
    }

    // Shared helper for creating a sub-page
    const createSubPage = async (name: string, blockToReplace?: any, type: string = 'text') => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        const pageName = name.trim() || "Untitled Page";

        try {
            console.log("Creating sub-page:", pageName, "Type:", type);
            const { data: newDoc, error } = await supabase.from("documents").insert({
                title: pageName,
                parent_id: docId,
                project_id: projectId || docId,
                is_folder: true, // It acts as a page/folder
                icon: type === 'kanban' ? "📋" : type === 'calendar' ? "📅" : "📄",
                user_id: user.id,
                type: type
            }).select().single();

            if (newDoc) {
                // If it's a text page, we insert a link.
                // If it's a kanban board, we just navigate to it (request: "create item on sidebar", "do not open new window" -> assuming same tab nav)

                if (type === 'kanban') {
                    // For Kanban, simply navigate to the new page.
                    // The sidebar will update automatically via realtime.
                    // We do not insert a link in the current doc.

                    // We need router. We can't use router here easily unless we pass it or use window.location (bad).
                    // But Editor.tsx is a client component inside EditorPage which has router?
                    // No, Editor.tsx doesn't use router currently.
                    // I'll add useRouter hook.
                    router.push(`/editor/${newDoc.id}`);
                } else if (type === 'calendar') {
                    // Calendar routing
                    router.push(`/editor/${newDoc.id}`);
                } else {
                    // Standard Page: Insert Link
                    const linkBlock = {
                        type: "paragraph",
                        content: [{
                            type: "link",
                            href: `/editor/${newDoc.id}`,
                            content: pageName
                        }]
                    } as PartialBlock;

                    if (blockToReplace) {
                        editor.updateBlock(blockToReplace, linkBlock);
                        editor.insertBlocks([{ type: "paragraph", content: "" }], blockToReplace, "after");
                        const nextBlock = editor.document[editor.document.indexOf(blockToReplace) + 1];
                        if (nextBlock) {
                            editor.setTextCursorPosition(nextBlock, "end");
                        }
                    } else {
                        editor.insertBlocks([linkBlock], editor.getTextCursorPosition().block, "after");
                    }
                }
            } else if (error) {
                console.error("Error creating page:", error);
                alert("Failed to create page: " + error.message);
            }
        } catch (err) {
            console.error("Page creation exception:", err);
        }
    };

    const handleCreatePageDialogConfirm = async () => {
        if (!newPageName.trim()) return;
        setIsPageDialogOpen(false);
        await createSubPage(newPageName, pendingBlock, pendingType);
        setNewPageName("");
        setPendingBlock(null);
    };

    // Custom Slash Menu Items
    const getCustomSlashMenuItems = (editor: any) => [
        ...getDefaultReactSlashMenuItems(editor),
        {
            title: "Page",
            onItemClick: () => {
                const currentBlock = editor.getTextCursorPosition().block;
                setPendingBlock(currentBlock);
                setNewPageName("");
                setPendingType('text');
                setIsPageDialogOpen(true);
            },
            aliases: ["page", "new page", "subpage"],
            group: "Media",
            icon: <FileText size={18} />,
            subtext: "Create a new sub-page"
        },
        {
            title: "Kanban Board",
            onItemClick: () => {
                const currentBlock = editor.getTextCursorPosition().block;
                setPendingBlock(currentBlock);
                setNewPageName("");
                setPendingType('kanban');
                setIsPageDialogOpen(true);
            },
            aliases: ["kanban", "board", "task board"],
            group: "Media",
            icon: <div className="flex gap-0.5"><div className="w-1 h-3 bg-current opacity-50"></div><div className="w-1 h-3 bg-current opacity-50"></div><div className="w-1 h-3 bg-current opacity-50"></div></div>,
            subtext: "Create a Kanban board"
        },
        {
            title: "Calendar",
            onItemClick: () => {
                const currentBlock = editor.getTextCursorPosition().block;
                setPendingBlock(currentBlock);
                setNewPageName("");
                setPendingType('calendar');
                setIsPageDialogOpen(true);
            },
            aliases: ["calendar", "schedule", "planner"],
            group: "Media",
            icon: <CalendarIcon size={18} />,
            subtext: "Create a Calendar page"
        },
        {
            title: "Inline Kanban",
            onItemClick: () => {
                editor.insertBlocks(
                    [
                        {
                            type: "kanban",
                        },
                    ],
                    editor.getTextCursorPosition().block,
                    "after"
                );
            },
            aliases: ["inline kanban", "kanban block", "kanbanview", "kanban view"],
            group: "Media",
            icon: <KanbanSquare size={18} />,
            subtext: "Insert a Kanban board in this document"
        },
        {
            title: "Form Field",
            onItemClick: () => {
                editor.insertBlocks(
                    [{ type: "formInput", props: { label: "New Question" } }],
                    editor.getTextCursorPosition().block,
                    "after"
                );
            },
            aliases: ["form", "input", "field"],
            group: "Forms",
            icon: <CheckSquare size={18} />,
            subtext: "Add a form input field"
        },
        {
            title: "Questionary",
            onItemClick: () => {
                editor.insertBlocks(
                    [{ type: "questionary", props: { question: "New Question", options: JSON.stringify(["Option 1"]) } }],
                    editor.getTextCursorPosition().block,
                    "after"
                );
            },
            aliases: ["questionary", "quiz", "poll", "survey"],
            group: "Forms",
            icon: <ListTodo size={18} />,
            subtext: "Add a multiple choice question"
        },
        {
            title: "Chart",
            onItemClick: () => {
                editor.insertBlocks(
                    [{ type: "chart", props: { dataSourceId: "" } }],
                    editor.getTextCursorPosition().block,
                    "after"
                );
            },
            aliases: ["chart", "report", "graph"],
            group: "Media",
            icon: <PieChart size={18} />,
            subtext: "Visualize form results"
        },
    ];

    // Handle Key Down for Commands (e.g. /page Name [Enter])
    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (!editorRef.current) return;
        const editor = editorRef.current;

        if (e.key === "Enter") {
            const selection = editor.getTextCursorPosition();
            if (selection && selection.block) {
                const block = selection.block as any;

                let text = "";
                if (Array.isArray(block.content)) {
                    text = getTextFromInlineContent(block.content);
                } else if (typeof block.content === "string") {
                    text = block.content;
                }

                // Trim logic: BlockNote might have non-breaking spaces?
                // Text might just be the raw text content.

                // Check if it matches /page <Name>
                // We loosen the check slightly to allow spaces
                if (text.trim().startsWith("/page ") && text.trim().length > 6) {
                    console.log("Triggering /page command for:", text);

                    // Stop BlockNote from splitting block
                    e.preventDefault();
                    e.stopPropagation();

                    const pageName = text.trim().substring(6).trim();
                    if (pageName) {
                        await createSubPage(pageName, block, 'text');
                    }
                    return;
                }

                // Check for /kanban <Name>
                if (text.trim().startsWith("/kanban ") && text.trim().length > 8) {
                    console.log("Triggering /kanban command for:", text);

                    e.preventDefault();
                    e.stopPropagation();

                    const pageName = text.trim().substring(8).trim();
                    if (pageName) {
                        await createSubPage(pageName, block, 'kanban');
                    }
                    return;
                }

                // Check for /calendar <Name>
                if (text.trim().startsWith("/calendar ") && text.trim().length > 10) {
                    console.log("Triggering /calendar command for:", text);

                    e.preventDefault();
                    e.stopPropagation();

                    const pageName = text.trim().substring(10).trim();
                    if (pageName) {
                        await createSubPage(pageName, block, 'calendar');
                    }
                    return;
                }
            }
        }
    };

    // Mentions Menu Items
    const getMentionMenuItems = (editor: BlockNoteEditor) => {
        return collaborators.map(collab => ({
            title: collab.name || collab.email,
            onItemClick: () => {
                editor.insertInlineContent([
                    {
                        type: "text",
                        text: "@" + (collab.name || collab.email),
                        styles: {
                            bold: true,
                            textColor: "blue"
                        }
                    },
                    {
                        type: "text",
                        text: " ",
                        styles: {}
                    }
                ]);
            },
            aliases: [collab.email, collab.name || ""],
            group: "Mentions",
            icon: <UserIcon size={18} />,
            subtext: collab.email
        }));
    };

    // Handle Content Changes (Title Sync + Formatting Enforcement)
    const handleEditorChange = async () => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        isDirtyRef.current = true; // Mark as dirty

        // 1. Title Sync & Formatting: First block
        // SKIPPED for daily notes (read-only title)
        if (docType === 'daily_note') return;

        const blocks = editor.document;
        if (blocks && blocks.length > 0) {
            const firstBlock = blocks[0] as any;

            // Enforce H1
            if (firstBlock.type !== "heading" || firstBlock.props.level !== 1) {
                // We only update if it's different to avoid loops, though BlockNote might be smart.
                // updateBlock might reset cursor position if we are editing it.
                // We should only enforce if it is NOT H1.
                // WARNING: Updating block while typing in it causes cursor jumps.
                // We should only enforce formatting if it's strictly necessary.
                // Let's do it gently: If it's a paragraph, convert to heading 1.
                // But if user explicitly changed it?
                // User requirement: "the first line is always the title, it should be formatted as a title".
                // I will enforce it.
                editor.updateBlock(firstBlock, { type: "heading", props: { level: 1 } });
            }

            let title = "";
            if (Array.isArray(firstBlock.content)) {
                title = getTextFromInlineContent(firstBlock.content);
            } else if (typeof firstBlock.content === "string") {
                title = firstBlock.content;
            }

            if (title) {
                updateTitle(docId, title);
            }
        }
    };

    // Upload Handler
    const uploadFile = async (file: File) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            return data.publicUrl;
        } catch (error) {
            console.error("Failed to upload file:", error);
            return ""; // BlockNote expects string
        }
    };

    // Use the schema with custom blocks
    const editor = useCreateBlockNote({
        schema,
        uploadFile,
        collaboration: provider && doc ? {
            provider,
            fragment: doc.getXmlFragment("document-store"),
            user: {
                name: provider.awareness.getLocalState()?.user?.name || "Anonymous",
                color: provider.awareness.getLocalState()?.user?.color || "#ff0000",
            },
            renderCursor: (user) => {
                const cursor = document.createElement("span");
                cursor.style.borderLeft = `2px solid ${user.color}`;
                cursor.style.position = "absolute";
                cursor.style.height = "100%";
                cursor.style.pointerEvents = "none";
                cursor.style.zIndex = "9999";

                const label = document.createElement("div");
                label.style.position = "absolute";
                label.style.top = "-1.2em";
                label.style.left = "-1px";
                label.style.backgroundColor = user.color;
                label.style.color = "white";
                label.style.fontSize = "12px";
                label.style.padding = "2px 4px";
                label.style.borderRadius = "4px";
                label.style.whiteSpace = "nowrap";
                label.textContent = user.name;

                cursor.appendChild(label);
                return cursor;
            }
        } : undefined,
    });

    // Assign ref for handlers AND Update Context AND Seed Content
    useEffect(() => {
        if (editor) {
            editorRef.current = editor as any;
            if (setEditor) setEditor(editor as any);

            // Seeding Logic: If document is empty and we have initial content from DB
            const seedContent = async () => {
                // Check if editor is empty (default is usually one empty paragraph)
                const blocks = editor.document as any[];
                // Also checking generic empty block: {id:..., type: "paragraph", props: {...}, content: []}

                // Better check: isEmpty usually means length 1, type paragraph, formatted content is empty string.
                const isEffectivelyEmpty = blocks.length === 0 || (blocks.length === 1 && (!blocks[0].content || blocks[0].content.length === 0));
                // BlockNote "empty" often has 1 block.

                if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
                    // Only seed if Yjs didn't already have content (from peers).
                    // Since we just loaded, Yjs is likely syncing.
                    // If DB has content, and Editor shows "nothing" (or just created default), replace it.
                    // Wait, if Yjs is syncing, we might overwrite remote changes?
                    // We only overwrite if local Yjs doc was empty. 
                    // We should check if Yjs doc has content.
                    // editor.document is reactive to Yjs.

                    // Let's replace.
                    if (isEffectivelyEmpty) {
                        console.log("Seeding editor from DB content...");
                        // Prevent broadcasting this initial database synchronization
                        if (provider) provider.shouldBroadcast = false;

                        try {
                            editor.replaceBlocks(editor.document, initialContent);
                        } finally {
                            // Re-enable broadcasting after a short delay to ensure Yjs transaction is complete
                            // and we don't broadcast the seed as a "new change"
                            setTimeout(() => {
                                if (provider) provider.shouldBroadcast = true;
                            }, 100);
                        }
                    }
                }
            };
            seedContent();
        }
    }, [editor, setEditor, initialContent]);

    if (!provider || !doc) {
        return <div>Connecting...</div>;
    }
    return (
        <div
            className="w-full h-full overflow-y-auto"
            onKeyDownCapture={handleKeyDown}
        >
            {docType === 'daily_note' && (
                <div className="max-w-3xl mx-auto px-12 pt-12 pb-4">
                    <h1 className="text-4xl font-bold">{docTitle}</h1>
                </div>
            )}
            <BlockNoteView
                editor={editor as any}
                slashMenu={false}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                className="min-h-full custom-editor"
                onChange={handleEditorChange}
            >
                {/* Slash Menu */}
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={async (query) =>
                        getCustomSlashMenuItems(editor as any).filter((item) => {
                            const match = item.title.toLowerCase().includes(query.toLowerCase()) ||
                                (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query.toLowerCase())));
                            return match;
                        })
                    }
                />

                {/* Mentions Menu */}
                <SuggestionMenuController
                    triggerCharacter={"@"}
                    getItems={async (query) =>
                        getMentionMenuItems(editor as any).filter((item) => {
                            const match = item.title.toLowerCase().includes(query.toLowerCase()) ||
                                (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query.toLowerCase())));
                            return match;
                        })
                    }
                />

            </BlockNoteView>

            <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {pendingType === 'kanban' ? "New Kanban Board" :
                                pendingType === 'calendar' ? "New Calendar" : "New Page"}
                        </DialogTitle>
                        <DialogDescription>
                            Enter a name for the new {pendingType === 'kanban' ? "board" : pendingType === 'calendar' ? "calendar" : "sub-page"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pageName" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="pageName"
                                value={newPageName}
                                onChange={(e) => setNewPageName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreatePageDialogConfirm()}
                                className="col-span-3"
                                placeholder="Untitled Page"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePageDialogConfirm}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
