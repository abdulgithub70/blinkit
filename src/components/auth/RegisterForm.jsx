'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        const form = e.target;

        const role = form.role.value;        // radio
        //const username = form.username.value;
        const email = form.email.value;
        //const mobile = form.mobile.value;
        const password = form.password.value;
        // 1️⃣ Supabase Auth Signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        // 2️⃣ Insert into profiles table
        const { error: profileError } = await supabase
            .from("users_register")
            .insert({
                id: data.user.id,
                role,       // service_boy | hostess
                //username,
                email,
                //mobile,
            });

        if (profileError) {
            alert(profileError.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        router.push("/account");
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4">
            <Card className="w-full max-w-sm ">
                <CardHeader>
                    <CardTitle className="text-center text-xl mt-4">Create Account</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">

                        <div className="space-y-2">
                            <Label>I am a</Label>

                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="service_boy"
                                        required
                                        className="accent-black"
                                    />
                                    <span>Service Boy</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="hostess"
                                        required
                                        className="accent-black"
                                    />
                                    <span>Hostess</span>
                                </label>
                            </div>
                        </div>


                        {/*<div className="space-y-1">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" placeholder="mr.abdul_7" required />
                        </div>
*/}
                        <div className="space-y-1">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                        </div>
{/*
                        <div className="space-y-1">
                            <Label htmlFor="mobile">Mobile Number</Label>
                            <Input id="mobile" name="mobile" type="number" placeholder="9876543210" required />
                        </div>
*/}
                        <div className="space-y-1">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>

                        <Button className="w-full" disabled={loading}>
                            {loading ? "Creating..." : "Register"}
                        </Button>

                        <p className="text-sm text-center text-gray-600 mb-5">
                            Already registered?{" "}
                            <span
                                onClick={() => router.push("/login")}
                                className="text-blue-600 cursor-pointer"
                            >
                                Login
                            </span>
                        </p>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
