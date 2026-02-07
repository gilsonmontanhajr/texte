import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export type ReportData = {
    blockId: string;
    question: string;
    type: "bar" | "list" | "pie";
    data: any[];
    totalResponses: number;
};

export function useFormReport(projectId: string, documentId?: string) {
    const supabase = createClient();
    const [forms, setForms] = useState<any[]>([]);
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalSubmissions: 0, lastSubmission: null as string | null });

    // 1. Fetch all documents that are "Forms" (contain formInput or questionary blocks)
    useEffect(() => {
        if (!projectId) return;

        const fetchForms = async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, content, updated_at')
                .eq('project_id', projectId);

            if (data) {
                // Filter client-side for form blocks
                const formDocs = data.filter((doc: any) => {
                    const content = Array.isArray(doc.content) ? doc.content : [];
                    return content.some((block: any) =>
                        block.type === 'formInput' || block.type === 'questionary'
                    );
                });
                setForms(formDocs);
            }
        };

        fetchForms();
    }, [projectId]);

    // 2. Fetch submissions when a document is selected
    useEffect(() => {
        if (!documentId) {
            setReportData([]);
            setStats({ totalSubmissions: 0, lastSubmission: null });
            return;
        }

        const fetchData = async () => {
            setLoading(true);

            // Get the document definition (for questions)
            const formDoc = forms.find(f => f.id === documentId);
            if (!formDoc) {
                setLoading(false);
                return;
            }

            // Get submissions
            const { data: submissions } = await supabase
                .from('form_submissions')
                .select('answers, created_at')
                .eq('document_id', documentId)
                .order('created_at', { ascending: false });

            if (!submissions) {
                setLoading(false);
                return;
            }

            setStats({
                totalSubmissions: submissions.length,
                lastSubmission: submissions[0]?.created_at || null
            });

            // Process Data
            const processed: ReportData[] = [];
            const content = Array.isArray(formDoc.content) ? formDoc.content : [];

            content.forEach((block: any) => {
                if (block.type === 'formInput') {
                    const label = block.props.label || "Untitled Question";
                    const isLong = block.props.inputType === 'long';
                    const answers = submissions.map(s => s.answers[block.id]).filter(a => a);

                    if (isLong) {
                        // List View
                        processed.push({
                            blockId: block.id,
                            question: label,
                            type: "list",
                            data: answers,
                            totalResponses: answers.length
                        });
                    } else {
                        // Bar Chart (Frequency)
                        const counts: Record<string, number> = {};
                        answers.forEach(a => {
                            counts[a] = (counts[a] || 0) + 1;
                        });
                        const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

                        processed.push({
                            blockId: block.id,
                            question: label,
                            type: "bar",
                            data: chartData,
                            totalResponses: answers.length
                        });
                    }
                } else if (block.type === 'questionary') {
                    const question = block.props.question || "Untitled Question";
                    const answers = submissions.map(s => s.answers[block.id]).filter(a => a);

                    const counts: Record<string, number> = {};
                    answers.forEach(a => {
                        counts[a] = (counts[a] || 0) + 1;
                    });
                    const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

                    processed.push({
                        blockId: block.id,
                        question: question,
                        type: "pie", // or bar
                        data: chartData,
                        totalResponses: answers.length
                    });
                }
            });

            setReportData(processed);
            setLoading(false);
        };

        fetchData();

    }, [documentId, forms]);

    return { forms, reportData, loading, stats };
}
