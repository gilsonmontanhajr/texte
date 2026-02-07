"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LogOut, Settings, Search, PanelLeft,
    Download, Printer, FileText, Mail, FileJson, FileIcon
} from "lucide-react";
import { ProfileDialog } from "./profile-dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { saveAs } from "file-saver";
// @ts-ignore
import { asBlob } from "html-docx-js-typescript";
import { useEditorContext } from "@/components/editor/editor-context";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

interface NavbarProps {
    user: User | null;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

export function Navbar({ user, onToggleSidebar, isSidebarOpen }: NavbarProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    // Safely access editor context
    const context = useEditorContext();
    const editor = context?.editor;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    // Export Handlers
    const exportPDF = () => {
        window.print();
    };

    const exportMarkdown = async () => {
        if (!editor) return;
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        saveAs(blob, "document.md");
    };

    const exportHTML = async () => {
        if (!editor) return;
        const html = await editor.blocksToHTMLLossy(editor.document);
        // Copy to clipboard for Google Docs or download
        try {
            const blob = new Blob([html], { type: "text/html" });
            const data = [new ClipboardItem({ "text/html": blob })];
            await navigator.clipboard.write(data);
            alert("Copied HTML to clipboard! You can paste this into Google Docs.");
        } catch (e) {
            console.error(e);
            const blob = new Blob([html], { type: "text/html" });
            saveAs(blob, "document.html");
        }
    };

    const exportDOCx = async () => {
        if (!editor) return;
        const html = await editor.blocksToHTMLLossy(editor.document);
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;

        try {
            const buffer = await asBlob(fullHtml);
            saveAs(buffer as Blob, "document.docx");
        } catch (e) {
            console.error(e);
            alert("DOCx conversion failed.");
        }
    };

    const exportEmail = async () => {
        if (!editor) return;
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        const subject = "Document Export";
        // Limit body length broadly
        const body = encodeURIComponent(markdown.substring(0, 2000));
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const firstName = user?.user_metadata?.first_name;
    const lastName = user?.user_metadata?.last_name;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;

    const initials = user?.email
        ? user.email.substring(0, 2).toUpperCase()
        : "U";

    const displayInitials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
        : initials;

    return (
        <nav className="border-b bg-background sticky top-0 z-50 transition-all duration-300 no-print">
            <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-[200px]">
                    {/* Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleSidebar}
                        className="text-muted-foreground hover:text-foreground no-print"
                        title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                    >
                        <PanelLeft className="h-5 w-5" />
                    </Button>

                    {/* Branding - Only visible when Sidebar is closed */}
                    {(!isSidebarOpen) && (
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                            <span className="bg-primary text-primary-foreground p-1 rounded">Tx</span>
                            Texte
                        </Link>
                    )}
                </div>

                <div className="flex-1 flex justify-center max-w-xl">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="w-full pl-8 bg-muted/50 focus:bg-background transition-colors"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 min-w-[200px]">
                    {/* Theme Toggle */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground mr-1">
                                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                Light
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                Dark
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                                System
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {user && (
                        <>
                            <div className="text-sm text-muted-foreground hidden md:block ml-2">
                                {fullName || user.email}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                                            <AvatarFallback>{displayInitials}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{fullName || "Account"}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {editor && (
                                        <>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Export
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={exportPDF}>
                                                        <Printer className="mr-2 h-4 w-4" /> PDF (Print)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={exportDOCx}>
                                                        <FileIcon className="mr-2 h-4 w-4" /> DOCx / LibreOffice
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={exportHTML}>
                                                        <FileJson className="mr-2 h-4 w-4" /> Google Docs (Copy)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={exportMarkdown}>
                                                        <FileText className="mr-2 h-4 w-4" /> Markdown
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={exportEmail}>
                                                        <Mail className="mr-2 h-4 w-4" /> Email
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}


                                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Profile Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <ProfileDialog
                                user={user}
                                open={isProfileOpen}
                                onOpenChange={setIsProfileOpen}
                            />
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
