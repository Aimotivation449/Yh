// Global variables to store data
let csvData = [];
let uniqueData = [];
let salaryDataMap = {}; // For storing salary data in localStorage

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Try to load data from localStorage
    loadSalaryData();
    
    // Add event listeners for search
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    if (searchInput && searchType) {
        searchInput.addEventListener('input', search);
        searchType.addEventListener('change', search);
    }
    
    // Sidebar toggle
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
});

// Load salary data from localStorage
function loadSalaryData() {
    try {
        const savedData = localStorage.getItem('salaryData');
        if (savedData) {
            salaryDataMap = JSON.parse(savedData);
            processStoredData();
        }
    } catch (error) {
        console.error("Error loading salary data:", error);
    }
}

// Process data from localStorage
function processStoredData() {
    csvData = [];
    uniqueData = [];
    
    // Convert salaryDataMap to flat data for display
    Object.keys(salaryDataMap).forEach(regtNo => {
        const entries = salaryDataMap[regtNo];
        if (entries && entries.length > 0) {
            entries.forEach(entry => {
                const row = [
                    regtNo,
                    '', // Column B
                    entry.details.rank || '',
                    '', // Column D
                    entry.details.name || '',
                    '', // Column F
                    '', // Column G
                    entry.details.pan || '',
                    entry.month || '',
                    entry.details.basicPay || 0,
                    '', // Column K
                    entry.details.da || 0,
                    entry.details.tpt || 0,
                    entry.details.hra || 0,
                    entry.details.dressAll || 0,
                    entry.details.nurseDressAll || 0,
                    entry.details.bonus || 0,
                    entry.details.rma || 0,
                    entry.details.daArrear || 0,
                    entry.details.familyPay || 0,
                    entry.details.personalPay || 0,
                    entry.details.soapAll || 0,
                    entry.details.hindiPay || 0,
                    entry.details.specialPay || 0,
                    entry.details.hca || 0,
                    entry.details.hpca || 0, 
                    entry.details.rha || 0,
                    entry.details.sdaCa || 0,
                    entry.details.rumCigaretteAll || 0,
                    entry.details.total || 0
                ];
                csvData.push(row);
            });
        }
    });
    
    // Create uniqueData with one entry per regiment number
    filterUniqueRows();
    
    // Display the data
    if (uniqueData.length > 0) {
        displayTable(uniqueData);
    }
}

// Function to handle file upload
function uploadFile() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (file) {
        // Determine file type
        const fileType = file.name.split('.').pop().toLowerCase();
        
        if (fileType === 'csv') {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: function(results) {
                    csvData = results.data.slice(1); // Skip header row
                    processSalaryData();
                },
                error: function(error) {
                    console.error("Error parsing CSV:", error);
                    alert("There was an error uploading the file. Please try again.");
                }
            });
        } else if (fileType === 'xlsx') {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheet];
                    
                    // Convert to array of arrays (skip header)
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    csvData = jsonData.slice(1); // Skip header row
                    processSalaryData();
                } catch (error) {
                    console.error("Error processing XLSX:", error);
                    alert("There was an error processing the Excel file. Please try again.");
                }
            };
            reader.onerror = function() {
                alert("Error reading the file. Please try again.");
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Unsupported file type. Please upload a CSV or XLSX file.");
        }
    } else {
        alert("Please select a file to upload.");
    }
}

// Process salary data and save to localStorage
function processSalaryData() {
    if (!validateCSV(csvData)) {
        alert("The uploaded file format is invalid. Please check the file structure and try again.");
        return;
    }
    
    filterUniqueRows();
    saveSalaryData();
    alert("File uploaded successfully!");
    displayTable(uniqueData);
}

// Function to filter unique rows based on Regiment Number
function filterUniqueRows() {
    const seen = new Set();
    uniqueData = csvData.filter(row => {
        const regtNo = row[0];
        if (!regtNo || seen.has(regtNo)) {
            return false;
        }
        seen.add(regtNo);
        return true;
    });
}

