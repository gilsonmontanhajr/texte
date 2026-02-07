"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { createContext, useContext, useState, ReactNode } from "react";

interface EditorContextType {
    editor: BlockNoteEditor | null;
    setEditor: (editor: BlockNoteEditor | null) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
    const [editor, setEditor] = useState<BlockNoteEditor | null>(null);

    return (
        <EditorContext.Provider value={{ editor, setEditor }}>
            {children}
        </EditorContext.Provider>
    );
}

export function useEditorContext() {
    return useContext(EditorContext);
}
