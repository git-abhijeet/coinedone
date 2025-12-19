import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { runConversationTurn } from "@/lib/graph";
import {
    extractSalaryFromDocument,
    formatSalaryConfirmation
} from "@/lib/visionExtractor";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        console.log("\n==============================");
        console.log("[API] POST /api/chat");
        console.log("==============================");

        /* ---------------- AUTH ---------------- */
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            console.log("[AUTH] ❌ No token");
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
            console.log("[AUTH] ✅ Token verified");
        } catch {
            console.log("[AUTH] ❌ Invalid token");
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        /* ---------------- BODY ---------------- */
        const body = await req.json();
        const { messages, file } = body || {};

        console.log("[REQUEST] Messages count:", messages?.length);
        console.log("[REQUEST] File attached:", !!file);

        if (!Array.isArray(messages)) {
            console.log("[ERROR] Invalid messages payload");
            return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
        }

        /* ============================================================
           OBJECTIVE 2 — PRIVACY FIREWALL (FILE UPLOAD PATH)
           ============================================================ */
        if (file) {
            console.log("\n[UPLOAD] 📄 Salary slip received");
            console.log("[UPLOAD] MIME:", file.mimeType);

            const extractionResult = await extractSalaryFromDocument({
                arrayBuffer: async () => Buffer.from(file.data, "base64"),
                type: file.mimeType
            });

            if (!extractionResult.success) {
                console.log("[FIREWALL] ❌ Extraction failed:", extractionResult.error);
                return NextResponse.json({
                    message: {
                        role: "assistant",
                        content:
                            extractionResult.error ||
                            "I couldn’t safely extract salary data. Please try another document."
                    }
                });
            }

            console.log("[FIREWALL] ✅ Salary data extracted safely");
            console.log("[SAFE DATA]", extractionResult.data);

            const salaryData = extractionResult.data;

            const monthlyIncome =
                salaryData.netSalary ||
                salaryData.totalGrossSalary ||
                salaryData.basicSalary;

            console.log("[CONFIRMATION] Monthly income chosen:", monthlyIncome);

            const confirmationMessage = formatSalaryConfirmation(
                salaryData,
                monthlyIncome
            );

            return NextResponse.json({
                message: {
                    role: "assistant",
                    content: confirmationMessage,
                    _state: {
                        extractedData: {
                            income: monthlyIncome
                        }
                    }
                }
            });
        }

        /* ============================================================
           NORMAL CHAT / CONFIRMATION PATH
           ============================================================ */

        console.log("\n[CHAT] 🧠 Routing to reasoning LLM");
        const assistantMsg = await runConversationTurn({ messages });

        console.log("[CHAT] ✅ Assistant response generated");
        return NextResponse.json({ message: assistantMsg });

    } catch (err) {
        console.error("[SERVER ERROR]", err);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
}
