import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";

export interface Collaborator {
    email: string;
    name?: string;
    avatarUrl?: string;
    color?: string;
}

export function useProjectCollaborators(projectId: string, currentUser?: User) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        const fetchCollaborators = async () => {
            try {
                // Fetch invited collaborators
                const { data: collabs, error } = await supabase
                    .from("document_collaborators")
                    .select("user_email")
                    .eq("document_id", projectId);

                if (error) {
                    console.error("Error fetching collaborators:", error);
                }

                const emails = collabs ? collabs.map(c => c.user_email) : [];

                // Add current user if not present (usually current user is owner or collaborator)
                if (currentUser?.email && !emails.includes(currentUser.email)) {
                    emails.push(currentUser.email);
                }

                // Deduplicate
                const uniqueEmails = Array.from(new Set(emails));

                // Map to Collaborator objects
                const collabObjects: Collaborator[] = uniqueEmails.map(email => ({
                    email,
                    name: email.split("@")[0], // Simple name derivation
                    color: "#" + Math.floor(Math.random() * 16777215).toString(16), // Random color for cursor/avatar
                }));

                setCollaborators(collabObjects);
            } catch (err) {
                console.error("Failed to fetch collaborators", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCollaborators();
    }, [projectId, currentUser]);

    return { collaborators, loading };
}
