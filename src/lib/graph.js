// FILE: src/lib/graph.js

import { StateGraph } from "@langchain/langgraph";
import { getLCGeminiModel, runEmiTool } from "./agent";
import { buyVsRentRecommendation } from "./buyVsRent";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

/* ============================================================
   SYSTEM PROMPT - LLM AS BRAIN
   ============================================================ */

const SYSTEM_PROMPT = `You are a helpful mortgage assistant for UAE expats helping them decide between buying vs renting.

Your job:
1. Understand what the user is saying naturally (e.g., "8 years", "8", "around 8 yrs" all mean stay duration of 8 years)
2. Extract information from the conversation and track ANY changes:
   - Stay duration in UAE (years)
   - Property price (AED)
   - Down payment amount (AED or percentage like "20%")
   - Monthly rent (AED)
   - Loan tenure (default 25 years, but user may ask to change it to 15, 20, etc.)

3. When you have ALL required info (stay duration, price, down payment, rent), call the calculate_mortgage tool
4. If user asks to change ANY parameter (tenure, down payment, etc.), immediately recalculate by calling the tool again with updated values
5. If user asks "how did you calculate?", call the explain_calculation tool

Rules:
- Assume all money values are in AED unless stated otherwise
- Understand variations: "2000", "2k", "2000 AED", "around 2000" all mean 2000
- Understand percentages: "20%" or "20% of price" means 20% of property price as down payment
- When user asks "what if I change tenure to 20 years?" or "if I pay 20% down?", IMMEDIATELY call calculate_mortgage with the new values
- Be conversational and friendly
- Do NOT do any math yourself - always use the tools
- Ask for missing information naturally

Current conversation context will be provided in messages.`;

/* ============================================================
   STATE SCHEMA (Zod)
   ============================================================ */

const StateSchema = z.object({
    messages: z.array(z.any()).default([]),
    extractedData: z
        .object({
            stayYears: z.number().nullable().default(null),
            price: z.number().nullable().default(null),
            down: z.number().nullable().default(null),
            rent: z.number().nullable().default(null),
            tenureYears: z.number().default(25),
        })
        .default({
            stayYears: null,
            price: null,
            down: null,
            rent: null,
            tenureYears: 25,
        }),
    lastCalculation: z.string().nullable().default(null),
});

/* ============================================================
   TOOLS - LangChain Tool Format
   ============================================================ */

const calculateMortgageTool = tool(
    async ({ stayYears, price, downPayment, rent, tenureYears = 25 }) => {
        console.log("🟢 [TOOL CALL] calculate_mortgage - Starting calculation with params:", {
            stayYears,
            price,
            downPayment,
            rent,
            tenureYears
        });

        // Call EMI calculator
        console.log("  ↳ [EMI TOOL] Calling EMI calculator...");
        const emiResult = await runEmiTool({
            price,
            downPayment,
            annualRate: 0.045,
            tenureYears,
        });
        console.log("  ↳ [EMI TOOL] Result:", {
            loanAmount: emiResult.loanAmount,
            monthlyEmi: emiResult.monthlyEmi,
            monthlyInterest: emiResult.monthlyInterestPortion
        });

        // Call buy vs rent recommendation
        console.log("  ↳ [BUY_VS_RENT TOOL] Calling recommendation engine...");
        const recommendation = buyVsRentRecommendation({
            stayYears,
            monthlyRent: rent,
            monthlyInterestPortion: emiResult.monthlyInterestPortion,
        });
        console.log("  ↳ [BUY_VS_RENT TOOL] Recommendation:", recommendation.recommendation.toUpperCase());
        console.log("🟢 [TOOL CALL] calculate_mortgage - Complete");

        return JSON.stringify({
            emi: emiResult,
            recommendation,
            inputs: { stayYears, price, downPayment, rent, tenureYears },
        });
    },
    {
        name: "calculate_mortgage",
        description: "Calculate EMI and buy vs rent recommendation. Call this when you have: stay duration, property price, down payment, and monthly rent. Returns EMI details and recommendation.",
        schema: z.object({
            stayYears: z.number().describe("Number of years user plans to stay in UAE"),
            price: z.number().describe("Property price in AED"),
            downPayment: z.number().describe("Down payment amount in AED"),
            rent: z.number().describe("Monthly rent in AED"),
            tenureYears: z.number().default(25).describe("Loan tenure in years (default 25)"),
        }),
    }
);

