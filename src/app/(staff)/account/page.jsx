'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
//import { Input, Label, Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Plus, LogOut, Trash2, Loader2 } from "lucide-react";
import { Upload } from 'lucide-react';
import { useAuthGuard } from "@/lib/useAuthGuard";


export default function AccountPage() {
    const router = useRouter();
    const { loading: authLoading, authorized, user } = useAuthGuard(
        ["service_boy", "hostess"],
        "/login"
    );
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            if (profileData) setProfile(profileData);
        };

        fetchProfile();
    }, [user]);

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                <p className="text-sm text-gray-500">Checking access...</p>
            </div>
        );
    }

    if (!authorized) return null;

    // Updates a single profile column instead of re-sending the whole
    // (possibly stale) local `profile` object back to Supabase.
    const updateProfileField = async (field, value) => {
        const { error } = await supabase
            .from("profiles")
            .update({ [field]: value })
            .eq("id", user.id);
        if (error) {
            alert(error.message);
            return false;
        }
        setProfile((prev) => ({ ...prev, [field]: value }));
        return true;
    };

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        return data.secure_url;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const form = e.target;
        const full_name = form.full_name.value;
        const age = form.age.value;
        const bio = form.bio.value;
        const contact_no = form.contact_no.value;
        const price_per_day = form.price_per_day.value;
        const imagesFiles = [form.image1.files[0], form.image2.files[0], form.image3.files[0], form.image4.files[0], form.image5.files[0]];
        const video_file = form.video.files[0];

        // Upload images
        const imageUrls = await Promise.all(imagesFiles.map(f => f ? handleFileUpload(f) : null));
        const videoUrl = video_file ? await handleFileUpload(video_file) : null;

        const { error } = await supabase.from("profiles").insert({
            id: user.id,
            full_name, age, bio, contact_no, price_per_day,
            image1: imageUrls[0], image2: imageUrls[1], image3: imageUrls[2], image4: imageUrls[3], image5: imageUrls[4],
            video_url: videoUrl
        });
        console.log(error);
        if (error) alert(error.message);
        else {
            alert("Profile created!");
            router.push("/login");
            router.refresh();
        }

        setLoading(false);
    };

    return (
        <>
            <div className="max-w-3xl mt-8 mx-auto px-4 py-6 space-y-6">
                {user && (
                    <div className="space-y-4">

                        {/* User Info */}
                        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                                <User size={28} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">{user.user_metadata?.full_name || user.email}</h2>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                        </div>

                        {/* User Uploaded Images Gallery */}
                        {profile && (
                            <div className="bg-white rounded-xl shadow p-4">
                                <h3 className="font-semibold mb-2">Your Uploaded Images</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div key={i} className="relative w-full h-70  rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {profile[`image${i + 1}`] ? (
                                                <>
                                                    <img src={profile[`image${i + 1}`]} alt={`Uploaded ${i + 1}`} className="w-full h-full object-cover mt-2" />
                                                    {/* Delete Button */}
                                                    <button
                                                        className="absolute top-1 right-1 bg-gray-100/40 text-white rounded-full p-2"
                                                        onClick={() => updateProfileField(`image${i + 1}`, null)}
                                                    >
                                                      <Trash2 className="text-gray-800" />
                                                    </button>
                                                    {/* Replace Button */}
                                                    <label className="absolute bottom-1 right-1 bg-gray-100/40 text-white rounded-full p-1 cursor-pointer">
                                                       <Upload className="text-black" />
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append("file", file);
                                                                formData.append("upload_preset", UPLOAD_PRESET);
                                                                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
                                                                    method: "POST",
                                                                    body: formData,
                                                                });
                                                                const data = await res.json();
                                                                await updateProfileField(`image${i + 1}`, data.secure_url);
                                                            }}
                                                        />
                                                    </label>
                                                </>
                                            ) : (
                                                <label className="w-full h-full flex items-center justify-center border cursor-pointer">
                                                    <Plus size={16} />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            const formData = new FormData();
                                                            formData.append("file", file);
                                                            formData.append("upload_preset", UPLOAD_PRESET);
                                                            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
                                                                method: "POST",
                                                                body: formData,
                                                            });
                                                            const data = await res.json();
                                                            await updateProfileField(`image${i + 1}`, data.secure_url);
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}




                {/* Conditional Rendering */}
                {profile ? (
                    // Profile exists → show gallery/details
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Name:</strong> {profile.full_name}</p>
                            <p><strong>Age:</strong> {profile.age}</p>
                            <p><strong>Bio:</strong> {profile.bio}</p>
                            <p><strong>Contact:</strong> {profile.contact_no}</p>
                            <p><strong>Price/Day:</strong> ₹{profile.price_per_day}</p>
                            {/*<div className="grid grid-cols-3 gap-2 mt-2">
                                {[profile.image1, profile.image2, profile.image3, profile.image4, profile.image5].map((img, i) => img && <img key={i} src={img} className="w-full h-24 object-cover rounded" />)}
                            </div>*/}
                            {profile.video_url && (
                                <video className="w-full mt-2" controls>
                                    <source src={profile.video_url} type="video/mp4" />
                                </video>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    // No profile → show simple form
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Your Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleFormSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <Label>Full Name</Label>
                                    <Input name="full_name" required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Age</Label>
                                    <Input type="number" name="age" required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Bio</Label>
                                    <Input name="bio" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Contact Number</Label>
                                    <Input name="contact_no" type="number" required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Price per Day</Label>
                                    <Input type="number" name="price_per_day" required />
                                </div>
                                <div className="space-y-1">
                                    {/*<Label>Images (Max 5)</Label>*/}
                                    <div className="flex gap-2 flex-wrap hidden">
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <label key={i} className="w-20 h-20 border rounded flex items-center justify-center cursor-pointer bg-gray-100">
                                                <Plus size={16} />
                                                <Input type="file" name={`image${i + 1}`} className="hidden" />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1 hidden">
                                    {/*<Label>Video</Label>*/}
                                    <Input type="file" name="video" />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Saving..." : "Save Profile"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
            {/* Logout */}
            <div className="pl-8 pr-8">
                <Button className="w-full flex items-center justify-center gap-2 text-red-600 border rounded-full " onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>
                    <LogOut size={18} /> Logout
                </Button>
            </div>

        </>
    );
}
