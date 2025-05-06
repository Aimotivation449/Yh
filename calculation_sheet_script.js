/**
 * Calculation Sheet Script - Handles detailed tax calculation and breakdown
 */

let allData = {};
let currentPage = 0;
let employeeIds = [];
let itemsPerPage = 1; // Show one employee per page

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtnBottom = document.getElementById('prevBtnBottom');
    const nextBtnBottom = document.getElementById('nextBtnBottom');
    
    if (prevBtn && nextBtn && prevBtnBottom && nextBtnBottom) {
        prevBtn.addEventListener('click', previousPage);
        nextBtn.addEventListener('click', nextPage);
        prevBtnBottom.addEventListener('click', previousPage);
        nextBtnBottom.addEventListener('click', nextPage);
    }
    
    // Try to load data from localStorage
    loadAllData();
    
    // Initialize any employees already in the data
    if (Object.keys(allData).length > 0) {
        generateOutput();
    }
    
    // Initialize date pickers for retirement dates
    initDatePickers();
});

// Load all data from localStorage
function loadAllData() {
    try {
        // Load salary data
        allData = DataManager.loadSalaryData();
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        alert('Error loading saved data. Starting with empty dataset.');
        allData = {};
    }
}

// Process CSV file
function processCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select a CSV file to upload.");
        return;
    }
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="alert alert-info">Processing CSV file, please wait...</div>';
    document.querySelector('.card-body').appendChild(loadingIndicator);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            console.log("CSV file loaded, length:", csvText.length);
            
            // Use PapaParse to parse the CSV
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                complete: function(results) {
                    console.log("CSV parsing complete, rows:", results.data.length);
                    
                    if (results.data.length <= 1) {
                        // Only header row, no data
                        removeLoadingIndicator();
                        alert("The CSV file contains no data rows. Please check the file.");
                        return;
                    }
                    
                    // Process the data (skip header row)
                    processCSVData(results.data.slice(1));
                    
                    // Save the processed data
                    try {
                        DataManager.saveSalaryData(allData);
                        generateOutput();
                        removeLoadingIndicator();
                    } catch (saveError) {
                        console.error("Error saving data:", saveError);
                        removeLoadingIndicator();
                        alert("There was an error saving the processed data.");
                    }
                },
                error: function(error) {
                    console.error("Error parsing CSV:", error);
                    removeLoadingIndicator();
                    alert("There was an error parsing the CSV file. Please check the format and try again.");
                }
            });
        } catch (error) {
            console.error("Error reading CSV file:", error);
            removeLoadingIndicator();
            alert("There was an error reading the CSV file. Please try again.");
        }
    };
    
    reader.onerror = function(error) {
        console.error("FileReader error:", error);
        removeLoadingIndicator();
        alert("Error reading the file. Please try again.");
    };
    
    reader.readAsText(file);
    
    // Function to remove loading indicator
    function removeLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.parentNode.removeChild(indicator);
        }
    }
}

// XLSX functionality removed as per requirements

// Column mapping for CSV data
const columnMap = {
    regtNo: 0, rank: 2, name: 4, pan: 7, month: 8,
    basicPay: 9, da: 11, tpt: 12, hra: 13,
    dressAll: 14, nurseDressAll: 15, bonus: 16,
    rma: 17, daArrear: 18, familyPay: 19,
    personalPay: 20, soapAll: 21, hindiPay: 22,
    specialPay: 23, hca: 24, hpca: 25, rha: 26,
    sdaCa: 27, rumCigaretteAll: 28, total: 29,
    gpf: 30, cpf: 31, cgegis: 32, cghs: 33, gjspkk: 34, 
    tax: 35, hrr: 36, pli: 37, recovery: 39
};

