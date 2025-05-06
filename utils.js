/**
 * Utility functions for the tax calculator application
 */

/**
 * Format currency in Indian Rupee format
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Safe parsing of a number from various formats
 * @param {any} value - The value to parse
 * @returns {number} - The parsed number or 0 if invalid
 */
function safeParseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value && value !== 0) return 0;
    
    const cleaned = String(value).replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate tax based on the income using the new tax regime
 * @param {number} income - The taxable income
 * @returns {number} - Calculated tax amount
 */
function calculateTax(income) {
    if (income <= 0) return 0;
    
    // Get tax parameters from DataManager if available, or use defaults
    let slabs, taxRebateLimit, maxRebateAmount;
    
    if (typeof DataManager !== 'undefined') {
        const taxParams = DataManager.getTaxParameters();
        
        // Always use taxSlabs from taxParams
        if (taxParams) {
            // Ensure taxSlabs exists and is valid
            if (!taxParams.taxSlabs || !Array.isArray(taxParams.taxSlabs) || taxParams.taxSlabs.length === 0) {
                // Create default tax slabs if missing
                taxParams.taxSlabs = [
                    { min: 0, max: 400000, rate: 0 },
                    { min: 400000, max: 800000, rate: 5 },
                    { min: 800000, max: 1200000, rate: 10 },
                    { min: 1200000, max: 1600000, rate: 15 },
                    { min: 1600000, max: 2000000, rate: 20 },
                    { min: 2000000, max: 2400000, rate: 25 },
                    { min: 2400000, max: null, rate: 30 }
                ];
                // Save the default tax slabs for future use
                DataManager.saveTaxParameters(taxParams);
            }
            
            // Convert percentage rates to decimal
            slabs = taxParams.taxSlabs.map(slab => ({
                min: slab.min,
                max: slab.max,
                rate: slab.rate / 100 // Convert percentage to decimal
            }));
        } else {
            // Default values if taxParams is not available at all
            console.warn("Tax parameters not found, using defaults");
            slabs = [
                { min: 0, max: 400000, rate: 0 },
                { min: 400000, max: 800000, rate: 0.05 },
                { min: 800000, max: 1200000, rate: 0.10 },
                { min: 1200000, max: 1600000, rate: 0.15 },
                { min: 1600000, max: 2000000, rate: 0.20 },
                { min: 2000000, max: 2400000, rate: 0.25 },
                { min: 2400000, max: null, rate: 0.30 }
            ];
        }
        
        taxRebateLimit = taxParams ? (taxParams.taxRebateLimit || 1200000) : 1200000;
        maxRebateAmount = taxParams ? (taxParams.maxRebateAmount || 60000) : 60000;
    } else {
        // Default values if DataManager is not available
        slabs = [
            { min: 0, max: 400000, rate: 0 },
            { min: 400000, max: 800000, rate: 0.05 },
            { min: 800000, max: 1200000, rate: 0.10 },
            { min: 1200000, max: 1600000, rate: 0.15 },
            { min: 1600000, max: 2000000, rate: 0.20 },
            { min: 2000000, max: 2400000, rate: 0.25 },
            { min: 2400000, max: null, rate: 0.30 }
        ];
        taxRebateLimit = 1200000;
        maxRebateAmount = 60000;
    }
    
    let tax = 0;
    for (const slab of slabs) {
        if (income > slab.min) {
            const upper = slab.max || Infinity;
            const taxableInSlab = Math.min(income, upper) - slab.min;
            tax += taxableInSlab * slab.rate;
        }
    }
    
    // Apply 87A rebate (configurable)
    const taxCredit = income <= taxRebateLimit ? Math.min(tax, maxRebateAmount) : 0;
    tax = Math.max(tax - taxCredit, 0);
    
    // Find the threshold for marginal relief
    // It's the first slab with a non-zero rate
    const firstTaxableSlab = slabs.find(slab => slab.rate > 0);
    const marginalReliefThreshold = firstTaxableSlab ? firstTaxableSlab.min : 0;
    
    // Calculate upper bound for marginal relief (threshold + 50000)
    const marginalReliefUpperBound = marginalReliefThreshold + 50000;
    
    // Apply marginal relief for incomes just above the threshold
    if (income > marginalReliefThreshold && income <= marginalReliefUpperBound) {
        // Calculate tax at threshold
        const taxAtThreshold = calculateTaxHelper(marginalReliefThreshold, slabs);
        
        // Additional income above threshold
        const additionalIncome = income - marginalReliefThreshold;
        
        // Additional tax above threshold
        const additionalTax = tax - taxAtThreshold;
        
        // If additional tax is more than additional income, provide relief
        if (additionalTax > additionalIncome) {
            tax = taxAtThreshold + additionalIncome;
        }
    }
    
    return Math.round(tax);
}

