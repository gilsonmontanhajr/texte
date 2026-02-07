"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function PublicFormPage() {
    const params = useParams();
    const id = params?.id as string;
    const supabase = createClient();
    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchDoc = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching form:", error);
                setError("Form not found or incorrect permissions.");
            } else if (!data.is_public) {
                setError("This form is not currently accepting responses.");
            } else {
                setDocument(data);
            }
            setLoading(false);
        };
        fetchDoc();
    }, [id]);

    const handleInteract = (blockId: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [blockId]: value
        }));
        // Clear error if exists
        if (validationErrors[blockId]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[blockId];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!document?.content) return true;

        // Iterate blocks to check required fields
        const blocks = Array.isArray(document.content) ? document.content : [];

        blocks.forEach((block: any) => {
            if (block.type === 'formInput') {
                if (block.props.required === "true" && !answers[block.id]) {
                    errors[block.id] = "This field is required";
                }
            }
            // Add more validation if needed
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);

        try {
            const { error: submitError } = await supabase
                .from('form_submissions')
                .insert({
                    document_id: id,
                    answers: answers
                });

            if (submitError) throw submitError;
            setSubmitted(true);
        } catch (err: any) {
            console.error("Submission error:", err);
            alert("Failed to submit form: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h1 className="text-xl font-bold">Error</h1>
                <p className="text-muted-foreground">{error}</p>
                <Button asChild variant="outline"><Link href="/">Go Home</Link></Button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4 max-w-md mx-auto text-center p-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h1 className="text-2xl font-bold">Thank You!</h1>
                <p className="text-muted-foreground">Your response has been recorded successfully.</p>
                <Button asChild variant="outline" className="mt-4"><Link href={`/forms/${id}?new=true`} onClick={() => window.location.reload()}>Submit Another Response</Link></Button>
            </div>
        );
    }

    // Simple Block Renderer
    const renderBlock = (block: any) => {
        switch (block.type) {
            case "heading":
                const level = block.props.level || 1;
                // Cast to any to avoid JSX namespace issues in this environment
                const Tag = `h${level}` as any;
                // Basic text extraction
                const text = block.content?.map((c: any) => c.text).join("") || "";
                return <Tag key={block.id} className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-3xl mb-4 mt-6">{text}</Tag>;
            case "paragraph":
                const pText = block.content?.map((c: any) => c.type === 'link' ? c.content : c.text).join("") || "";
                // Render text formatting properly would need a full parsing.
                // For now, simple text.
                return <p key={block.id} className="leading-7 [&:not(:first-child)]:mt-6 text-foreground/80">{pText || <br />}</p>;

            case "formInput":
                return (
                    <div key={block.id} className="my-6 border p-6 rounded-lg bg-card shadow-sm">
                        <Label className="text-base font-medium mb-2 block">
                            {block.props.label}
                            {block.props.required === "true" && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {block.props.inputType === 'long' ? (
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={block.props.placeholder}
                                value={answers[block.id] || ""}
                                onChange={(e) => handleInteract(block.id, e.target.value)}
                            />
                        ) : (
                            <Input
                                placeholder={block.props.placeholder}
                                value={answers[block.id] || ""}
                                onChange={(e) => handleInteract(block.id, e.target.value)}
                            />
                        )}
                        {validationErrors[block.id] && <p className="text-xs text-destructive mt-1">{validationErrors[block.id]}</p>}
                    </div>
                );

            case "questionary":
                let options = [];
                try { options = JSON.parse(block.props.options); } catch (e) { options = []; }

                return (
                    <div key={block.id} className="my-6 border p-6 rounded-lg bg-card shadow-sm">
                        <Label className="text-base font-medium mb-4 block">{block.props.question}</Label>
                        <RadioGroup
                            value={answers[block.id] || ""}
                            onValueChange={(val: string) => handleInteract(block.id, val)}
                            className="gap-3"
                        >
                            {options.map((opt: string) => (
                                <div className="flex items-center space-x-2" key={opt}>
                                    <RadioGroupItem value={opt} id={`${block.id}-${opt}`} />
                                    <Label htmlFor={`${block.id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                );
            case "kanban":
                return null; // Don't render kanban in public form
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-muted/10 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-background rounded-xl border shadow p-8 md:p-12">
                {document?.content?.map((block: any) => renderBlock(block))}

                <div className="mt-8 pt-6 border-t flex justify-end">
                    <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                    </Button>
                </div>
            </div>
            <div className="text-center mt-8 text-sm text-muted-foreground">
                Powered by Texte
            </div>
        </div>
    );
}
