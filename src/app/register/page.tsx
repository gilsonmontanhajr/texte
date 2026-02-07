"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const supabase = createClient();

    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
            }
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
        } else {
            toast.success("Magic link sent!");
            setSent(true);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/subscription-bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
            </div>

            <div className="z-10 w-full max-w-md flex flex-col items-center gap-6 p-4">
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-2">
                    <img src="/logo.svg" alt="Texte Logo" className="w-16 h-auto rounded-lg shadow-lg" />
                </div>

                <Card className="w-full backdrop-blur-sm bg-background/95 shadow-xl border-muted/20">
                    <CardHeader>
                        <CardTitle className="text-center">Create an Account</CardTitle>
                        <CardDescription className="text-center">
                            {sent
                                ? "Check your email for the magic link."
                                : "Enter your email to get started."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sent ? (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <div className="rounded-full bg-primary/10 p-3">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg">Check your inbox</h3>
                                    <p className="text-muted-foreground text-sm">
                                        We sent a login link to <span className="font-medium text-foreground">{email}</span>.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setSent(false)}
                                    className="mt-2 w-full"
                                >
                                    Use a different email
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMagicLink} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Sending..." : "Send Magic Link"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