// Validate CSV structure
function validateCSV(data) {
    if (!data || data.length === 0) {
        return false;
    }
    
    // Check for minimum required columns (at least 30 columns including salary in AD)
    const requiredColumns = 30;
    
    for (const row of data) {
        if (row.length < requiredColumns) {
            return false;
        }
        
        // Validate Regiment Number
        if (!row[0] || row[0].toString().trim() === '') {
            return false;
        }
    }
    
    return true;
}

// Save salary data to localStorage
function saveSalaryData() {
    try {
        // Group data by regiment number
        const dataByRegtNo = {};
        
        // Process each row in CSV data
        csvData.forEach(row => {
            if (!row[0]) return; // Skip rows without regiment number
            
            const regtNo = row[0];
            const month = row[8] || ''; // Column I for month
            
            if (!dataByRegtNo[regtNo]) {
                dataByRegtNo[regtNo] = [];
            }
            
            // Create detailed entry
            const entry = {
                month: month,
                details: {
                    rank: row[2] || '',
                    name: row[4] || '',
                    pan: row[7] || '',
                    basicPay: safeParseNumber(row[9]),
                    da: safeParseNumber(row[11]),
                    tpt: safeParseNumber(row[12]),
                    hra: safeParseNumber(row[13]),
                    dressAll: safeParseNumber(row[14]),
                    nurseDressAll: safeParseNumber(row[15]),
                    bonus: safeParseNumber(row[16]),
                    rma: safeParseNumber(row[17]),
                    daArrear: safeParseNumber(row[18]),
                    familyPay: safeParseNumber(row[19]),
                    personalPay: safeParseNumber(row[20]),
                    soapAll: safeParseNumber(row[21]),
                    hindiPay: safeParseNumber(row[22]),
                    specialPay: safeParseNumber(row[23]),
                    hca: safeParseNumber(row[24]),
                    hpca: safeParseNumber(row[25]),
                    rha: safeParseNumber(row[26]),
                    sdaCa: safeParseNumber(row[27]),
                    rumCigaretteAll: safeParseNumber(row[28]),
                    total: safeParseNumber(row[29]),
                    gpf: safeParseNumber(row[30]),
                    cpf: safeParseNumber(row[31]),
                    cgegis: safeParseNumber(row[32]),
                    cghs: safeParseNumber(row[33]),
                    gjspkk: safeParseNumber(row[34]),
                    tax: safeParseNumber(row[35]),
                    hrr: safeParseNumber(row[36]),
                    pli: safeParseNumber(row[37]),
                    recovery: safeParseNumber(row[39])
                }
            };
            
            dataByRegtNo[regtNo].push(entry);
        });
        
        // Save to local storage
        localStorage.setItem('salaryData', JSON.stringify(dataByRegtNo));
        salaryDataMap = dataByRegtNo;
    } catch (error) {
        console.error("Error saving salary data:", error);
        alert("There was an error saving the data. Please try again.");
    }
}

// Function to handle search
function search() {
    const searchType = document.getElementById('searchType').value;
    const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!searchInput) {
        displayTable(uniqueData);
        return;
    }
    
    let filteredData;
    if (searchType === 'regno') {
        filteredData = uniqueData.filter(row => (row[0] || '').toString().toLowerCase().includes(searchInput));
    } else { // name search
        filteredData = uniqueData.filter(row => (row[4] || '').toString().toLowerCase().includes(searchInput));
    }
    
    displayTable(filteredData);
}