// Process CSV data
function processCSVData(data) {
    try {
        let processedCount = 0;
        
        data.forEach(row => {
            if (!row || row.length < 40) {
                console.warn("Skipping row with insufficient columns:", row);
                return; // Skip rows with insufficient columns
            }
            
            // Safely get the regiment number, handling potential nulls or undefined
            const regtNo = row[columnMap.regtNo] ? String(row[columnMap.regtNo]).trim() : "";
            if (!regtNo) {
                console.warn("Skipping row without regiment number");
                return; // Skip rows without regiment number
            }
            
            if (!allData[regtNo]) allData[regtNo] = [];
            
            // Safely get the month, handling potential nulls or undefined
            const month = row[columnMap.month] ? String(row[columnMap.month]).trim() : "Unknown";
        
        // Check if this month already exists for this employee
        const existingIndex = allData[regtNo].findIndex(entry => entry.month === month);
        
        const entry = {
            month: month,
            details: {
                rank: String(row[columnMap.rank]).trim(),
                name: String(row[columnMap.name]).trim(),
                pan: String(row[columnMap.pan]).trim(),
                basicPay: safeParseNumber(row[columnMap.basicPay]),
                da: safeParseNumber(row[columnMap.da]),
                tpt: safeParseNumber(row[columnMap.tpt]),
                hra: safeParseNumber(row[columnMap.hra]),
                dressAll: safeParseNumber(row[columnMap.dressAll]),
                nurseDressAll: safeParseNumber(row[columnMap.nurseDressAll]),
                bonus: safeParseNumber(row[columnMap.bonus]),
                rma: safeParseNumber(row[columnMap.rma]),
                daArrear: safeParseNumber(row[columnMap.daArrear]),
                familyPay: safeParseNumber(row[columnMap.familyPay]),
                personalPay: safeParseNumber(row[columnMap.personalPay]),
                soapAll: safeParseNumber(row[columnMap.soapAll]),
                hindiPay: safeParseNumber(row[columnMap.hindiPay]),
                specialPay: safeParseNumber(row[columnMap.specialPay]),
                hca: safeParseNumber(row[columnMap.hca]),
                hpca: safeParseNumber(row[columnMap.hpca]),
                rha: safeParseNumber(row[columnMap.rha]),
                sdaCa: safeParseNumber(row[columnMap.sdaCa]),
                rumCigaretteAll: safeParseNumber(row[columnMap.rumCigaretteAll]),
                // XLSX columns removed as per requirements
                total: safeParseNumber(row[columnMap.total]),
                gpf: safeParseNumber(row[columnMap.gpf]),
                cpf: safeParseNumber(row[columnMap.cpf]),
                cgegis: safeParseNumber(row[columnMap.cgegis]),
                cghs: safeParseNumber(row[columnMap.cghs]),
                gjspkk: safeParseNumber(row[columnMap.gjspkk]),
                tax: safeParseNumber(row[columnMap.tax]),
                hrr: safeParseNumber(row[columnMap.hrr]),
                pli: safeParseNumber(row[columnMap.pli]),
                recovery: safeParseNumber(row[columnMap.recovery])
            }
        };
        
        // Calculate total if not present
        if (!entry.details.total) {
            calculateTotal(entry.details);
        }
        
        if (existingIndex >= 0) {
            // Update existing entry
            allData[regtNo][existingIndex] = entry;
        } else {
            // Add new entry
            allData[regtNo].push(entry);
        }
        
        processedCount++;
        });
        
        // Update employeeIds for pagination
        employeeIds = Object.keys(allData);
        currentPage = 0;
        
        if (processedCount > 0) {
            // Show success message
            alert(`Successfully processed ${processedCount} records.`);
        } else {
            alert("No valid records could be processed from the CSV. Please check the file format.");
        }
    } catch (error) {
        console.error("Error processing CSV data:", error);
        alert("There was an error processing the CSV data. Please check the format and try again.");
    }
}

// XLSX data processing functionality removed as per requirements

// Calculate total for a details object
function calculateTotal(details) {
    const grossValues = [
        details.basicPay, details.da, details.tpt, details.hra,
        details.dressAll, details.nurseDressAll, details.bonus,
        details.rma, details.daArrear, details.familyPay,
        details.personalPay, details.soapAll, details.hindiPay,
        details.specialPay, details.hca, details.hpca, details.rha,
        details.sdaCa, details.rumCigaretteAll
        // XLSX columns removed as per requirements
    ];

    // Calculate gross total
    details.total = grossValues.reduce((sum, val) => sum + val, 0);
}

