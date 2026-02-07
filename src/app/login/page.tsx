"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    const handleSignUp = () => {
        router.push("/register");
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/login-bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Overlay to ensure text readability if needed, though card is opaque */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
            </div>

            <div className="z-10 w-full max-w-md flex flex-col items-center gap-6 p-4">
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-2">
                    <img src="/logo.svg" alt="Texte Logo" className="w-16 h-auto rounded-lg shadow-lg" />
                </div>

                <Card className="w-full backdrop-blur-sm bg-background/95 shadow-xl border-muted/20">
                    <CardHeader>
                        <CardTitle className="text-center">Welcome Back</CardTitle>
                        <CardDescription className="text-center">Sign in to continue to your workspace.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <div className="flex flex-col gap-2 pt-2">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Loading..." : "Sign In"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="link" onClick={handleSignUp} disabled={loading} className="text-muted-foreground hover:text-primary">
                            Don't have an account? Sign Up
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
