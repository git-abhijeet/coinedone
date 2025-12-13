"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LogIn() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
        if (token) {
            router.replace("/chat");
        }
    }, [router]);
    const [errors, setErrors] = useState({});
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (generalError) setGeneralError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!formData.email.trim()) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            newErrors.email = "Invalid email format";
        if (!formData.password) newErrors.password = "Password is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setGeneralError(data.error || "Login failed");
                return;
            }

            // Store token and redirect to chat
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            if (rememberMe) {
                localStorage.setItem("rememberMe", "true");
            }
            router.push("/chat");
        } catch (error) {
            setGeneralError("An error occurred. Please try again.");
            console.error("Login error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-black px-4">
            <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900/80 p-8 backdrop-blur">
                <h2 className="mb-2 text-center text-3xl font-bold text-white">Welcome Back</h2>
                <p className="mb-6 text-center text-sm text-zinc-400">
                    Sign in to your account to continue
                </p>

                {generalError && (
                    <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 p-3">
                        <p className="text-sm text-red-300">{generalError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            disabled={loading}
                            className={`w-full rounded-lg border ${errors.email ? "border-red-500" : "border-zinc-600"
                                } bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 disabled:opacity-50`}
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            disabled={loading}
                            className={`w-full rounded-lg border ${errors.password ? "border-red-500" : "border-zinc-600"
                                } bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 disabled:opacity-50`}
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-zinc-400">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={loading}
                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 disabled:opacity-50"
                            />
                            Remember me
                        </label>
                        <Link href="#" className="text-sm text-blue-400 hover:text-blue-300">
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-zinc-400">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}