// Function to calculate average salary and other details for tax purposes
function calculateEmployeeData() {
    // Load bill claims
    let billClaims = [];
    try {
        billClaims = DataManager.loadBillClaims();
    } catch (error) {
        console.error('Error loading bill claims:', error);
    }
    
    // Calculate average salary and process manual claims
    const employeeData = {};
    
    // Process monthly salary data first
    uniqueData.forEach(row => {
        const regtNo = row[0];
        if (!regtNo) return;
        
        // Find all matching rows in the full dataset
        const allEntries = csvData.filter(r => r[0] === regtNo);
        
        // Calculate average monthly salary
        let totalSalary = 0;
        allEntries.forEach(entry => {
            totalSalary += safeParseNumber(entry[29]); // Column AD for salary
        });
        
        const avgMonthlySalary = allEntries.length > 0 ? totalSalary / allEntries.length : 0;
        const annualSalary = Math.round(avgMonthlySalary * 12);
        
        // Get retirement date if set
        let retirementDate = null;
        try {
            retirementDate = DataManager.getRetirementDate(regtNo);
        } catch (error) {
            console.error(`Error loading retirement date for ${regtNo}:`, error);
        }
        
        // Calculate months of service this fiscal year
        let monthsOfService = 12;
        if (retirementDate) {
            const retDate = parseDate(retirementDate);
            if (retDate) {
                const fiscalYearStart = new Date();
                fiscalYearStart.setMonth(3); // April is month 3 (0-indexed)
                fiscalYearStart.setDate(1); // 1st of April
                
                const fiscalYearEnd = new Date(fiscalYearStart);
                fiscalYearEnd.setFullYear(fiscalYearStart.getFullYear() + 1);
                fiscalYearEnd.setDate(0); // Last day of March
                
                if (retDate >= fiscalYearStart && retDate <= fiscalYearEnd) {
                    // Calculate months between April 1 and retirement
                    monthsOfService = (
                        (retDate.getFullYear() - fiscalYearStart.getFullYear()) * 12 + 
                        retDate.getMonth() - fiscalYearStart.getMonth() + 
                        (retDate.getDate() >= 15 ? 1 : 0) // Count current month if retiring after 15th
                    );
                } else if (retDate < fiscalYearStart) {
                    monthsOfService = 0;
                }
            }
        }
        
        // Process manual claims for this employee
        const empClaims = billClaims.filter(claim => claim.regtNo === regtNo);
        
        const additionalTaxableIncome = empClaims
            .filter(claim => claim.billType !== 'Recovery' && claim.billType !== 'Tax Deduction' && claim.taxable)
            .reduce((sum, claim) => sum + claim.amount, 0);
            
        const recoveries = empClaims
            .filter(claim => claim.billType === 'Recovery')
            .reduce((sum, claim) => sum + claim.amount, 0);
            
        const manualTaxDeductions = empClaims
            .filter(claim => claim.billType === 'Tax Deduction')
            .reduce((sum, claim) => sum + claim.amount, 0);
        
        // Get standard deduction from settings or use default
        const standardDeduction = DataManager.getTaxParameters().standardDeduction || 75000;
        
        // Calculate pro-rated salary if retiring this year
        const proRatedSalary = monthsOfService < 12 ? Math.round(avgMonthlySalary * monthsOfService) : annualSalary;
        
        // Calculate taxable income
        const taxableIncome = proRatedSalary + additionalTaxableIncome - recoveries - standardDeduction;
        
        // Calculate tax
        const tax = calculateTax(Math.max(0, taxableIncome));
        const educationCessRate = DataManager.getTaxParameters().educationCess || 4;
        const educationCess = Math.round(tax * (educationCessRate / 100));
        const totalTax = Math.max(0, tax + educationCess - manualTaxDeductions);
        
        // Store data
        employeeData[regtNo] = {
            rank: row[2] || '',
            name: row[4] || '',
            totalSalary: proRatedSalary,
            standardDeduction: standardDeduction,
            additionalIncome: additionalTaxableIncome,
            recoveries: recoveries,
            taxableIncome: Math.max(0, taxableIncome),
            tax: tax,
            educationCess: educationCess,
            manualTaxDeductions: manualTaxDeductions,
            totalTax: totalTax,
            monthsOfService: monthsOfService,
            monthlyDeduction: monthsOfService > 0 ? Math.round(totalTax / monthsOfService) : 0
        };
    });
    
    return employeeData;
}

