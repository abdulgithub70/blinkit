'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;

        // 1️⃣ Supabase Auth Login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        // 2️⃣ Check role (extra safety — the real enforcement is in RLS)
        const { data: profile, error: profileError } = await supabase
            .from("users_register")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (profileError || !profile) {
            alert("Profile not found");
            setLoading(false);
            return;
        }

        if (!["service_boy", "hostess", "admin"].includes(profile.role)) {
            alert("Access denied");
            await supabase.auth.signOut();
            setLoading(false);
            return;
        }

        setLoading(false);
        router.push(profile.role === "admin" ? "/adminzxz" : "/account");
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4">
            <Card className="w-full max-w-sm  ">
                <CardHeader>
                    <CardTitle className="text-center text-xl mt-4">Welcome Back</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">

                        <div className="space-y-1 ">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                className=""
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>

                        <Button className="w-full" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                        <p className="text-sm text-center text-gray-600 mb-5">
                            Not registered?{" "}
                            <span
                                onClick={() => router.push("/register")}
                                className="text-blue-600 cursor-pointer"
                            >
                                Register
                            </span>
                        </p>

                    </form>

                </CardContent>
            </Card>
        </div>
    );
}
