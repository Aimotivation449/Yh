/**
 * Tax Certificate Generator - Handles generation of tax certificates in PDF format
 */

/**
 * Generate a tax certificate PDF for a specific employee
 * @param {string} regtNo - Regiment number of the employee
 * @param {string} financialYear - Financial year for the certificate
 */
function generateTaxCertificate(regtNo, financialYear = null) {
    try {
        // Get the employee data
        const salaryData = DataManager.loadSalaryData();
        
        if (!salaryData || Object.keys(salaryData).length === 0) {
            alert('No salary data found. Please upload salary data first on the home page.');
            return;
        }
        
        if (!salaryData[regtNo]) {
            alert('No salary data found for regiment number: ' + regtNo);
            return;
        }

        // Get employee's data
        const employeeData = salaryData[regtNo];
        
        // Get the financial year
        if (!financialYear) {
            const taxParams = DataManager.getTaxParameters();
            financialYear = taxParams.fiscalYear || getCurrentIndianFiscalYear();
        }
        
        // Get organization details
        const orgDetails = DataManager.getOrganizationDetails() || {
            name: '75BN BSF',
            department: 'Accounts Department',
            contactPerson: 'Accounts Officer'
        };
        
        // Retirement date
        const retirementDate = DataManager.getRetirementDate(regtNo);
        
        // Get extended data for 12 months
        const extendedData = extendTo12Months(employeeData, retirementDate);
        
        // Get first month's details for employee info
        const firstMonth = employeeData[0].details;
        
        // Get bill claims for this employee
        const billClaims = DataManager.loadBillClaims().filter(claim => claim.regtNo === regtNo);
        
        // Get manual recoveries (new system)
        const manualRecoveries = DataManager.loadManualRecoveries().filter(recovery => recovery.regtNo === regtNo);
        
        // Get manual tax deductions
        const taxDeductions = DataManager.loadTaxDeductions().filter(deduction => deduction.regtNo === regtNo);
        
        // Calculate totals from extended data
        const annualSalary = extendedData.reduce((sum, entry) => sum + entry.details.total, 0);
        
        // Get CSV file recoveries and tax deductions
        const csvRecovery = extendedData.reduce((sum, entry) => sum + (entry.details.recovery || 0), 0);
        const csvFileTax = extendedData.reduce((sum, entry) => sum + (entry.details.tax || 0), 0);
        
        // Calculate additional income from bill claims
        const additionalIncome = billClaims
            .filter(claim => claim.billType !== 'Recovery' && claim.billType !== 'Tax Deduction' && claim.taxable)
            .reduce((sum, claim) => sum + claim.amount, 0);
        
        // Get manual recoveries amount
        const manualRecoveriesAmount = manualRecoveries.reduce((sum, recovery) => sum + recovery.amount, 0);
        
        // Get legacy recoveries from bill claims
        const legacyRecoveries = billClaims
            .filter(claim => claim.billType === 'Recovery')
            .reduce((sum, claim) => sum + claim.amount, 0);
        
        // Total manual recoveries
        const totalManualRecoveries = manualRecoveriesAmount + legacyRecoveries;
        
        // Total recoveries
        const totalRecoveries = totalManualRecoveries + csvRecovery;
        
        // Get manual tax deductions
        const manualTaxDeductions = billClaims
            .filter(claim => claim.billType === 'Tax Deduction')
            .reduce((sum, claim) => sum + claim.amount, 0) + 
            taxDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        
        // Get tax parameters
        const taxParams = DataManager.getTaxParameters();
        const standardDeduction = taxParams.standardDeduction || 75000;
        const educationCessRate = taxParams.educationCess || 4;
        
        // Calculate taxable income
        const taxableIncome = Math.max(0, annualSalary + additionalIncome - totalRecoveries - standardDeduction);
        
        // Calculate tax
        const tax = calculateTax(taxableIncome);
        const marginalRelief = calculateMarginalRelief(taxableIncome, tax);
        const netTax = tax - marginalRelief;
        const educationCess = Math.round(netTax * (educationCessRate / 100));
        
        // Total tax after deductions
        const totalTax = Math.max(0, netTax + educationCess - manualTaxDeductions - csvFileTax);
        
        // Create the certificate content
        createTaxCertificatePDF(
            regtNo,
            firstMonth,
            financialYear,
            orgDetails,
            {
                annualSalary,
                additionalIncome,
                csvRecovery,
                manualRecoveriesAmount,
                legacyRecoveries,
                totalRecoveries,
                standardDeduction,
                taxableIncome,
                tax,
                marginalRelief,
                netTax,
                educationCess,
                csvFileTax,
                manualTaxDeductions,
                totalTax
            },
            billClaims,
            taxDeductions,
            manualRecoveries
        );
    } catch (error) {
        console.error('Error generating tax certificate:', error);
        alert('An error occurred while generating the tax certificate. Please try again.');
    }
}

