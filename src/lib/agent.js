import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Minimal tool schemas using Zod for validation
const EmiInput = z.object({
    price: z.number().positive(),
    downPayment: z.number().min(0),
    annualRate: z.number().min(0).default(0.045),
    tenureYears: z.number().min(1).max(25).default(25),
});

const BuyVsRentInput = z.object({
    stayYears: z.number().min(0),
    monthlyRent: z.number().min(0),
    monthlyInterestPortion: z.number().min(0),
    maintenanceEstimate: z.number().min(0).default(0),
});

import { enforceLTV, calculateEMI } from "./emi";
import { buyVsRentRecommendation } from "./buyVsRent";

export function getGeminiClient() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY env");
    return new GoogleGenerativeAI(apiKey);
}

export function getLCGeminiModel() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY env");
    return new ChatGoogleGenerativeAI({
        apiKey,
        // Prefer a valid default if GEMINI_MODEL is unset or misconfigured
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        temperature: 0.2,
    });
}

export async function runEmiTool(input) {
    const parsed = EmiInput.safeParse(input);
    if (!parsed.success) return { error: "invalid_input", details: parsed.error.flatten() };
    const { price, downPayment, annualRate, tenureYears } = parsed.data;
    const { loanAmount, issues, upfrontCostEstimate } = enforceLTV(price, downPayment);
    const emi = calculateEMI(loanAmount, annualRate, tenureYears);
    return { loanAmount, upfrontCostEstimate, issues, ...emi };
}

export async function runBuyVsRentTool(input) {
    const parsed = BuyVsRentInput.safeParse(input);
    if (!parsed.success) return { error: "invalid_input", details: parsed.error.flatten() };
    return buyVsRentRecommendation(parsed.data);
}

// Orchestration note:
// We will plug these tools into a LangGraph graph where the LLM node handles intent/empathy
// and routes to tool nodes for deterministic math. This file provides the tool functions; the
// graph/wiring can live in src/lib/graph.js.
