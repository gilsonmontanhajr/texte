"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

interface ProfileDialogProps {
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ user, open, onOpenChange }: ProfileDialogProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState(user.user_metadata?.first_name || "");
    const [lastName, setLastName] = useState(user.user_metadata?.last_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}-${Math.random()}.${fileExt}`;

        setLoading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading avatar:', uploadError);
                alert('Error uploading avatar. Make sure you ran the SQL to create the "avatars" bucket!');
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            data: {
                first_name: firstName,
                last_name: lastName,
                avatar_url: avatarUrl,
            },
        });

        if (error) {
            alert(error.message);
        } else {
            router.refresh();
            onOpenChange(false);
        }
        setLoading(false);
    };

    const performDeleteAccount = async () => {
        if (deleteConfirmationText !== 'DELETE') return;

        setLoading(true);
        try {
            // Call API route
            const res = await fetch('/api/auth/delete-account', {
                method: 'POST',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete account');
            }

            // Sign out client side just in case
            await supabase.auth.signOut();
            router.push("/login");
            // alert("Your account has been deleted."); // Optional, or let the router redirect handle it
        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
            setIsDeleteAlertOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit profile</DialogTitle>
                        <DialogDescription>
                            Make changes to your profile here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback>{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Avatar
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="firstName" className="text-right">
                                First Name
                            </Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lastName" className="text-right">
                                Last Name
                            </Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <Label className="text-red-600 font-bold mb-2 block">Danger Zone</Label>
                        <div className="flex items-center justify-between border border-red-200 bg-red-50 p-3 rounded-md">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-red-900">Delete Account</span>
                                <span className="text-xs text-red-700">Permanently remove your account and all data.</span>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setDeleteConfirmationText("");
                                    setIsDeleteAlertOpen(true);
                                }}
                                disabled={loading}
                            >
                                Delete Account
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                        <Button type="submit" onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                            <br /><br />
                            Please type <strong>DELETE</strong> to confirm.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            placeholder="Type DELETE"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmationText("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={performDeleteAccount}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteConfirmationText !== 'DELETE' || loading}
                        >
                            {loading ? "Deleting..." : "Delete Account"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
