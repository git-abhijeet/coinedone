"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Chat() {
    const router = useRouter();
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! I’m your mortgage buddy. Tell me anything." },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false); const [typingMessageIndex, setTypingMessageIndex] = useState(null);
    const [displayedContent, setDisplayedContent] = useState({});
    const listEndRef = useRef(null);

    useEffect(() => {
        // Scroll to the latest message whenever messages change
        if (listEndRef.current) {
            listEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, displayedContent]);

    // Typing animation effect for assistant messages
    useEffect(() => {
        if (typingMessageIndex === null) return;

        const message = messages[typingMessageIndex];
        if (!message || message.role !== "assistant") {
            setTypingMessageIndex(null);
            return;
        }

        const fullContent = message.content;
        let currentIndex = 0;

        const typingInterval = setInterval(() => {
            if (currentIndex <= fullContent.length) {
                setDisplayedContent((prev) => ({
                    ...prev,
                    [typingMessageIndex]: fullContent.slice(0, currentIndex),
                }));
                currentIndex++;
            } else {
                clearInterval(typingInterval);
                setTypingMessageIndex(null);
            }
        }, 20); // 20ms per character for smooth typing

        return () => clearInterval(typingInterval);
    }, [typingMessageIndex, messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setInput("");
        setSending(true);

        // Add a temporary "thinking" message
        const thinkingIndex = messages.length + 1;
        setMessages((prev) => [...prev, { role: "assistant", content: "..." }]);

        // Call backend API
        fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [...messages, { role: "user", content: text }] }),
        })
            .then(async (res) => {
                const data = await res.json();
                const msg = data?.message || { role: "assistant", content: "(No response)" };

                // Replace the "thinking" message with the actual response
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = msg;
                    return updated;
                });

                // Trigger typing animation for the new message
                setTypingMessageIndex(thinkingIndex);
            })
            .catch(() => {
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: "Oops, something went wrong hitting the backend."
                    };
                    return updated;
                });
                setTypingMessageIndex(thinkingIndex);
            })
            .finally(() => setSending(false));
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear local data and redirect
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/login");
        }
    };

    return (
        <div className="flex w-full max-w-5xl flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <header className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Mortgage Assistant</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Buy vs Rent analysis powered by Gemini</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    aria-label="Logout"
                >
                    Logout
                </button>
            </header>

            <section className="h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <ul className="space-y-3" aria-live="polite" role="log" aria-label="Chat messages">
                    {messages.map((m, i) => {
                        const isTyping = typingMessageIndex === i;
                        const content = isTyping ? displayedContent[i] || "" : m.content;
                        const showCursor = isTyping && content.length < m.content.length;

                        return (
                            <li key={i}>
                                <div
                                    className={
                                        m.role === "user"
                                            ? "ml-auto max-w-[80%] rounded-2xl bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                            : "mr-auto max-w-[80%] rounded-2xl bg-blue-50 px-3 py-2 text-zinc-900 dark:bg-blue-900/30 dark:text-zinc-100"
                                    }
                                >
                                    <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                        {m.role === "user" ? "You" : "Assistant"}
                                    </span>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {content}
                                        {showCursor && (
                                            <span className="inline-block h-4 w-[2px] bg-zinc-900 dark:bg-zinc-100 animate-pulse ml-0.5" />
                                        )}
                                        {m.content === "..." && (
                                            <span className="inline-flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                    <li ref={listEndRef} />
                </ul>
            </section>

            <form onSubmit={sendMessage} className="mt-4 flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                        }
                    }}
                    placeholder="Type a message… (Shift+Enter for new line)"
                    aria-label="Chat message input"
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none"
                    rows={1}
                    style={{ minHeight: "2.5rem", maxHeight: "10rem" }}
                    onInput={(e) => {
                        e.target.style.height = "2.5rem";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                />
                <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    disabled={sending}
                    aria-busy={sending}
                >
                    {sending ? "Sending…" : "Send"}
                </button>
            </form>
        </div>
    );
}
