export function clampTenureYears(tenureYears) {
    const t = Number(tenureYears || 25);
    if (Number.isNaN(t) || t <= 0) return 25;
    return Math.min(t, 25);
}

export function clampRateAnnual(rateAnnual) {
    const r = Number(rateAnnual || 0.045);
    if (Number.isNaN(r) || r <= 0) return 0.045;
    return r;
}

export function enforceLTV(price, downPayment) {
    const p = Number(price || 0);
    const d = Number(downPayment || 0);
    if (p <= 0) return { loanAmount: 0, issues: ["invalid_price"] };
    const maxLoan = p * 0.8; // 80% LTV
    const impliedDownPayment = p - maxLoan; // 20%
    const effectiveDown = Math.max(d, impliedDownPayment);
    const loanAmount = Math.max(0, p - effectiveDown);
    const issues = [];
    if (d < impliedDownPayment) issues.push("down_payment_adjusted_to_meet_ltv");
    return { loanAmount, issues, upfrontCostEstimate: p * 0.07 };
}

export function calculateEMI(loanAmount, annualRate, tenureYears) {
    const P = Number(loanAmount || 0);
    const rAnnual = clampRateAnnual(annualRate);
    const nYears = clampTenureYears(tenureYears);
    const r = rAnnual / 12; // monthly rate
    const n = nYears * 12; // months
    if (P <= 0 || r <= 0 || n <= 0) {
        return { monthlyEmi: 0, monthlyInterestPortion: 0, monthlyPrincipalPortion: 0 };
    }
    const pow = Math.pow(1 + r, n);
    const monthlyEmi = (P * r * pow) / (pow - 1);
    const monthlyInterestPortion = P * r; // first month interest
    const monthlyPrincipalPortion = monthlyEmi - monthlyInterestPortion;
    return { monthlyEmi, monthlyInterestPortion, monthlyPrincipalPortion };
}
