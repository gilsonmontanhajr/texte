"use client";

import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { File } from "lucide-react";

interface CalendarPageProps {
    docId: string;
    projectId?: string;
    user: User;
}

type DayDocument = {
    id: string;
    title: string;
    created_at: string;
    content: any; // JSONB
    hasEvents?: boolean; // If it has H2 with time
    events?: string[]; // times found
};

export default function CalendarPage({ docId, projectId, user }: CalendarPageProps) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const [month, setMonth] = useState<Date>(new Date());
    const [dayDocs, setDayDocs] = useState<DayDocument[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch children documents (days)
    useEffect(() => {
        const fetchDays = async () => {
            setLoading(true);
            const { data } = await supabase
                .from("documents")
                .select("id, title, created_at, content")
                .eq("parent_id", docId)
                .order("title");

            if (data) {
                // Parse events from content
                const parsedDocs = data.map((doc: any) => {
                    const events: string[] = [];
                    if (Array.isArray(doc.content)) {
                        doc.content.forEach((block: any) => {
                            if (block.type === 'heading' && block.props?.level === 2) {
                                // Extract text
                                let text = "";
                                if (Array.isArray(block.content)) {
                                    text = block.content.map((c: any) => c.text || "").join("");
                                } else if (typeof block.content === "string") {
                                    text = block.content;
                                }

                                // Regex for time HH:MM
                                const timeMatch = text.match(/([01]\d|2[0-3]):([0-5]\d)/);
                                if (timeMatch) {
                                    events.push(timeMatch[0]);
                                }
                            }
                        });
                    }
                    return { ...doc, hasEvents: events.length > 0, events };
                });
                setDayDocs(parsedDocs);
            }
            setLoading(false);
        };

        fetchDays();

        // Realtime Subscription
        const channel = supabase
            .channel(`calendar-${docId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `parent_id=eq.${docId}` }, () => {
                fetchDays();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [docId, supabase]);

    const handleDayClick = async (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        // Check for both legacy "YYYY-MM-DD" and new "Notes for YYYY-MM-DD"
        const existingDoc = dayDocs.find(d => d.title === dateStr || d.title === `Notes for ${dateStr}`);

        if (existingDoc) {
            router.push(`/editor/${existingDoc.id}`);
        } else {
            // Create new document
            const { data: newDoc } = await supabase.from("documents").insert({
                title: `Notes for ${dateStr}`,
                parent_id: docId,
                project_id: projectId || docId, // Use passed projectId, fallback to docId
                user_id: user.id,
                type: 'daily_note',
                icon: '🗓️'
            }).select().single();

            if (newDoc) {
                router.push(`/editor/${newDoc.id}`);
            }
        }
    };

    // Custom Render for Day Content
    const renderDay = (day: Date, modifiers: any = {}) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const doc = dayDocs.find(d => d.title === dateStr || d.title === `Notes for ${dateStr}`);

        return (
            <div className={`flex flex-col h-full w-full relative p-1 ${modifiers.today ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                <span className={`text-sm font-medium ml-1 ${modifiers.today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                </span>

                {doc && (
                    <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                        {doc.hasEvents && (
                            <div className="flex flex-col gap-0.5 w-full">
                                {doc.events?.map((e, i) => (
                                    <div key={i} className="text-[10px] bg-primary/10 text-primary px-1 rounded truncate w-full">
                                        {e}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!doc.hasEvents && (
                            <div className="flex justify-center mt-2 opacity-50">
                                <File className="h-3 w-3 text-blue-500" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 overflow-hidden">
            <div className="bg-card rounded-xl border shadow-sm flex-1 w-full overflow-hidden flex flex-col">
                <DayPicker
                    mode="single"
                    month={month}
                    onMonthChange={setMonth}
                    onDayClick={handleDayClick}
                    className="w-full h-full flex flex-col"
                    classNames={{
                        months: "flex flex-col w-full h-full",
                        month: "flex flex-col w-full h-full",
                        table: "flex flex-col w-full h-full border-collapse",
                        tbody: "flex-1 w-full flex flex-col",
                        head_row: "flex w-full border-b",
                        head_cell: "flex-1 py-4 text-muted-foreground font-medium text-sm text-center",
                        row: "flex w-full flex-1 border-b last:border-b-0",
                        cell: "flex-1 border-r last:border-r-0 relative p-0 focus-within:relative focus-within:z-20",
                        day: "w-full h-full p-0 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start hover:bg-muted/50 transition-colors cursor-pointer",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent/20",
                        day_outside: "text-muted-foreground opacity-30 bg-muted/10",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                        caption: "flex justify-between items-center p-4 border-b",
                        caption_label: "text-lg font-semibold",
                        nav: "flex items-center gap-1",
                        nav_button: "h-8 w-8 bg-transparent hover:bg-muted rounded-md flex items-center justify-center p-0 opacity-50 hover:opacity-100 transition-opacity",
                    }}
                    components={{
                        Day: (props: any) => {
                            const { date, modifiers, ...rest } = props;
                            return (
                                <div {...rest} onClick={() => date && handleDayClick(date)} className="h-full w-full cursor-pointer">
                                    {date && renderDay(date, modifiers || {})}
                                </div>
                            );
                        }
                    }}
                    showOutsideDays
                />
            </div>
        </div>
    );
}
