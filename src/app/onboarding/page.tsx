"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

export default function OnboardingPage() {
    const [user, setUser] = useState<User | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push("/login");
                return;
            }
            setUser(user);
            setFirstName(user.user_metadata?.first_name || "");
            setLastName(user.user_metadata?.last_name || "");
            setAvatarUrl(user.user_metadata?.avatar_url || "");
            setLoading(false);
        };
        getUser();
    }, [router, supabase]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}-${Date.now()}.${fileExt}`;

        // Optimistic preview could be nice, but let's stick to simple upload first
        setSaving(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                toast.error("Failed to upload avatar");
                console.error(uploadError);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            toast.success("Avatar uploaded");
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setSaving(true);

        const { error } = await supabase.auth.updateUser({
            password: password,
            data: {
                first_name: firstName,
                last_name: lastName,
                avatar_url: avatarUrl,
                onboarding_completed: true
            }
        });

        if (error) {
            toast.error("Failed to update profile");
        } else {
            toast.success("Welcome aboard!");
            router.push("/dashboard");
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Complete Your Profile</CardTitle>
                    <CardDescription>Tell us a bit about yourself.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCompleteProfile} className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24 border-2 border-muted">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback>
                                    <UserIcon className="h-12 w-12 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={saving}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Photo
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="********"
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="********"
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={saving}>
                            {saving ? "Setting up..." : "Finish & Go to Dashboard"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