// Function to display table with calculated values
function displayTable(data) {
    const resultDiv = document.getElementById('result');
    
    if (!data || data.length === 0) {
        resultDiv.innerHTML = '<p>No data available to display.</p>';
        return;
    }
    
    // Get tax summary data from calculation sheet
    let taxSummary = {};
    try {
        taxSummary = DataManager.getTaxSummary();
    } catch (error) {
        console.error('Error loading tax summary:', error);
        taxSummary = {};
    }
    
    // Get tax parameters
    const taxParams = DataManager.getTaxParameters();
    const fiscalYear = taxParams.fiscalYear || getCurrentIndianFiscalYear();

    let tableHTML = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Regt. No.</th>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Total Salary</th>
                    <th>Standard Deduction</th>
                    <th>Additional Taxable Income</th>
                    <th>CSV Recovery</th>
                    <th>Manual Recoveries</th>
                    <th>Total Recoveries</th>
                    <th>Taxable Income</th>
                    <th>Income Tax</th>
                    <th>Under Section 87A Rebate</th>
                    <th>Net Tax</th>
                    <th>Education & Health Cess (4%)</th>
                    <th>Manual Tax Deductions</th>
                    <th>CSV file I-Tax</th>
                    <th>Total Tax for FY ${fiscalYear}</th>
                    <th>Monthly Tax Deduction</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach(row => {
        const regtNo = row[0];
        if (!regtNo) return;
        
        // Get tax data from calculation sheet if available
        if (taxSummary[regtNo]) {
            const empData = taxSummary[regtNo];
            
            tableHTML += `
                <tr class="data-row">
                    <td>${regtNo}</td>
                    <td>${empData.rank || ''}</td>
                    <td>${empData.name || ''}</td>
                    <td>₹${(empData.annualSalary || 0).toLocaleString()}</td>
                    <td>₹${(empData.standardDeduction || 0).toLocaleString()}</td>
                    <td>₹${(empData.additionalIncome || 0).toLocaleString()}</td>
                    <td>₹${(empData.csvRecovery || 0).toLocaleString()}</td>
                    <td>₹${(empData.manualRecoveries || 0).toLocaleString()}</td>
                    <td>₹${(empData.totalRecoveries || 0).toLocaleString()}</td>
                    <td>₹${(empData.taxableIncome || 0).toLocaleString()}</td>
                    <td>₹${(empData.tax || 0).toLocaleString()}</td>
                    <td>₹${(empData.marginalRelief || 0).toLocaleString()}</td>
                    <td>₹${(empData.netTax || 0).toLocaleString()}</td>
                    <td>₹${(empData.educationCess || 0).toLocaleString()}</td>
                    <td>₹${(empData.manualTaxDeductions || 0).toLocaleString()}</td>
                    <td>₹${(empData.csvFileTax || 0).toLocaleString()}</td>
                    <td>₹${(empData.totalTax || 0).toLocaleString()}</td>
                    <td>₹${(empData.monthlyDeduction || 0).toLocaleString()}</td>
                </tr>`;
        } else {
            // Fallback to basic display if tax summary is not available
            tableHTML += `
                <tr class="data-row">
                    <td>${regtNo}</td>
                    <td>${row[2] || ''}</td>
                    <td>${row[4] || ''}</td>
                    <td colspan="15" class="text-center">
                        <a href="calculation_sheet.html" class="btn btn-sm btn-primary">
                            Go to Calculation Sheet to generate tax data
                        </a>
                    </td>
                </tr>`;
        }
    });

    tableHTML += `
            </tbody>
        </table>`;
    
    resultDiv.innerHTML = tableHTML;
    
    // Add scrollable wrapper for horizontal scrolling
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'table-responsive';
    scrollWrapper.style.maxHeight = '600px';
    
    // Move the table inside the wrapper
    const tableElement = resultDiv.querySelector('table');
    if (tableElement) {
        resultDiv.removeChild(tableElement);
        scrollWrapper.appendChild(tableElement);
        resultDiv.appendChild(scrollWrapper);
    }
}

