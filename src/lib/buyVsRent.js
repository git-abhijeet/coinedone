export function buyVsRentRecommendation({
    stayYears,
    monthlyRent,
    monthlyInterestPortion,
    maintenanceEstimate = 0,
}) {
    const stay = Number(stayYears || 0);
    if (stay < 3) {
        return { recommendation: "rent", rationale: "Short stay (<3y): transaction fees outweigh benefits." };
    }
    if (stay > 5) {
        return { recommendation: "buy", rationale: "Long stay (>5y): equity buildup likely beats rent." };
    }
    const rent = Number(monthlyRent || 0);
    const interest = Number(monthlyInterestPortion || 0);
    const maint = Number(maintenanceEstimate || 0);
    const buyMonthly = interest + maint;
    if (buyMonthly < rent) {
        return {
            recommendation: "buy",
            rationale: "Mid-term: mortgage interest + maintenance < rent. Buying may be better.",
        };
    }
    return {
        recommendation: "rent",
        rationale: "Mid-term: rent costs lower than monthly interest + maintenance. Renting may be better.",
    };
}