/**
 * Helper function to calculate tax without recursion 
 * to avoid infinite loops in marginal relief calculation
 * @param {number} income - The taxable income
 * @param {Array} slabs - Tax slabs to use for calculation
 * @returns {number} - Calculated tax amount
 */
function calculateTaxHelper(income, slabs) {
    if (income <= 0) return 0;
    
    let tax = 0;
    for (const slab of slabs) {
        if (income > slab.min) {
            const upper = slab.max || Infinity;
            const taxableInSlab = Math.min(income, upper) - slab.min;
            tax += taxableInSlab * slab.rate;
        }
    }
    
    return tax;
}

/**
 * Calculate marginal relief for income just above tax exemption limit
 * @param {number} income - Taxable income
 * @param {number} tax - Calculated tax
 * @returns {number} - Marginal relief amount
 */
/**
 * Calculate rebate under Section 87A for incomes where tax doesn't exceed 60,000
 * @param {number} income - Taxable income
 * @param {number} tax - Calculated tax
 * @returns {number} - Section 87A rebate amount
 */
function calculateSection87ARebate(income, tax) {
    // Maximum rebate under Section 87A is the actual tax or 60,000, whichever is less
    const MAX_REBATE = 60000;
    
    // Check if tax is less than or equal to 60,000 (limit for Section 87A rebate)
    if (tax <= 60000) {
        return Math.min(tax, MAX_REBATE);
    }
    
    return 0;
}

/**
 * Calculate marginal relief (now implements Section 87A rebate)
 * Kept for backward compatibility but renamed in UI to Section 87A rebate
 * @param {number} income - Taxable income
 * @param {number} tax - Calculated tax
 * @returns {number} - Section 87A rebate amount
 */
function calculateMarginalRelief(income, tax) {
    return calculateSection87ARebate(income, tax);
}

/**
 * Parse date string into a proper Date object
 * @param {string} dateStr - Date string in various formats
 * @returns {Date|null} - Date object or null if invalid
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try different date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[/.-]/);
    if (parts.length === 3) {
        // Check if first part is likely a day (1-31)
        if (parseInt(parts[0]) <= 31) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        // Check if first part is likely a year (>31)
        if (parseInt(parts[0]) > 31) {
            return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        }
    }
    
    return null;
}

/**
 * Extend employee data to cover 12 months or until retirement date
 * @param {Array} employee - The employee data array
 * @param {string|Date} retirementDate - Optional retirement date
 * @returns {Array} - Extended employee data
 */
function extendTo12Months(employee, retirementDate = null) {
    if (!employee || employee.length === 0) return [];
    
    // Clone the employee data to avoid modifying the original
    const result = JSON.parse(JSON.stringify(employee));
    
    // Get the fiscal year dates
    const today = new Date();
    const fiscalYearStart = new Date(today.getFullYear(), 3, 1); // April 1st of current year
    if (today < fiscalYearStart) {
        fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1); // Previous year's April
    }
    const fiscalYearEnd = new Date(fiscalYearStart);
    fiscalYearEnd.setFullYear(fiscalYearStart.getFullYear() + 1);
    fiscalYearEnd.setDate(0); // Last day of March next year
    
    // Month name arrays (short and long forms)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Find the latest month from employee data
    const lastEntry = result[result.length - 1];
    let lastMonthStr = lastEntry.month;
    let lastMonth, lastYear;
    
    // Parse the month and year from the last entry
    // Try different formats - "MMM YYYY", "MMMM YYYY", "MM-YYYY"
    let monthMatch = lastMonthStr.match(/([a-zA-Z]{3,})[\s-](\d{4})/i);
    if (monthMatch) {
        // Format like "Jan 2025" or "January 2025"
        const monthStr = monthMatch[1];
        lastYear = parseInt(monthMatch[2]);
        
        // Find month index
        lastMonth = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
        if (lastMonth === -1) {
            lastMonth = monthNamesLong.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
        }
    } else {
        // Try numeric format (MM-YYYY)
        monthMatch = lastMonthStr.match(/(\d{1,2})[\s-/](\d{4})/);
        if (monthMatch) {
            lastMonth = parseInt(monthMatch[1]) - 1; // 0-based index
            lastYear = parseInt(monthMatch[2]);
        } else {
            // Default to current month if parsing fails
            console.warn("Could not parse month format:", lastMonthStr);
            lastMonth = today.getMonth();
            lastYear = today.getFullYear();
        }
    }
    
    // Check if retirement date is valid
    let retireDate = null;
    
    if (retirementDate) {
        retireDate = typeof retirementDate === 'string' 
            ? parseDate(retirementDate) 
            : retirementDate;
    }
    
    // Calculate max months based on retirement date
    let maxMonths = 12; // Default to 12 months (full fiscal year)
    
    // If retirement date is valid
    if (retireDate && !isNaN(retireDate.getTime())) {
        // If retirement date is before fiscal year start, they're already retired
        if (retireDate < fiscalYearStart) {
            return [];
        }
        
        // If retirement date is within the fiscal year, calculate months until retirement
        if (retireDate <= fiscalYearEnd) {
            // Calculate months from fiscal year start to retirement
            const monthsActive = (
                (retireDate.getFullYear() - fiscalYearStart.getFullYear()) * 12 + 
                retireDate.getMonth() - fiscalYearStart.getMonth() + 
                (retireDate.getDate() >= 15 ? 1 : 0) // Count current month if retiring after 15th
            );
            
            // Ensure at least one month if retiring in April
            maxMonths = Math.max(1, monthsActive);
        }
    }
    
    // Create continuous months data from the last month in the original data
    // Start from the month after the last one in the data
    let currentMonth = lastMonth;
    let currentYear = lastYear;
    
    const lastMonthData = JSON.parse(JSON.stringify(lastEntry));
    
    // Add months until we reach 12 or the retirement limit
    while (result.length < maxMonths) {
        // Move to the next month
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        
        // Format the month string to match the format used in the original data
        let nextMonthStr;
        if (monthMatch && monthMatch[1].length <= 3) {
            // Use short month name format (Jan 2025)
            nextMonthStr = `${monthNames[currentMonth]} ${currentYear}`;
        } else if (monthMatch && monthMatch[1].length > 3) {
            // Use long month name format (January 2025)
            nextMonthStr = `${monthNamesLong[currentMonth]} ${currentYear}`;
        } else {
            // Use numeric format (MM-YYYY)
            nextMonthStr = `${String(currentMonth + 1).padStart(2, '0')}-${currentYear}`;
        }
        
        // Create new month entry with updated month name
        const newMonthEntry = JSON.parse(JSON.stringify(lastMonthData));
        newMonthEntry.month = nextMonthStr;
        
        // Add to result
        result.push(newMonthEntry);
    }
    
    // Ensure we don't exceed maxMonths
    return result.slice(0, maxMonths);
}

