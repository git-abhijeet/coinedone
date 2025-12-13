# 🏠 Anti-Calculator: Buy vs Rent Mortgage Assistant (UAE)

An **AI-powered mortgage advisor** where the **LLM handles intent & conversation**, and **deterministic tools handle all math** (no LLM arithmetic).  
Built for the **CoinedOne Founder's Office AI Challenge**.

---

## What This Does

Helps UAE expats decide **Buy vs Rent** using natural language input.

The system:
- Understands free-form messages like  
  *“price 250k, down 10k, stay 4 years, rent 8k”*
- Enforces **UAE mortgage rules (80% LTV)**
- Calculates **EMI, interest, upfront costs**
- Returns a **clear recommendation with explanation**

---

## Core Design (Why This Works)

**LLM = Brain, Tools = Calculator**


User → LLM (intent & planning)
→ Deterministic Tools (EMI, LTV, Buy vs Rent)
→ LLM (natural language explanation)
→ User


### Key Principles
- ❌ No LLM math (zero hallucinated numbers)
- ✅ All calculations are pure JavaScript
- 🧠 LLM only decides *what to calculate* and *how to explain it*

---

## How It Works

1. Messages hit `POST /api/chat`
2. `graph.js` orchestrates the conversation
3. LLM decides whether to:
   - Ask for missing info
   - Call a calculation tool
4. Tools compute:
   - EMI & interest
   - LTV enforcement
   - Buy vs Rent recommendation
5. LLM formats results into a friendly explanation

---

## Files of Interest

- **Orchestration**: `src/lib/graph.js`
- **LLM setup**: `src/lib/agent.js` (Gemini via LangChain)
- **EMI & LTV math**: `src/lib/emi.js`
- **Buy vs Rent logic**: `src/lib/buyVsRent.js`
- **Chat UI**: `src/components/Chat.jsx`
- **API Route**: `src/app/api/chat/route.js`

---

## Financial Assumptions

- Currency: **AED**
- Max loan: **80% LTV** (20% minimum down payment)
- Default interest: **4.5%**
- Default tenure: **25 years**
- Upfront costs: **~7%** of property price

> ⚠️ Estimates only — actual bank quotes may vary.

---

## Buy vs Rent Logic

- **Stay < 3 years** → **RENT**
- **Stay > 5 years** → **BUY**
- **3–5 years** → Compare rent vs mortgage interest

---

## Example Input

Price 250000, down 12000, stay 4 years, rent 8000


**Output (summarized):**


Loan (80% LTV): AED 200,000
EMI: AED 1,112
Upfront cost: ~AED 17,500
Recommendation: BUY — Mid-term stay favors equity over rent




---

## Run Locally

### Requirements
- Node.js 18+
- Google AI Studio API key

```bash
npm install
cp .env.example .env.local
# set GOOGLE_API_KEY
npm run dev


Open: http://localhost:3000/chat