// Generate output for all employees
function generateOutput() {
    employeeIds = Object.keys(allData);
    
    if (employeeIds.length === 0) {
        document.getElementById('results').innerHTML = 
            '<div class="no-data-message">No data available. Please upload salary data first.</div>';
        document.getElementById('navButtons').style.display = 'none';
        currentPage = 0;
        updateNavButtons();
        return;
    }
    
    // Enable navigation
    document.getElementById('navButtons').style.display = 'block';
    
    // Reset to first page
    currentPage = 0;
    
    // Update navigation buttons
    updateNavButtons();
    
    // Display the current page
    displayCurrentPage();
    
    // Force refresh of tax summary cache after calculation sheet is updated
    DataManager.clearTaxSummaryCache();
    // Pre-generate the tax summary for use in other pages
    DataManager.getTaxSummary();
}

// Display the current page of employees
function displayCurrentPage() {
    const results = document.getElementById('results');
    results.innerHTML = '';
    
    const startIndex = currentPage;
    const endIndex = Math.min(startIndex + itemsPerPage, employeeIds.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const regtNo = employeeIds[i];
        const employee = allData[regtNo];
        
        if (!employee || employee.length === 0) continue;
        
        // Get retirement date if set
        let retirementDate = DataManager.getRetirementDate(regtNo);
        
        const employeeHTML = generateEmployeeHTML(regtNo, employee, i, retirementDate);
        results.innerHTML += employeeHTML;
    }
    
    // Initialize date pickers for retirement dates
    initDatePickers();
    
    // Add event listeners for retirement date changes
    document.querySelectorAll('.retirement-date').forEach(input => {
        input.addEventListener('change', function() {
            const index = this.id.split('-')[1];
            const regtNo = employeeIds[index];
            
            if (this.value) {
                DataManager.saveRetirementDate(regtNo, this.value);
            } else {
                localStorage.removeItem(`retirement_${regtNo}`);
            }
            
            // Clear tax summary cache since retirement date affects tax calculation
            DataManager.clearTaxSummaryCache();
            
            // Regenerate the employee card to show updated calculation
            const employeeCard = document.getElementById(`employee-card-${index}`);
            if (employeeCard) {
                const employee = allData[regtNo];
                employeeCard.outerHTML = generateEmployeeHTML(regtNo, employee, index, this.value);
                
                // Reinitialize the date picker
                initDatePickers();
            }
        });
    });
    
    // Add event listeners for clear date buttons
    addClearDateListeners();
    
    // Update page info
    document.getElementById('pageInfo').textContent = `Employee ${currentPage + 1} of ${employeeIds.length}`;
}

// Function to add event listeners to clear date buttons
function addClearDateListeners() {
    document.querySelectorAll('.clear-date-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            const regtNo = employeeIds[index];
            const datePicker = document.getElementById(`retirementDate-${index}`);
            
            // Clear the date picker
            if (datePicker) {
                datePicker.value = '';
                
                // Remove the retirement date from storage
                localStorage.removeItem(`retirement_${regtNo}`);
                
                // Clear tax summary cache since retirement date affects tax calculation
                DataManager.clearTaxSummaryCache();
                
                // Regenerate the employee card to show updated calculation
                const employeeCard = document.getElementById(`employee-card-${index}`);
                if (employeeCard) {
                    const employee = allData[regtNo];
                    employeeCard.outerHTML = generateEmployeeHTML(regtNo, employee, index, '');
                    
                    // Reinitialize the date picker and clear date button
                    initDatePickers();
                    addClearDateListeners();
                }
            }
        });
    });
}