/**
 * Format date in a readable format
 * @param {string|Date} date - Date to format
 * @param {string} format - Optional format (default: 'DD-MM-YYYY')
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'DD-MM-YYYY') {
    if (!date) return '';
    
    const d = typeof date === 'string' ? parseDate(date) : date;
    if (!d || isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    // Month name arrays
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (format === 'DD-MM-YYYY') {
        return `${day}-${month}-${year}`;
    } else if (format === 'MM/DD/YYYY') {
        return `${month}/${day}/${year}`;
    } else if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
    } else if (format === 'DD-MMM-YYYY') {
        return `${day}-${monthNames[d.getMonth()]}-${year}`;
    } else if (format === 'DD-MMM-YYYY HH:mm') {
        return `${day}-${monthNames[d.getMonth()]}-${year} ${hours}:${minutes}`;
    } else if (format === 'MMMM DD, YYYY') {
        return `${fullMonthNames[d.getMonth()]} ${day}, ${year}`;
    } else if (format === 'HH:mm:ss') {
        return `${hours}:${minutes}:${seconds}`;
    } else if (format === 'DD-MM-YYYY HH:mm:ss') {
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } else if (format === 'YYYY-MM-DD HH:mm:ss') {
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    return `${day}-${month}-${year}`;
}

/**
 * Get the current Indian fiscal year in the format YYYY-YYYY
 * In India, the fiscal year runs from April 1 to March 31
 * @returns {string} - Current fiscal year in YYYY-YYYY format
 */
function getCurrentIndianFiscalYear() {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed (0 = January, 3 = April)
    const currentYear = today.getFullYear();
    
    // If current month is January to March (0-2), fiscal year is previous year to current year
    // If current month is April to December (3-11), fiscal year is current year to next year
    if (currentMonth < 3) { // January to March
        return `${currentYear-1}-${currentYear}`;
    } else { // April to December
        return `${currentYear}-${currentYear+1}`;
    }
}

/**
 * Initialize date pickers in the document
 * Uses Flatpickr library
 */
function initDatePickers() {
    const datePickers = document.querySelectorAll('.date-picker');
    if (datePickers.length > 0) {
        datePickers.forEach(input => {
            flatpickr(input, {
                dateFormat: 'd-m-Y',
                allowInput: true
            });
        });
    }
}

/**
 * Error handling wrapper function
 * @param {Function} fn - Function to wrap
 * @returns {Function} - Wrapped function with error handling
 */
function handleError(fn) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error('An error occurred:', error);
            alert('An error occurred. Please try again or contact support if the problem persists.');
            return null;
        }
    };
}

// Initialize sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Set active menu item based on current page
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === currentPage) {
            item.classList.add('active');
        }
    });
    
    // Initialize date pickers if any
    initDatePickers();
});
