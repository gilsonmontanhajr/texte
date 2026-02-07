"use client";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { UserIcon } from "lucide-react";

interface KanbanEditorProps {
    initialContent: string | undefined;
    onUpdate: (content: string) => void; // We will pass back Markdown string for simplicity in storage
    collaborators: { email: string; name?: string }[];
    readOnly?: boolean;
}

export function KanbanEditor({ initialContent, onUpdate, collaborators, readOnly }: KanbanEditorProps) {
    const { resolvedTheme } = useTheme();
    const editorRef = useRef<BlockNoteEditor | null>(null);

    // Create editor instance
    const editor = useCreateBlockNote({
        // We load content asynchronously
    });

    const [loaded, setLoaded] = useState(false);

    // Load Initial Content
    useEffect(() => {
        if (editor && initialContent && !loaded) {
            const load = async () => {
                const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
                editor.replaceBlocks(editor.document, blocks);
                setLoaded(true);
            };
            load();
        } else if (editor && !loaded) {
            setLoaded(true); // Empty content is fine, just mark loaded
        }
    }, [editor, initialContent, loaded]);

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

    const handleChange = async () => {
        if (editor) {
            // Convert to Markdown string for storage
            const markdown = await editor.blocksToMarkdownLossy(editor.document);
            onUpdate(markdown);
        }
    };

    return (
        <div className="w-full h-full min-h-[150px] border rounded-md overflow-hidden bg-background">
            <BlockNoteView
                editor={editor}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                className="min-h-[150px]"
                onChange={handleChange}
                editable={!readOnly}
            >
                {/* Slash Menu */}
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={async (query) =>
                        getDefaultReactSlashMenuItems(editor).filter((item) =>
                            item.title.toLowerCase().includes(query.toLowerCase())
                        )
                    }
                />

                {/* Mentions Menu */}
                <SuggestionMenuController
                    triggerCharacter={"@"}
                    getItems={async (query) =>
                        getMentionMenuItems(editor).filter((item) => {
                            const match = item.title.toLowerCase().includes(query.toLowerCase()) ||
                                (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query.toLowerCase())));
                            return match;
                        })
                    }
                />
            </BlockNoteView>
        </div>
    );
}