// Function to export data to Excel
function exportToExcel() {
    const resultDiv = document.getElementById('result');
    const table = resultDiv.querySelector('table');

    if (!table) {
        alert("No data available to export.");
        return;
    }

    const wb = XLSX.utils.table_to_book(table, { sheet: "Tax_Calculation" });
    XLSX.writeFile(wb, 'Tax_Calculation_Report.xlsx');
}

// Function to clear all data and reset form
function clearAll() {
    if (confirm("This will clear all uploaded data. Are you sure?")) {
        document.getElementById('csvFile').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('searchType').selectedIndex = 0;
        document.getElementById('result').innerHTML = '';
        csvData = [];
        uniqueData = [];
        
        // Don't clear localStorage by default
        // localStorage.removeItem('salaryData');
        // salaryDataMap = {};
    }
}

// Function to handle printing
function printResults() {
    window.print();
}

// Function to download tax information
function downloadTaxInfo() {
    if (Object.keys(salaryDataMap).length === 0) {
        alert('No data available. Please upload salary data first.');
        return;
    }

    // Get tax parameters
    const taxParams = DataManager.getTaxParameters();
    const fiscalYear = taxParams.fiscalYear || getCurrentIndianFiscalYear();

    let csvContent = `Regiment No,Name,Rank,PAN,Total Salary,Standard Deduction,Additional Taxable Income,CSV Recovery,Manual Recoveries,Total Recoveries,Taxable Income,Income Tax,Under Section 87A Rebate,Net Tax,Education & Health Cess (4%),Manual Tax Deductions,CSV file I-Tax,Total Tax for FY ${fiscalYear},Monthly Tax Deduction\n`;

    // Get tax summary data from calculation sheet
    let taxSummary = {};
    try {
        taxSummary = DataManager.getTaxSummary();
    } catch (error) {
        console.error('Error loading tax summary:', error);
        taxSummary = {};
    }

    // Process all regiment numbers from salary data
    Object.keys(salaryDataMap).forEach(regtNo => {
        const employee = salaryDataMap[regtNo];
        if (!employee || employee.length === 0) return;

        const firstEntry = employee[0].details;
        
        // Format values to avoid commas in CSV
        const formatValue = (val) => typeof val === 'number' ? val.toString() : (val || '');
        
        // If we have tax data from calculation sheet, use it
        if (taxSummary[regtNo]) {
            const empData = taxSummary[regtNo];
            
            csvContent += `${regtNo},${empData.name || ''},${empData.rank || ''},${empData.pan || ''},`;
            csvContent += `${formatValue(empData.annualSalary)},`;
            csvContent += `${formatValue(empData.standardDeduction)},`;
            csvContent += `${formatValue(empData.additionalIncome)},`;
            csvContent += `${formatValue(empData.csvRecovery)},`;
            csvContent += `${formatValue(empData.manualRecoveries)},`;
            csvContent += `${formatValue(empData.totalRecoveries)},`;
            csvContent += `${formatValue(empData.taxableIncome)},`;
            csvContent += `${formatValue(empData.tax)},`;
            csvContent += `${formatValue(empData.marginalRelief)},`;
            csvContent += `${formatValue(empData.netTax)},`;
            csvContent += `${formatValue(empData.educationCess)},`;
            csvContent += `${formatValue(empData.manualTaxDeductions)},`;
            csvContent += `${formatValue(empData.csvFileTax)},`;
            csvContent += `${formatValue(empData.totalTax)},`;
            csvContent += `${formatValue(empData.monthlyDeduction)}\n`;
        } else {
            // If no tax data, show a simpler row with just basic information
            csvContent += `${regtNo},${firstEntry.name || ''},${firstEntry.rank || ''},${firstEntry.pan || ''},`;
            csvContent += `0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n`;
        }
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
