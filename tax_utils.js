/**
 * Tax Utility Functions
 * Centralized tax calculation logic to ensure consistency across the application
 */

/**
 * Calculate the tax rebate under Section 87A
 * Updated to apply to all income levels with max rebate of ₹60,000
 * 
 * @param {number} income - Taxable income
 * @param {number} tax - Calculated tax amount
 * @returns {number} - Rebate amount
 */
function calculateSection87ARebate(income, tax) {
    // Apply rebate only if income is up to ₹12,00,000
    if (income <= 1200000) {
        // Rebate is the entire tax amount, up to a maximum of ₹60,000
        return Math.min(tax, 60000);
    }
    return 0;
}

/**
 * Calculate marginal relief under Section 87A(b) for incomes just above ₹12,00,000
 * 
 * For taxpayers with income slightly above ₹12,00,000, marginal relief ensures
 * they don't pay more tax than the amount by which their income exceeds ₹12,00,000
 * 
 * Example:
 * If Income = ₹12,50,000
 * Tax before marginal relief = ₹67,500
 * Excess income over ₹12,00,000 = ₹50,000
 * Marginal relief = ₹67,500 - ₹50,000 = ₹17,500
 * Final tax payable after marginal relief = ₹50,000
 * 
 * @param {number} income - Taxable income
 * @param {number} tax - Calculated tax amount (after Section 87A rebate)
 * @returns {number} - Marginal relief amount
 */
function calculateMarginalRelief87AB(income, tax) {
    // Apply marginal relief only for incomes just above ₹12,00,000
    // Typically applies in the range of ₹12,00,001 to ₹13,50,000 (approx.)
    if (income > 1200000 && income <= 1350000) {
        // Calculate excess income over 12 lakh
        const excessIncome = income - 1200000;
        
        // Calculate the tax at 12 lakh (with rebate)
        const taxAt12Lakh = 0; // Would be 0 after Section 87A rebate
        
        // Calculate the additional tax due to excess income
        const additionalTax = tax - taxAt12Lakh;
        
        // If additional tax exceeds excess income, provide relief
        if (additionalTax > excessIncome) {
            return additionalTax - excessIncome;
        }
    }
    
    return 0;
}

/**
 * Calculate tax using the latest tax regime
 * 
 * @param {number} income - Taxable income amount
 * @returns {number} - Calculated tax amount
 */
function calculateTax(income) {
    if (income <= 0) return 0;
    
    // Income Tax Slabs
    let tax = 0;
    
    // 0-4 Lakh: 0%
    if (income > 400000) {
        // 4-8 Lakh: 5%
        tax += Math.min(income - 400000, 400000) * 0.05;
        
        if (income > 800000) {
            // 8-12 Lakh: 10%
            tax += Math.min(income - 800000, 400000) * 0.10;
            
            if (income > 1200000) {
                // 12-16 Lakh: 15%
                tax += Math.min(income - 1200000, 400000) * 0.15;
                
                if (income > 1600000) {
                    // 16-20 Lakh: 20%
                    tax += Math.min(income - 1600000, 400000) * 0.20;
                    
                    if (income > 2000000) {
                        // 20-24 Lakh: 25%
                        tax += Math.min(income - 2000000, 400000) * 0.25;
                        
                        if (income > 2400000) {
                            // Above 24 Lakh: 30%
                            tax += (income - 2400000) * 0.30;
                        }
                    }
                }
            }
        }
    }
    
    return Math.round(tax);
}