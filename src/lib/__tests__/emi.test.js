import { describe, it, expect } from "vitest";
import { enforceLTV, calculateEMI, clampTenureYears, clampRateAnnual } from "../emi";

describe("EMI tools", () => {
    describe("enforceLTV", () => {
        it("should cap loan at 80% LTV", () => {
            const price = 2_000_000;
            const downPayment = 100_000; // 5%, below 20% minimum
            const { loanAmount, issues } = enforceLTV(price, downPayment);
            expect(loanAmount).toBeCloseTo(1_600_000, -2);
            expect(issues.length).toBeGreaterThan(0);
        });

        it("should compute upfront cost at ~7%", () => {
            const price = 2_000_000;
            const downPayment = 400_000; // 20%
            const { upfrontCostEstimate } = enforceLTV(price, downPayment);
            expect(upfrontCostEstimate).toBeCloseTo(140_000, -3);
        });

        it("should handle zero or invalid price", () => {
            const { loanAmount, issues } = enforceLTV(0, 100_000);
            expect(loanAmount).toBe(0);
            expect(issues).toContain("invalid_price");
        });
    });

    describe("calculateEMI", () => {
        it("should compute reasonable monthly EMI for 2M loan", () => {
            const { monthlyEmi, monthlyInterestPortion } = calculateEMI(1_600_000, 0.045, 25);
            // Rough EMI range for 1.6M at 4.5% for 25 years: ~8k-9k
            expect(monthlyEmi).toBeGreaterThan(8000);
            expect(monthlyEmi).toBeLessThan(9500);
            expect(monthlyInterestPortion).toBeGreaterThan(5000);
            expect(monthlyInterestPortion).toBeLessThan(6500);
        });

        it("should respect tenure ceiling at 25 years", () => {
            const tenure30 = calculateEMI(1_600_000, 0.045, 30);
            const tenure25 = calculateEMI(1_600_000, 0.045, 25);
            // Tenure should be clamped to 25, so both should be the same
            expect(tenure30.monthlyEmi).toBeCloseTo(tenure25.monthlyEmi, 2);
        });

        it("should return 0 for zero loan", () => {
            const { monthlyEmi, monthlyInterestPortion } = calculateEMI(0, 0.045, 25);
            expect(monthlyEmi).toBe(0);
            expect(monthlyInterestPortion).toBe(0);
        });
    });

    describe("clampTenureYears", () => {
        it("should clamp to max 25 years", () => {
            expect(clampTenureYears(30)).toBe(25);
            expect(clampTenureYears(25)).toBe(25);
        });

        it("should default to 25 if invalid", () => {
            expect(clampTenureYears(null)).toBe(25);
            expect(clampTenureYears(-5)).toBe(25);
        });
    });

    describe("clampRateAnnual", () => {
        it("should default to 4.5% if invalid", () => {
            expect(clampRateAnnual(null)).toBe(0.045);
            expect(clampRateAnnual(-0.01)).toBe(0.045);
        });

        it("should accept valid rates", () => {
            expect(clampRateAnnual(0.05)).toBe(0.05);
        });
    });
});
