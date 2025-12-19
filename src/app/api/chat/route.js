import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { runConversationTurn } from "@/lib/graph";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // Gemini requires Node.js runtime, not Edge

export async function POST(req) {
    try {
        console.log(`[Chat] POST /api/chat - messages incoming`);
        // Verify JWT cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        try {
            jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        } catch (e) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
        }
        const body = await req.json();
        const { messages, file } = body || {};
        console.log("🚀 ~ POST ~ messages:", messages)
        console.log(`[Chat] Messages count: ${Array.isArray(messages) ? messages.length : 0}`);
        if (!Array.isArray(messages)) {
            return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
        }

        if (file) {
            console.log("[Chat] File uploaded, processing with Gemini Vision");
            // Process file with Gemini Vision
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            const model = genAI.getGenerativeModel({ model: process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash" });
            const imagePart = {
                inlineData: {
                    data: file.data,
                    mimeType: file.mimeType,
                },
            };
            const prompt = "Extract all visible text from this document.";
            const result = await model.generateContent([prompt, imagePart]);
            const extractedText = result.response.text();
            console.log("[Chat] Extracted text length:", extractedText.length);
            return NextResponse.json({ message: { role: "assistant", content: extractedText } });
        }

        // Timeout wrapper to prevent long-running requests
        const withTimeout = (promise, ms = 120000) =>
            Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), ms)
                ),
            ]);

        // const assistantMsg = await withTimeout(runConversationTurn({ messages }));
        const assistantMsg = await runConversationTurn({ messages });
        console.log(`[Chat] Response generated for ${messages.length} messages`);
        return NextResponse.json({ message: assistantMsg });
    } catch (err) {
        // Avoid leaking internal error details to clients
        console.error("[Chat] Error:", err);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
}