/**
 * Create the actual PDF certificate
 * @param {string} regtNo - Regiment number
 * @param {Object} employeeData - Employee data (from first month)
 * @param {string} financialYear - Financial year
 * @param {Object} orgDetails - Organization details
 * @param {Object} financialData - Financial calculations
 * @param {Array} claims - Bill claims
 * @param {Array} deductions - Manual tax deductions
 * @param {Array} manualRecoveries - Manual recoveries
 */
function createTaxCertificatePDF(
    regtNo,
    employeeData,
    financialYear,
    orgDetails,
    financialData,
    claims,
    deductions,
    manualRecoveries = []
) {
    // Create a container for the certificate preview
    const previewContainer = document.createElement('div');
    previewContainer.id = 'certificate-preview';
    previewContainer.style.position = 'fixed';
    previewContainer.style.top = '0';
    previewContainer.style.left = '0';
    previewContainer.style.width = '100%';
    previewContainer.style.height = '100%';
    previewContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    previewContainer.style.zIndex = '9999';
    previewContainer.style.display = 'flex';
    previewContainer.style.justifyContent = 'center';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.padding = '20px';
    
    // Create the certificate container
    const certificateContainer = document.createElement('div');
    certificateContainer.style.backgroundColor = 'white';
    certificateContainer.style.padding = '40px';
    certificateContainer.style.borderRadius = '8px';
    certificateContainer.style.maxWidth = '800px';
    certificateContainer.style.maxHeight = '80vh';
    certificateContainer.style.overflow = 'auto';
    certificateContainer.style.position = 'relative';
    certificateContainer.id = 'certificate-content';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'btn btn-secondary';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.onclick = function() {
        document.body.removeChild(previewContainer);
    };
    
    // Create download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download PDF';
    downloadButton.className = 'btn btn-primary';
    downloadButton.style.position = 'absolute';
    downloadButton.style.top = '10px';
    downloadButton.style.right = '100px';
    downloadButton.onclick = function() {
        downloadPDF();
    };
    
    // Add buttons to certificate container
    certificateContainer.appendChild(closeButton);
    certificateContainer.appendChild(downloadButton);
    
    // Get tax period
    const [startYear, endYear] = financialYear.split('-');
    const taxPeriod = `April 1, ${startYear} to March 31, ${endYear}`;
    
    // Create certificate content
    const certificateContent = document.createElement('div');
    certificateContent.className = 'p-3'; // Add padding for better styling
    certificateContent.innerHTML = `
        <div class="text-center mb-4">
            <h3 class="mb-1">${orgDetails.name || 'Border Security Force'}</h3>
            <h4 class="mb-3">${orgDetails.department || 'Accounts Department'}</h4>
            <h2 class="mb-2">Income Tax Certificate</h2>
            <h5 class="mb-4">Financial Year: ${financialYear}</h5>
        </div>
        
        <div class="mb-4">
            <h5>Employee Details</h5>
            <table class="table table-bordered">
                <tr>
                    <th style="width: 25%">Regiment Number</th>
                    <td style="width: 25%">${regtNo}</td>
                    <th style="width: 25%">Name</th>
                    <td style="width: 25%">${employeeData.name || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Rank/Designation</th>
                    <td>${employeeData.rank || employeeData.designation || 'N/A'}</td>
                    <th>Department</th>
                    <td>${employeeData.department || 'BSF'}</td>
                </tr>
                <tr>
                    <th>PAN Number</th>
                    <td>${employeeData.pan || 'N/A'}</td>
                    <th>Tax Period</th>
                    <td>${taxPeriod}</td>
                </tr>
            </table>
        </div>
        
        <div class="mb-4">
            <h5>Income Details</h5>
            <table class="table table-bordered">
                <tr>
                    <th style="width: 70%">Annual Salary (Gross)</th>
                    <td style="width: 30%">${formatCurrencyForPDF(financialData.annualSalary)}</td>
                </tr>
                ${financialData.additionalIncome > 0 ? `
                <tr>
                    <th>Additional Taxable Income (Bill Claims)</th>
                    <td>${formatCurrencyForPDF(financialData.additionalIncome)}</td>
                </tr>` : ''}
                <tr>
                    <th>Standard Deduction</th>
                    <td>${formatCurrencyForPDF(financialData.standardDeduction)}</td>
                </tr>
                ${financialData.totalRecoveries > 0 ? `
                <tr>
                    <th>Total Recoveries</th>
                    <td>${formatCurrencyForPDF(financialData.totalRecoveries)}</td>
                </tr>` : ''}
                <tr>
                    <th>Net Taxable Income</th>
                    <td class="fw-bold">${formatCurrencyForPDF(financialData.taxableIncome)}</td>
                </tr>
            </table>
        </div>
        
        <div class="mb-4">
            <h5>Tax Calculation</h5>
            <table class="table table-bordered">
                <tr>
                    <th style="width: 70%">Income Tax (Before Relief)</th>
                    <td style="width: 30%">${formatCurrencyForPDF(financialData.tax)}</td>
                </tr>
                ${financialData.marginalRelief > 0 ? `
                <tr>
                    <th>Under Section 87A Rebate</th>
                    <td>${formatCurrencyForPDF(financialData.marginalRelief)}</td>
                </tr>` : ''}
                <tr>
                    <th>Income Tax (After Relief)</th>
                    <td>${formatCurrencyForPDF(financialData.netTax)}</td>
                </tr>
                <tr>
                    <th>Education & Health Cess (4%)</th>
                    <td>${formatCurrencyForPDF(financialData.educationCess)}</td>
                </tr>
                ${(financialData.csvFileTax > 0 || financialData.manualTaxDeductions > 0) ? `
                <tr>
                    <th>Tax Deductions Already Made</th>
                    <td>${formatCurrencyForPDF(financialData.csvFileTax + financialData.manualTaxDeductions)}</td>
                </tr>` : ''}
                <tr>
                    <th>Total Tax Payable</th>
                    <td class="fw-bold">${formatCurrencyForPDF(financialData.totalTax)}</td>
                </tr>
            </table>
        </div>
        
        ${manualRecoveries.length > 0 ? `
        <div class="mb-4">
            <h5>Manual Recoveries</h5>
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Recovery Type</th>
                        <th>Amount</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${manualRecoveries.map(recovery => `
                    <tr>
                        <td>${recovery.date ? new Date(recovery.date).toLocaleDateString() : 'N/A'}</td>
                        <td>${recovery.recoveryType || 'N/A'}</td>
                        <td>${formatCurrencyForPDF(recovery.amount)}</td>
                        <td>${recovery.description || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        ${claims.filter(c => c.billType === 'Recovery').length > 0 ? `
        <div class="mb-4">
            <h5>Legacy Recoveries (Bill Claims)</h5>
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Bill No.</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${claims.filter(c => c.billType === 'Recovery').map(claim => `
                    <tr>
                        <td>${claim.billNo || 'N/A'}</td>
                        <td>${claim.billDate ? new Date(claim.billDate).toLocaleDateString() : 'N/A'}</td>
                        <td>${formatCurrencyForPDF(claim.amount)}</td>
                        <td>${claim.description || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        ${claims.filter(c => c.billType !== 'Recovery' && c.billType !== 'Tax Deduction' && c.taxable).length > 0 ? `
        <div class="mb-4">
            <h5>Taxable Bill Claims</h5>
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Bill No.</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${claims.filter(c => c.billType !== 'Recovery' && c.billType !== 'Tax Deduction' && c.taxable).map(claim => `
                    <tr>
                        <td>${claim.billNo || 'N/A'}</td>
                        <td>${claim.billDate ? new Date(claim.billDate).toLocaleDateString() : 'N/A'}</td>
                        <td>${claim.billType || 'N/A'}</td>
                        <td>${formatCurrencyForPDF(claim.amount)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        ${deductions.length > 0 || claims.filter(c => c.billType === 'Tax Deduction').length > 0 ? `
        <div class="mb-4">
            <h5>Tax Deductions</h5>
            <table class="table table-bordered table-sm">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${deductions.map(deduction => `
                    <tr>
                        <td>${deduction.date ? new Date(deduction.date).toLocaleDateString() : 'N/A'}</td>
                        <td>${deduction.description || 'Manual Tax Deduction'}</td>
                        <td>${formatCurrencyForPDF(deduction.amount)}</td>
                    </tr>
                    `).join('')}
                    ${claims.filter(c => c.billType === 'Tax Deduction').map(claim => `
                    <tr>
                        <td>${claim.billDate ? new Date(claim.billDate).toLocaleDateString() : 'N/A'}</td>
                        <td>${claim.description || 'Legacy Tax Deduction'}</td>
                        <td>${formatCurrencyForPDF(claim.amount)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="mt-5 mb-5">
            <div class="row">
                <div class="col-md-6">
                    <p>Date: ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="col-md-6 text-end">
                    <p>Authorized Signature</p>
                    <br>
                    <br>
                    <p>${orgDetails.contactPerson || 'Accounts Officer'}</p>
                </div>
            </div>
        </div>
        
        <div class="mt-3 text-center small">
            <p>This is a computer-generated certificate and does not require a physical signature.</p>
        </div>
    `;
    
    // Add certificate content to container
    certificateContainer.appendChild(certificateContent);
    
    // Add container to preview
    previewContainer.appendChild(certificateContainer);
    
    // Add preview to body
    document.body.appendChild(previewContainer);
    
    // Function to download PDF
    function downloadPDF() {
        // Check if required libraries are loaded
        if (typeof html2canvas === 'undefined') {
            alert('PDF generation library (html2canvas) not loaded. Please make sure you have internet connection to load the required libraries.');
            return;
        }
        
        if (typeof jsPDF === 'undefined') {
            alert('PDF generation library (jsPDF) not loaded. Please make sure you have internet connection to load the required libraries.');
            return;
        }
        
        // Show loading message
        const loadingMsg = document.createElement('div');
        loadingMsg.textContent = 'Generating PDF, please wait...';
        loadingMsg.style.position = 'absolute';
        loadingMsg.style.top = '50%';
        loadingMsg.style.left = '0';
        loadingMsg.style.width = '100%';
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.backgroundColor = 'rgba(255,255,255,0.8)';
        loadingMsg.style.padding = '20px';
        loadingMsg.style.zIndex = '10000';
        certificateContainer.appendChild(loadingMsg);
        
        try {
            // Use html2canvas and jsPDF to generate PDF
            setTimeout(() => {
                const element = document.getElementById('certificate-content');
                
                // Remove buttons from the content before converting to PDF
                const closeBtn = element.querySelector('button:first-child');
                const downloadBtn = element.querySelector('button:nth-child(2)');
                const tempCloseBtn = closeBtn.cloneNode(true);
                const tempDownloadBtn = downloadBtn.cloneNode(true);
                
                element.removeChild(closeBtn);
                element.removeChild(downloadBtn);
                
                html2canvas(element, {
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                }).then(canvas => {
                    try {
                        const imgData = canvas.toDataURL('image/png');
                        
                        // Create PDF using jsPDF
                        const { jsPDF } = window.jspdf;
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const imgWidth = 210; // A4 width in mm
                        const imgHeight = canvas.height * imgWidth / canvas.width;
                        
                        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                        pdf.save(`Tax_Certificate_${regtNo}_${financialYear}.pdf`);
                        
                        // Add back the buttons
                        element.insertBefore(tempDownloadBtn, element.firstChild);
                        element.insertBefore(tempCloseBtn, element.firstChild);
                        
                        // Remove loading message
                        element.removeChild(loadingMsg);
                    } catch (error) {
                        console.error('Error creating PDF:', error);
                        alert('Error creating PDF. Please try again.');
                        
                        // Add back the buttons
                        element.insertBefore(tempDownloadBtn, element.firstChild);
                        element.insertBefore(tempCloseBtn, element.firstChild);
                        
                        // Remove loading message
                        element.removeChild(loadingMsg);
                    }
                }).catch(err => {
                    console.error('Error generating canvas:', err);
                    alert('Error generating certificate image. Please try again.');
                    
                    // Add back the buttons
                    element.insertBefore(tempDownloadBtn, element.firstChild);
                    element.insertBefore(tempCloseBtn, element.firstChild);
                    
                    // Remove loading message
                    element.removeChild(loadingMsg);
                });
            }, 500);
        } catch (error) {
            console.error('Error in PDF generation:', error);
            alert('Error in PDF generation. Please try again.');
            
            // Remove loading message
            if (certificateContainer.contains(loadingMsg)) {
                certificateContainer.removeChild(loadingMsg);
            }
        }
    }
}

/**
 * Convert a numeric value to currency format optimized for PDF display
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
function formatCurrencyForPDF(value) {
    if (value === undefined || value === null) return '₹0.00';
    
    // Format with Indian numbering system (lakh, crore)
    const formatter = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return '₹' + formatter.format(Number(value) || 0);
}

/**
 * Generate tax certificates for multiple employees
 * @param {Array} employees - Array of regiment numbers
 * @param {string} financialYear - Financial year for the certificate
 * @returns {Promise} - Promise that resolves when all certificates are generated
 */
function generateBatchCertificates(employees, financialYear) {
    return new Promise((resolve, reject) => {
        if (!employees || employees.length === 0) {
            reject(new Error('No employees specified'));
            return;
        }
        
        // Get the salary data
        const salaryData = DataManager.loadSalaryData();
        if (!salaryData || Object.keys(salaryData).length === 0) {
            reject(new Error('No salary data found'));
            return;
        }
        
        // Keep track of progress
        let processed = 0;
        let successful = 0;
        let failed = 0;
        const results = [];
        
        // Process certificates one by one
        function processNext() {
            if (processed < employees.length) {
                const regtNo = employees[processed];
                
                try {
                    // Check if employee data exists
                    if (salaryData[regtNo]) {
                        // Generate certificate
                        generateTaxCertificate(regtNo, financialYear);
                        results.push({ regtNo, success: true });
                        successful++;
                    } else {
                        results.push({ 
                            regtNo, 
                            success: false, 
                            error: 'No data found for regiment number: ' + regtNo 
                        });
                        failed++;
                    }
                } catch (error) {
                    results.push({ 
                        regtNo, 
                        success: false, 
                        error: error.message || 'Unknown error' 
                    });
                    failed++;
                }
                
                processed++;
                
                // Process next employee after a delay
                setTimeout(processNext, 1000);
            } else {
                // All employees processed
                resolve({
                    total: employees.length,
                    successful,
                    failed,
                    results
                });
            }
        }
        
        // Start processing
        processNext();
    });
}