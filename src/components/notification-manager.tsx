"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { toast } from "sonner";

interface NotificationManagerProps {
    user: User;
}

type Appointment = {
    id: string; // unique key (docId + time + text)
    time: string;
    text: string;
    notified: boolean;
};

export function NotificationManager({ user }: NotificationManagerProps) {
    const supabase = useMemo(() => createClient(), []);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const lastCheckMinute = useRef<string | null>(null);

    // Helper: Parse Content
    const parseAppointments = (docId: string, content: any[]): Appointment[] => {
        const apps: Appointment[] = [];

        const traverse = (blocks: any[]) => {
            if (!Array.isArray(blocks)) return;

            blocks.forEach((block) => {
                if (block.type === 'heading' && block.props?.level === 2) {
                    // Extract text
                    let text = "";
                    if (Array.isArray(block.content)) {
                        text = block.content.map((c: any) => c.text || "").join("");
                    } else if (typeof block.content === "string") {
                        text = block.content;
                    }

                    // Regex for time HH:MM
                    // Match: Start of string or space + time + space or end
                    const timeMatch = text.match(/(?:^|\s)([01]\d|2[0-3]):([0-5]\d)(?=\s|$)/);
                    // Or simply contain it? User said "point the reading2 style with the hour".
                    // Let's use the same regex as CalendarPage for consistency: /([01]\d|2[0-3]):([0-5]\d)/
                    const match = text.match(/([01]\d|2[0-3]):([0-5]\d)/);

                    if (match) {
                        const time = match[0];
                        // Clean text: remove time ? User might want full text.
                        // "notified with the text". simple: use full text.
                        apps.push({
                            id: `${docId}-${time}-${text.substring(0, 20)}`,
                            time,
                            text,
                            notified: false
                        });
                    }
                }

                // Nested content? BlockNote usually flat or children for lists.
                if (block.children) {
                    traverse(block.children);
                }
            });
        };

        traverse(content);
        return apps;
    };

    // Effect: Fetch & Subscribe
    useEffect(() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        // Title formats to look for
        const titles = [`Notes for ${todayStr}`, todayStr];

        const fetchAppointments = async () => {
            // We need to query documents matching today's title
            // We can't use 'in' for 'title' easily with OR logic with strict matching in Supabase JS basic filter
            // We'll just fetch based on exact title match "Notes for ..." as that's the new standard
            // Fallback: fetch both versions if possible, or just exact.
            // Given RLS, we only see ours or shared.

            // Let's try to be broad: Filter locally or use 'or'
            const { data } = await supabase
                .from("documents")
                .select("id, title, content")
                .or(`title.eq.Notes for ${todayStr},title.eq.${todayStr}`);

            if (data) {
                const allApps: Appointment[] = [];
                data.forEach(doc => {
                    if (doc.content && Array.isArray(doc.content)) {
                        allApps.push(...parseAppointments(doc.id, doc.content));
                    }
                });

                // Update state, preserving 'notified' status if existing
                setAppointments(prev => {
                    return allApps.map(newApp => {
                        const existing = prev.find(p => p.id === newApp.id);
                        return existing ? { ...newApp, notified: existing.notified } : newApp;
                    });
                });
            }
        };

        fetchAppointments();

        // Subscribe to changes on documents table (broad filter for simplicity, optimize if needed)
        // Or filter by user_id? We can't filter by user_id in 'postgres_changes' easily if RLS is complex.
        // Let's filter by current user's documents if possible or just global 'documents' and filter in callback?
        // Supabase channel filter strings are limited.
        // We'll just listen to ALL 'UPDATE' on documents and check if it affects us?
        // Too noisy.
        // We can listen to specific IDs if we found them.
        // But what if a NEW doc is created?
        // Let's just poll every minute? 
        // Or listen to `documents` generically.

        const channel = supabase.channel('notification-monitor')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload) => {
                // Check if the changed doc has a relevant title
                const newTitle = payload.new && (payload.new as any).title;
                if (newTitle && titles.includes(newTitle)) {
                    fetchAppointments();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, user]);

    // Effect: Check Time loop
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentHm = format(now, "HH:mm");

            // Avoid duplicate triggers in same minute
            if (currentHm === lastCheckMinute.current) return;
            lastCheckMinute.current = currentHm;

            setAppointments(currentApps => {
                const updates = currentApps.map(app => {
                    if (!app.notified && app.time === currentHm) {
                        // Trigger Notification
                        toast.info("Appointment Reminder", {
                            description: app.text,
                            duration: 10000, // 10s
                            action: {
                                label: "Dismiss",
                                onClick: () => console.log("Dismissed"),
                            },
                        });

                        // Browser Notification
                        if (Notification.permission === "granted") {
                            new Notification("Appointment Reminder", {
                                body: app.text,
                                icon: "/favicon.ico" // assume dynamic
                            });
                        } else if (Notification.permission !== "denied") {
                            Notification.requestPermission().then(permission => {
                                if (permission === "granted") {
                                    new Notification("Appointment Reminder", {
                                        body: app.text,
                                    });
                                }
                            });
                        }

                        return { ...app, notified: true };
                    }
                    return app;
                });

                // Only cause render if changed
                if (updates.some((u, i) => u.notified !== currentApps[i].notified)) {
                    return updates;
                }
                return currentApps;
            });

        }, 5000); // Check every 5s to hit the minute start reasonably fast

        // Request permission on mount
        if (typeof Notification !== 'undefined' && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, []);

    return null; // Invisible component
}
