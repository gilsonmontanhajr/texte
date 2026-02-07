"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DialogProps } from "@radix-ui/react-dialog";
import { File, Folder, Laptop, Moon, Sun, Search, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import debounce from "lodash.debounce";
import { createClient } from "@/lib/supabase/client";

import { cn } from "@/lib/utils";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";

interface DocumentResult {
    id: string;
    title: string;
    icon: string | null;
    type: string | null;
    project_id: string | null;
    is_root?: boolean; // We might determine this manually
    matchType?: "title" | "content";
}

export function CommandMenu({ ...props }: DialogProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const { setTheme } = useTheme();
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<DocumentResult[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Toggle with Cmd+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const supabase = React.useMemo(() => createClient(), []);

    // Search Logic
    const searchDocuments = React.useMemo(
        () =>
            debounce(async (searchQuery: string) => {
                if (!searchQuery.trim()) {
                    setResults([]);
                    setLoading(false);
                    return;
                }

                setLoading(true);

                try {
                    // Search Titles
                    const { data: titleData, error: titleError } = await supabase
                        .from("documents")
                        .select("id, title, icon, type, project_id, parent_id")
                        .ilike("title", `%${searchQuery}%`)
                        .limit(5);

                    // Search Content (casting JSON content to text)
                    // Note: This matches roughly. For deep JSON search we might need proper text search index,
                    // but casting to text works for basic keyword matching in small/medium db.
                    const { data: contentData, error: contentError } = await supabase
                        .from("documents")
                        .select("id, title, icon, type, project_id, parent_id")
                        .ilike("content::text", `%${searchQuery}%`)
                        .limit(5);

                    const combined = new Map<string, DocumentResult>();

                    if (titleData) {
                        titleData.forEach(doc => {
                            combined.set(doc.id, {
                                ...doc,
                                is_root: !doc.parent_id || doc.id === doc.project_id,
                                matchType: "title"
                            });
                        });
                    }

                    if (contentData) {
                        contentData.forEach(doc => {
                            if (!combined.has(doc.id)) {
                                combined.set(doc.id, {
                                    ...doc,
                                    is_root: !doc.parent_id || doc.id === doc.project_id,
                                    matchType: "content"
                                });
                            }
                        });
                    }

                    setResults(Array.from(combined.values()));
                } catch (err) {
                    console.error("Search error:", err);
                } finally {
                    setLoading(false);
                }
            }, 300),
        [supabase]
    );

    React.useEffect(() => {
        searchDocuments(query);
        // Cancel debounce on unmount not strictly necessary but good practice
        // searchDocuments.cancel() if using proper lodash type
    }, [query, searchDocuments]);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    const projects = results.filter(r => r.is_root);
    const pages = results.filter(r => !r.is_root);

    return (
        <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
            <CommandInput
                placeholder="Type a command or search..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {query.length === 0 && (
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <Laptop className="mr-2 h-4 w-4" />
                            Dashboard
                        </CommandItem>
                    </CommandGroup>
                )}

                {projects.length > 0 && (
                    <CommandGroup heading="Projects">
                        {projects.map((project) => (
                            <CommandItem
                                key={project.id}
                                value={`project-${project.title}-${project.id}`}
                                onSelect={() => runCommand(() => router.push(`/editor/${project.id}`))}
                            >
                                <Folder className="mr-2 h-4 w-4" />
                                <span>{project.title}</span>
                                {project.matchType === "content" && (
                                    <span className="ml-2 text-xs text-muted-foreground">(Content match)</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {pages.length > 0 && (
                    <CommandGroup heading="Pages">
                        {pages.map((page) => (
                            <CommandItem
                                key={page.id}
                                value={`page-${page.title}-${page.id}`}
                                onSelect={() => runCommand(() => router.push(`/editor/${page.id}`))}
                            >
                                {page.type === 'kanban' ? <FileText className="mr-2 h-4 w-4" /> : <File className="mr-2 h-4 w-4" />}
                                <span>{page.title}</span>
                                {page.matchType === "content" && (
                                    <span className="ml-2 text-xs text-muted-foreground">(Content match)</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Theme">
                    <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
