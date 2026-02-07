"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"email" | "otp">("email");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === "otp" && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setCanResend(false);
        setTimer(60);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            }
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Code sent to your email!");
            setStep("otp");
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "email",
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
        } else {
            toast.success("Successfully verified!");
            router.push("/onboarding");
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
                            {step === "email"
                                ? "Enter your email to get started."
                                : `Enter the code sent to ${email}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === "email" ? (
                            <form onSubmit={handleSendOtp} className="space-y-4">
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
                                    {loading ? "Sending Code..." : "Send Code"}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="otp">Confirmation Code</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Verifying..." : "Verify & Continue"}
                                </Button>

                                <div className="flex flex-col gap-2 mt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => handleSendOtp()}
                                        disabled={!canResend || loading}
                                    >
                                        {canResend ? "Resend Code" : `Resend Code in ${timer}s`}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => setStep("email")}
                                        disabled={loading}
                                    >
                                        Change Email
                                    </Button>
                                </div>
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
