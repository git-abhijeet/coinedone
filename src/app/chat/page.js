"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Chat from "@/components/Chat";

export default function ChatPage() {
    const router = useRouter();
    useEffect(() => {
        const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
        if (!token) {
            router.replace("/login");
        }
    }, [router]);
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
            <main className="w-full max-w-5xl">
                <Chat />
            </main>
        </div>
    );
}