// Generate HTML for a single employee
function generateEmployeeHTML(regtNo, employee, index, retirementDate) {
    if (!employee || employee.length === 0) return '';
    
    const firstMonth = employee[0].details;
    const extendedData = extendTo12Months(employee, retirementDate);
    const monthsCount = extendedData.length;
    
    // Get bill claims for this employee
    const billClaims = DataManager.loadBillClaims().filter(claim => claim.regtNo === regtNo);
    
    // Calculate totals from extended data
    const annualSalary = extendedData.reduce((sum, entry) => sum + entry.details.total, 0);
    
    // Calculate CSV recovery from salary data (column index 39)
    const csvRecovery = extendedData.reduce((sum, entry) => sum + (entry.details.recovery || 0), 0);
    
    // Calculate the sum of tax column from CSV data
    const csvFileTax = extendedData.reduce((sum, entry) => sum + (entry.details.tax || 0), 0);
    
    // Get additional taxable income from bill claims
    const additionalIncome = billClaims
        .filter(claim => claim.billType !== 'Recovery' && claim.billType !== 'Tax Deduction' && claim.taxable)
        .reduce((sum, claim) => sum + claim.amount, 0);
    
    // Get recoveries from dedicated manual recoveries storage
    const manualRecoveriesData = DataManager.loadManualRecoveries().filter(recovery => recovery.regtNo === regtNo);
    const manualRecoveriesAmount = manualRecoveriesData.reduce((sum, recovery) => sum + recovery.amount, 0);
    
    // Get legacy recoveries (for backward compatibility) from bill claims
    const legacyRecoveries = billClaims
        .filter(claim => claim.billType === 'Recovery')
        .reduce((sum, claim) => sum + claim.amount, 0);
    
    // Total manual recoveries (both new and legacy)
    const manualRecoveries = manualRecoveriesAmount + legacyRecoveries;
    
    // Total recoveries (manual + CSV)
    const totalRecoveries = manualRecoveries + csvRecovery;
        
    // Load tax deductions from their dedicated storage
    const taxDeductionsData = DataManager.loadTaxDeductions().filter(deduction => deduction.regtNo === regtNo);
    const manualTaxDeductions = taxDeductionsData.reduce((sum, deduction) => sum + deduction.amount, 0);
    
    // Get tax parameters
    const taxParams = DataManager.getTaxParameters();
    const standardDeduction = taxParams.standardDeduction || 75000;
    const educationCessRate = taxParams.educationCess || 4;
    
    // Calculate taxable income
    const taxableIncome = Math.max(0, annualSalary + additionalIncome - totalRecoveries - standardDeduction);
    
    // Calculate tax - using tax_utils.js
    const tax = calculateTax(taxableIncome);
    // Use Section 87A rebate calculation from tax_utils.js
    const rebate87A = calculateSection87ARebate(taxableIncome, tax);
    // Calculate initial net tax after rebate
    let netTaxAfterRebate = tax - rebate87A;
    // Calculate marginal relief for incomes just above ₹12 lakh
    const marginalRelief87AB = calculateMarginalRelief87AB(taxableIncome, netTaxAfterRebate);
    // Apply marginal relief to net tax
    const netTax = netTaxAfterRebate - marginalRelief87AB;
    const educationCess = Math.round(netTax * (educationCessRate / 100));
    // Include the CSV file I-Tax in deductions
    const totalTax = Math.max(0, netTax + educationCess - manualTaxDeductions - csvFileTax);
    
    // Calculate monthly deduction
    const monthlyDeduction = monthsCount > 0 ? Math.round(totalTax / monthsCount) : 0;
    
    // Create HTML
    let html = `
        <div id="employee-card-${index}" class="card employee-card mb-4">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${firstMonth.rank} ${firstMonth.name} (${regtNo})</h5>
                    <div class="d-flex align-items-center">
                        <label class="me-2">Retirement Date:</label>
                        <div class="input-group" style="width: 220px;">
                            <input type="text" id="retirementDate-${index}" class="form-control form-control-sm retirement-date date-picker" placeholder="DD-MM-YYYY" value="${retirementDate || ''}">
                            <button class="btn btn-sm btn-outline-secondary clear-date-btn" type="button" data-index="${index}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="employee-details">
                    <div class="employee-detail">
                        <strong>Regiment No:</strong> ${regtNo}
                    </div>
                    <div class="employee-detail">
                        <strong>Rank:</strong> ${firstMonth.rank}
                    </div>
                    <div class="employee-detail">
                        <strong>Name:</strong> ${firstMonth.name}
                    </div>
                    <div class="employee-detail">
                        <strong>PAN:</strong> ${firstMonth.pan || 'N/A'}
                    </div>
                </div>
                
                <h6 class="mt-4">Monthly Salary Details</h6>
                <div class="table-responsive-xl monthly-data-table">
                    <table class="table table-sm table-bordered">
                        <thead class="table-dark">
                            <tr>
                                <th>Month</th>
                                <th>Basic Pay</th>
                                <th>DA</th>
                                <th>TPT</th>
                                <th>HRA</th>
                                <th>Dress All</th>
                                <th>Nurse Dress All</th>
                                <th>Bonus</th>
                                <th>RMA</th>
                                <th>DA Arrear</th>
                                <th>Family Pay</th>
                                <th>Personal Pay</th>
                                <th>Soap All</th>
                                <th>Hindi Pay</th>
                                <th>Special Pay</th>
                                <th>HCA</th>
                                <th>HPCA</th>
                                <th>RHA</th>
                                <th>SDA/CA</th>
                                <th>Rum Cig All</th>
                                <th>Gross Salary</th>
                                <th>GPF</th>
                                <th>CPF</th>
                                <th>CGEGIS</th>
                                <th>CGHS</th>
                                <th>GJSPKK</th>
                                <th>Tax</th>
                                <th>HRR</th>
                                <th>PLI</th>
                                <th>Recovery</th>
                                <th>Net Salary</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    // Add rows for each month
    extendedData.forEach(entry => {
        const details = entry.details;
        const otherAllowances = 
            details.tpt + 
            details.dressAll + 
            details.nurseDressAll + 
            details.bonus +
            details.rma + 
            details.daArrear + 
            details.familyPay +
            details.personalPay + 
            details.soapAll + 
            details.hindiPay +
            details.specialPay + 
            details.hca + 
            details.hpca + 
            details.rha +
            details.sdaCa + 
            details.rumCigaretteAll;
            
        const deductions = 
            details.gpf + 
            details.cpf + 
            details.cgegis + 
            details.cghs +
            details.gjspkk + 
            details.tax + 
            details.hrr + 
            details.pli +
            details.recovery;
            
        const netSalary = details.total - deductions;
        
        html += `
            <tr>
                <td>${entry.month || 'N/A'}</td>
                <td>${formatCurrency(details.basicPay)}</td>
                <td>${formatCurrency(details.da)}</td>
                <td>${formatCurrency(details.tpt)}</td>
                <td>${formatCurrency(details.hra)}</td>
                <td>${formatCurrency(details.dressAll)}</td>
                <td>${formatCurrency(details.nurseDressAll)}</td>
                <td>${formatCurrency(details.bonus)}</td>
                <td>${formatCurrency(details.rma)}</td>
                <td>${formatCurrency(details.daArrear)}</td>
                <td>${formatCurrency(details.familyPay)}</td>
                <td>${formatCurrency(details.personalPay)}</td>
                <td>${formatCurrency(details.soapAll)}</td>
                <td>${formatCurrency(details.hindiPay)}</td>
                <td>${formatCurrency(details.specialPay)}</td>
                <td>${formatCurrency(details.hca)}</td>
                <td>${formatCurrency(details.hpca)}</td>
                <td>${formatCurrency(details.rha)}</td>
                <td>${formatCurrency(details.sdaCa)}</td>
                <td>${formatCurrency(details.rumCigaretteAll)}</td>
                <td>${formatCurrency(details.total)}</td>
                <td>${formatCurrency(details.gpf)}</td>
                <td>${formatCurrency(details.cpf)}</td>
                <td>${formatCurrency(details.cgegis)}</td>
                <td>${formatCurrency(details.cghs)}</td>
                <td>${formatCurrency(details.gjspkk)}</td>
                <td>${formatCurrency(details.tax)}</td>
                <td>${formatCurrency(details.hrr)}</td>
                <td>${formatCurrency(details.pli)}</td>
                <td>${formatCurrency(details.recovery)}</td>
                <td>${formatCurrency(netSalary)}</td>
            </tr>`;
    });
    
    html += `
                        </tbody>
                        <tfoot class="table-dark">
                            <tr>
                                <th>Total</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.basicPay, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.da, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.tpt, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.hra, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.dressAll, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.nurseDressAll, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.bonus, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.rma, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.daArrear, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.familyPay, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.personalPay, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.soapAll, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.hindiPay, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.specialPay, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.hca, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.hpca, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.rha, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.sdaCa, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.rumCigaretteAll, 0))}</th>
                                <th>${formatCurrency(annualSalary)}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.gpf, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.cpf, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.cgegis, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.cghs, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.gjspkk, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.tax, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.hrr, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.pli, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => sum + entry.details.recovery, 0))}</th>
                                <th>${formatCurrency(extendedData.reduce((sum, entry) => {
                                    const details = entry.details;
                                    const deductions = 
                                        details.gpf + details.cpf + details.cgegis + details.cghs +
                                        details.gjspkk + details.tax + details.hrr + details.pli +
                                        details.recovery;
                                    return sum + (details.total - deductions);
                                }, 0))}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <h6>Manual Recoveries and Bill Claims</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead class="table-dark">
                            <tr>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Taxable</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    // Add rows for bill claims (excluding tax deductions which are now stored separately)
    if (billClaims.length > 0) {
        billClaims.forEach(claim => {
            html += `
                <tr>
                    <td>${claim.billType}</td>
                    <td>${claim.description || 'N/A'}</td>
                    <td>${formatCurrency(claim.amount)}</td>
                    <td>${claim.billType === 'Recovery' ? 'N/A' : (claim.taxable ? 'Yes' : 'No')}</td>
                </tr>`;
        });
    }
    
    // Add tax deductions from their dedicated storage
    if (taxDeductionsData.length > 0) {
        taxDeductionsData.forEach(deduction => {
            const employerText = deduction.employerName ? `(${deduction.employerName})` : '';
            const description = `Tax deduction - ${deduction.month} ${employerText}`;
            html += `
                <tr>
                    <td>Tax Deduction</td>
                    <td>${description}</td>
                    <td>${formatCurrency(deduction.amount)}</td>
                    <td>N/A</td>
                </tr>`;
        });
    }
    
    // Show message if no entries exist
    if (billClaims.length === 0 && manualRecoveriesData.length === 0 && taxDeductionsData.length === 0) {
        html += `
                <tr>
                    <td colspan="4" class="text-center">No entries found</td>
                </tr>`;
    }
    
    html += `
                        </tbody>
                    </table>
                </div>
                
                <div class="tax-summary card mt-4">
                    <div class="card-body">
                        <h6>Tax Calculation Summary</h6>
                        <div class="tax-summary-item">
                            <span>Annual Income:</span>
                            <span>${formatCurrency(annualSalary)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Standard Deduction:</span>
                            <span>${formatCurrency(standardDeduction)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Additional Taxable Income:</span>
                            <span>${formatCurrency(additionalIncome)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>CSV Recovery:</span>
                            <span>${formatCurrency(csvRecovery)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Manual Recoveries:</span>
                            <span>${formatCurrency(manualRecoveriesAmount)}</span>
                            <button class="btn-link-sm ms-2" onclick="window.location.href='manual_recoveries.html?regtNo=${encodeURIComponent(regtNo)}'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Manage
                            </button>
                        </div>
                        ${legacyRecoveries > 0 ? `
                        <div class="tax-summary-item">
                            <span>Legacy Recoveries:</span>
                            <span>${formatCurrency(legacyRecoveries)}</span>
                        </div>
                        ` : ''}
                        <div class="tax-summary-item">
                            <span>Total Recoveries:</span>
                            <span>${formatCurrency(totalRecoveries)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Taxable Income:</span>
                            <span>${formatCurrency(taxableIncome)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Income Tax:</span>
                            <span>${formatCurrency(tax)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Under Section 87A Rebate:</span>
                            <span>${formatCurrency(rebate87A)}</span>
                        </div>
                        ${marginalRelief87AB > 0 ? `
                        <div class="tax-summary-item">
                            <span>Relief Under Section 87A(b):</span>
                            <span>${formatCurrency(marginalRelief87AB)}</span>
                        </div>` : ''}
                        <div class="tax-summary-item">
                            <span>Net Tax:</span>
                            <span>${formatCurrency(netTax)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Education & Health Cess (${educationCessRate}%):</span>
                            <span>${formatCurrency(educationCess)}</span>
                        </div>
                        <div class="tax-summary-item">
                            <span>Manual Tax Deductions:</span>
                            <span>${formatCurrency(manualTaxDeductions)}</span>
                            <button class="btn-link-sm ms-2" onclick="window.location.href='manual_tax.html?regtNo=${encodeURIComponent(regtNo)}'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Manage
                            </button>
                        </div>
                        <div class="tax-summary-item">
                            <span>CSV file I-Tax:</span>
                            <span>${formatCurrency(csvFileTax)}</span>
                        </div>
                        <div class="tax-summary-item tax-summary-total">
                            <span>Total Tax for FY ${taxParams.fiscalYear || getCurrentIndianFiscalYear()}:</span>
                            <span>${formatCurrency(totalTax)}</span>
                        </div>
                        <div class="tax-summary-item tax-summary-total">
                            <span>Monthly Tax Deduction (${monthsCount} months):</span>
                            <span>${formatCurrency(monthlyDeduction)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    
    return html;
}

// Initialize date pickers
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

// Navigation functions
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        updateNavButtons();
        displayCurrentPage();
    }
}

function nextPage() {
    if (currentPage < employeeIds.length - 1) {
        currentPage++;
        updateNavButtons();
        displayCurrentPage();
    }
}

// Update navigation buttons state
function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtnBottom = document.getElementById('prevBtnBottom');
    const nextBtnBottom = document.getElementById('nextBtnBottom');
    
    if (prevBtn && nextBtn && prevBtnBottom && nextBtnBottom) {
        prevBtn.disabled = currentPage === 0;
        prevBtnBottom.disabled = currentPage === 0;
        nextBtn.disabled = currentPage >= employeeIds.length - 1;
        nextBtnBottom.disabled = currentPage >= employeeIds.length - 1;
    }
}

// Search employee by regiment number or name
function searchEmployee() {
    const regNoInput = document.getElementById('searchRegNo').value.trim();
    const nameInput = document.getElementById('searchName').value.trim().toLowerCase();
    
    if (Object.keys(allData).length === 0) {
        alert('No data available. Please upload salary data first.');
        return;
    }
    
    if (!regNoInput && !nameInput) {
        alert('Please enter a Regiment Number or Name to search.');
        return;
    }
    
    let foundIndex = -1;
    
    // Search by regiment number (exact match)
    if (regNoInput) {
        foundIndex = employeeIds.findIndex(id => id === regNoInput);
        if (foundIndex !== -1) {
            currentPage = foundIndex;
            updateNavButtons();
            displayCurrentPage();
            return;
        }
    }
    
    // Search by name (partial match)
    if (nameInput) {
        for (let i = 0; i < employeeIds.length; i++) {
            const regtNo = employeeIds[i];
            const employee = allData[regtNo];
            if (employee && employee.length > 0) {
                const employeeName = employee[0].details.name.toLowerCase();
                if (employeeName.includes(nameInput)) {
                    currentPage = i;
                    updateNavButtons();
                    displayCurrentPage();
                    return;
                }
            }
        }
    }
    
    // If no match found
    alert('No employee found matching the search criteria.');
}

// Clear search inputs
function clearSearch() {
    document.getElementById('searchRegNo').value = '';
    document.getElementById('searchName').value = '';
}

// Download tax information as CSV
function downloadTaxInfo() {
    if (Object.keys(allData).length === 0) {
        alert('No data available. Please upload salary data first.');
        return;
    }

    let csvContent = "Regiment No,Name,Rank,PAN,Annual Income,Standard Deduction,Additional Income,CSV Recoveries,Manual Recoveries,Legacy Recoveries,Total Recoveries,Taxable Income,Tax,Under Section 87A Rebate,Relief Under Section 87A(b),Net Tax,Education Cess,Manual Tax Deductions,CSV file I-Tax,Total Tax,Monthly Deduction\n";

    Object.keys(allData).forEach(regtNo => {
        const employee = allData[regtNo];
        if (!employee || employee.length === 0) return;

        const retirementDate = DataManager.getRetirementDate(regtNo);

        const extendedData = extendTo12Months(employee, retirementDate);
        const monthsCount = extendedData.length;

        // Calculate annual total from extended data
        const annualTotal = extendedData.reduce((sum, entry) => sum + entry.details.total, 0);
        
        // Calculate CSV recovery from salary data (column index 39)
        const csvRecovery = extendedData.reduce((sum, entry) => sum + (entry.details.recovery || 0), 0);
        
        // Calculate the sum of tax column from CSV data
        const csvFileTax = extendedData.reduce((sum, entry) => sum + (entry.details.tax || 0), 0);

        // Get tax parameters
        const taxParams = DataManager.getTaxParameters();
        const standardDeduction = taxParams.standardDeduction || 75000;
        const educationCessRate = taxParams.educationCess || 4;

        // Get manual bill claims and recoveries for this employee
        const billClaims = DataManager.loadBillClaims().filter(claim => claim.regtNo === regtNo);
        
        const additionalIncome = billClaims
            .filter(claim => claim.billType !== 'Recovery' && claim.billType !== 'Tax Deduction' && claim.taxable)
            .reduce((sum, claim) => sum + claim.amount, 0);

        // Get recoveries from dedicated manual recoveries storage
        const manualRecoveriesData = DataManager.loadManualRecoveries().filter(recovery => recovery.regtNo === regtNo);
        const manualRecoveriesAmount = manualRecoveriesData.reduce((sum, recovery) => sum + recovery.amount, 0);
        
        // Get legacy recoveries (for backward compatibility) from bill claims
        const legacyRecoveries = billClaims
            .filter(claim => claim.billType === 'Recovery')
            .reduce((sum, claim) => sum + claim.amount, 0);
        
        // Total manual recoveries (both new and legacy)
        const manualRecoveries = manualRecoveriesAmount + legacyRecoveries;
        
        // Total recoveries (manual + CSV)
        const totalRecoveries = manualRecoveries + csvRecovery;

        // Load tax deductions from their dedicated storage
        const taxDeductionsData = DataManager.loadTaxDeductions().filter(deduction => deduction.regtNo === regtNo);
        const manualTaxDeductions = taxDeductionsData.reduce((sum, deduction) => sum + deduction.amount, 0);

        // Calculate taxable income
        const taxableIncome = Math.max(0, annualTotal + additionalIncome - totalRecoveries - standardDeduction);

        // Calculate tax - using tax_utils.js
        const tax = calculateTax(taxableIncome);
        // Use Section 87A rebate calculation from tax_utils.js
        const rebate87A = calculateSection87ARebate(taxableIncome, tax);
        // Calculate initial net tax after rebate
        let netTaxAfterRebate = tax - rebate87A;
        // Calculate marginal relief for incomes just above ₹12 lakh
        const marginalRelief87AB = calculateMarginalRelief87AB(taxableIncome, netTaxAfterRebate);
        // Apply marginal relief to net tax
        const netTax = netTaxAfterRebate - marginalRelief87AB;
        const educationCess = Math.round(netTax * (educationCessRate / 100));
        // Include the CSV file I-Tax in deductions
        const totalTax = Math.max(0, netTax + educationCess - manualTaxDeductions - csvFileTax);

        // Calculate monthly deduction
        const monthlyDeduction = monthsCount > 0 ? Math.round(totalTax / monthsCount) : 0;

        const firstEntry = employee[0].details;

        csvContent += `${regtNo},${firstEntry.name},${firstEntry.rank},${firstEntry.pan},${annualTotal},${standardDeduction},${additionalIncome},${csvRecovery},${manualRecoveriesAmount},${legacyRecoveries},${totalRecoveries},${taxableIncome},${tax},${rebate87A},${marginalRelief87AB},${netTax},${educationCess},${manualTaxDeductions},${csvFileTax},${totalTax},${monthlyDeduction}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tax_information.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