const explainCalculationTool = tool(
    async ({ calculationData }) => {
        console.log("🟢 [TOOL CALL] explain_calculation - Explaining previous calculation");

        if (!calculationData) {
            console.log("  ↳ [EXPLAIN] No calculation data available");
            return "No calculation has been performed yet. Please provide your details first.";
        }

        const data = JSON.parse(calculationData);
        const { emi, recommendation, inputs } = data;
        console.log("  ↳ [EXPLAIN] Formatting detailed explanation for user");

        return `Here's how I calculated it:

**Loan Details:**
• Property price: AED ${inputs.price.toLocaleString()}
• Down payment: AED ${inputs.downPayment.toLocaleString()}
• Loan amount (80% LTV): AED ${emi.loanAmount.toLocaleString()}
• Upfront costs (≈7%): AED ${emi.upfrontCostEstimate.toLocaleString()}

**EMI Calculation:**
• Interest rate: 4.5% per year
• Loan tenure: ${inputs.tenureYears} years
• Monthly EMI: AED ${emi.monthlyEmi.toLocaleString()}
• First month interest portion: AED ${emi.monthlyInterestPortion.toLocaleString()}

**Recommendation Logic:**
${recommendation.rationale}

• Stay duration: ${inputs.stayYears} years
• Monthly rent: AED ${inputs.rent.toLocaleString()}
• Recommendation: **${recommendation.recommendation.toUpperCase()}**`;
    },
    {
        name: "explain_calculation",
        description: "Explain how the EMI and recommendation were calculated. Call this when user asks 'how did you calculate?' or wants details.",
        schema: z.object({
            calculationData: z.string().nullable().describe("JSON string of the last calculation result"),
        }),
    }
);

/* ============================================================
   AGENT NODE - LLM WITH TOOL BINDING
   ============================================================ */

async function agentNode(state) {
    console.log("🔵 [AGENT NODE] Processing messages:", state.messages.length);

    const llm = getLCGeminiModel();

    // WRONG: llm.bind({ tools: [...] })
    // const llmWithTools = llm.bind({ tools: [ { functionDeclarations: [...] } ] });

    // RIGHT: use bindTools to attach functionDeclarations
    const llmWithTools = llm.bindTools([
        {
            functionDeclarations: [
                {
                    name: "calculate_mortgage",
                    description: "Calculate EMI and buy vs rent recommendation when you have all required info: stay duration, property price, down payment, and monthly rent.",
                    parameters: {
                        type: "object",
                        properties: {
                            stayYears: { type: "number", description: "Years user plans to stay in UAE" },
                            price: { type: "number", description: "Property price in AED" },
                            downPayment: { type: "number", description: "Down payment in AED" },
                            rent: { type: "number", description: "Monthly rent in AED" },
                            tenureYears: { type: "number", description: "Loan tenure (default 25)" },
                        },
                        required: ["stayYears", "price", "downPayment", "rent"],
                    },
                },
                {
                    name: "explain_calculation",
                    description: "Explain calculation details when user asks how you calculated",
                    parameters: {
                        type: "object",
                        properties: {
                            calculationData: { type: "string", description: "Last calculation JSON" },
                        },
                    },
                },
            ],
        },
    ]);

    // Prepare messages with correct roles for LangChain coercion
    const messagesToSend = [
        { role: "system", content: SYSTEM_PROMPT },
        ...state.messages.map(m => ({
            role: m.role === "assistant" ? "ai" : "human",
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
    ];

    console.log("🟡 [LLM CALL] Invoking LLM with tools...");
    const response = await llmWithTools.invoke(messagesToSend);

    console.log("🟡 [LLM RESPONSE]", JSON.stringify(response, null, 2).substring(0, 500));

    // Check if LLM wants to call a tool
    const functionCall = response.content?.[0]?.functionCall || response.functionCall;

    if (functionCall) {
        console.log("🟢 [TOOL INVOCATION] LLM wants to call:", functionCall.name);

        let toolResult;
        if (functionCall.name === "calculate_mortgage") {
            const args = functionCall.args;
            toolResult = await calculateMortgageTool.invoke(args);

            // Store calculation in state
            state.lastCalculation = toolResult;

            // Update extracted data
            state.extractedData = {
                stayYears: args.stayYears,
                price: args.price,
                down: args.downPayment,
                rent: args.rent,
                tenureYears: args.tenureYears || 25,
            };
        } else if (functionCall.name === "explain_calculation") {
            toolResult = await explainCalculationTool.invoke({
                calculationData: state.lastCalculation,
            });
        }

        // Let LLM format the response naturally based on conversation context
        let finalContent;
        try {
            const resultData = JSON.parse(toolResult);
            const { emi, recommendation, inputs } = resultData;

            // Calculate total interest and total amount paid
            const totalMonths = inputs.tenureYears * 12;
            const totalAmountPaid = emi.monthlyEmi * totalMonths;
            const totalInterest = totalAmountPaid - emi.loanAmount;
            const totalCost = inputs.downPayment + emi.upfrontCostEstimate + totalAmountPaid;

            // Calculate actual down payment (may be adjusted for LTV)
            const minDownPayment = inputs.price * 0.2; // 20% for 80% LTV
            const actualDownPayment = Math.max(inputs.downPayment, minDownPayment);
            const wasAdjusted = emi.issues && emi.issues.includes('down_payment_adjusted_to_meet_ltv');

            // Create a data summary for the LLM to format naturally
            const dataSummary = `
Tool Result Data:
- Recommendation: ${recommendation.recommendation.toUpperCase()}
- Rationale: ${recommendation.rationale}

IMPORTANT ASSUMPTIONS (state these clearly in your response):
- Interest Rate: 4.5% per year (typical UAE mortgage rate)
- Maximum LTV (Loan-to-Value): 80% (UAE regulatory requirement)
- Minimum Down Payment: 20% of property price = AED ${minDownPayment.toLocaleString()}
- Upfront Costs: ~7% of property price (registration, fees, etc.)

PROPERTY & LOAN DETAILS:
- Property Price: AED ${inputs.price.toLocaleString()}
- User's Down Payment Input: AED ${inputs.downPayment.toLocaleString()} (${((inputs.downPayment / inputs.price) * 100).toFixed(1)}%)
${wasAdjusted ? `- ADJUSTED Down Payment (to meet 20% minimum): AED ${actualDownPayment.toLocaleString()} (${((actualDownPayment / inputs.price) * 100).toFixed(1)}%)` : ''}
- Actual Down Payment Used: AED ${actualDownPayment.toLocaleString()} (${((actualDownPayment / inputs.price) * 100).toFixed(1)}%)
- Loan Amount: AED ${emi.loanAmount.toLocaleString()} (Calculation: ${inputs.price.toLocaleString()} - ${actualDownPayment.toLocaleString()})
- Upfront Costs: AED ${emi.upfrontCostEstimate.toLocaleString()}

MONTHLY PAYMENT (${inputs.tenureYears} years tenure):
- Monthly EMI: AED ${emi.monthlyEmi.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  - Principal portion: AED ${emi.monthlyPrincipalPortion.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  - Interest portion: AED ${emi.monthlyInterestPortion.toLocaleString(undefined, { maximumFractionDigits: 0 })}
- Current Monthly Rent: AED ${inputs.rent.toLocaleString()}

LONG-TERM ANALYSIS:
- Stay Duration: ${inputs.stayYears} years
- Total EMI Payments (${totalMonths} months): AED ${totalAmountPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
- Total Interest Paid: AED ${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
- Total Cost (down + upfront + EMIs): AED ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}

DISCLAIMER: Add at the end - "⚠️ This is an estimate based on standard assumptions. Actual mortgage terms may vary by bank. Please consult with UAE banks for precise quotes."

FORMATTING INSTRUCTIONS:
1. If this is the FIRST calculation, clearly state all assumptions upfront
2. If down payment was adjusted for LTV, explain this clearly (e.g., "Since UAE requires minimum 20% down, I've adjusted your down payment from X to Y")
3. Show the loan amount calculation explicitly: Property Price - Down Payment = Loan Amount
4. If user just changed one parameter (tenure, down payment), focus on that change
5. Be conversational and natural - explain the numbers like a helpful advisor
6. Always include the disclaimer at the end`;

            console.log("🟡 [LLM CALL] Asking LLM to format response naturally based on context...");
            const formattingMessages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...messagesToSend.slice(1), // Skip original system prompt
                { role: "human", content: dataSummary }
            ];

            const formattedResponse = await llm.invoke(formattingMessages);
            finalContent = typeof formattedResponse.content === "string"
                ? formattedResponse.content
                : formattedResponse.content?.[0]?.text || JSON.stringify(formattedResponse.content);

            console.log("🟡 [LLM FORMATTED] Response formatted naturally");
        } catch (e) {
            console.error("Error formatting response:", e);
            finalContent = `I've calculated your mortgage details. Here's the result:\n\n${toolResult}`;
        }

        return {
            messages: [{ role: "assistant", content: finalContent }],
            extractedData: state.extractedData,
            lastCalculation: state.lastCalculation,
        };
    }

    // No tool call - direct response
    const content = typeof response.content === "string"
        ? response.content
        : response.content?.[0]?.text || JSON.stringify(response.content);

    return {
        messages: [{ role: "assistant", content }],
        extractedData: state.extractedData,
        lastCalculation: state.lastCalculation,
    };
}

/* ============================================================
   BUILD LANGGRAPH STATE MACHINE
   ============================================================ */

const workflow = new StateGraph(StateSchema)
    .addNode("agent", agentNode)
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

const graph = workflow.compile();

/* ============================================================
   MAIN ORCHESTRATOR - EXPORTED FOR CHAT API
   ============================================================ */

export async function runConversationTurn({ messages }) {
    console.log("🔵 [CONVERSATION START] Messages count:", messages.length);

    // Initialize state from messages (restore from previous turns)
    const initialState = {
        messages,
        extractedData: {
            stayYears: null,
            price: null,
            down: null,
            rent: null,
            tenureYears: 25,
        },
        lastCalculation: null,
    };

    // Restore state from message metadata if available
    for (const msg of messages) {
        if (msg._state) {
            initialState.extractedData = msg._state.extractedData || initialState.extractedData;
            initialState.lastCalculation = msg._state.lastCalculation || initialState.lastCalculation;
        }
    }

    // Run the graph
    const result = await graph.invoke(initialState);

    console.log("🔵 [CONVERSATION END] Result:", result.messages[result.messages.length - 1]?.content?.substring(0, 100));

    // Return the assistant's response with state attached
    const assistantMessage = result.messages[result.messages.length - 1];
    return {
        ...assistantMessage,
        _state: {
            extractedData: result.extractedData,
            lastCalculation: result.lastCalculation,
        },
    };
}
