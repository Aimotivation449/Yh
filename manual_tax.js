/**
 * Manual Tax Deductions Script - Manages manual tax deductions
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTaxDeductions();
    
    // Check if regiment number is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const regtNoParam = urlParams.get('regtNo');
    
    if (regtNoParam) {
        const regtNoInput = document.getElementById('regtNo');
        regtNoInput.value = regtNoParam;
        
        // Fetch employee details if available
        const salaryData = DataManager.loadSalaryData();
        if (salaryData && salaryData[regtNoParam] && salaryData[regtNoParam].length > 0) {
            // Focus on tax month dropdown
            setTimeout(() => {
                document.getElementById('taxMonth').focus();
            }, 100);
        }
    }
    
    document.getElementById('taxForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addTaxDeduction();
    });
    
    document.getElementById('searchInput').addEventListener('input', function() {
        loadTaxDeductions();
    });
});

// Load tax deductions from localStorage
function loadTaxDeductions() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    let taxDeductions = DataManager.loadTaxDeductions();
    
    const filteredDeductions = searchInput ? 
        taxDeductions.filter(d => d.regtNo.toLowerCase().includes(searchInput)) : 
        taxDeductions;

    const listContainer = document.getElementById('taxDeductionsList');
    
    if (filteredDeductions.length === 0) {
        listContainer.innerHTML = '<p class="text-center">No tax deductions found.</p>';
        return;
    }

    let html = `
        <table class="table table-striped table-hover">
            <thead class="table-dark">
                <tr>
                    <th>Regt. No.</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Other Employer</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredDeductions.forEach((deduction, index) => {
        const originalIndex = taxDeductions.indexOf(deduction);
        const dateAdded = new Date(deduction.date);
        const formattedDate = isNaN(dateAdded.getTime()) ? 'N/A' : dateAdded.toLocaleDateString();
        
        html += `
            <tr>
                <td>${deduction.regtNo}</td>
                <td>${deduction.month}</td>
                <td>${formatCurrency(deduction.amount)}</td>
                <td>${deduction.employerName || '-'}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="btn-delete" onclick="deleteTaxDeduction(${originalIndex})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    listContainer.innerHTML = html;
}

// Add a new tax deduction
function addTaxDeduction() {
    const regtNo = document.getElementById('regtNo').value.trim();
    const month = document.getElementById('taxMonth').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const employerName = document.getElementById('employerName').value.trim();
    
    if (!regtNo) {
        alert('Please enter a Regiment Number');
        return;
    }
    
    if (!month) {
        alert('Please select a Month');
        return;
    }
    
    if (amount <= 0) {
        alert('Please enter a valid amount (greater than 0)');
        return;
    }
    
    const taxDeduction = {
        regtNo: regtNo,
        month: month,
        amount: amount,
        employerName: employerName,
        date: new Date().toISOString().split('T')[0]
    };

    let taxDeductions = DataManager.loadTaxDeductions();
    taxDeductions.push(taxDeduction);
    DataManager.saveTaxDeductions(taxDeductions);
    
    // Clear tax summary cache since tax deductions affect tax calculations
    DataManager.clearTaxSummaryCache();

    clearForm();
    loadTaxDeductions();
    
    // Tax deductions are now kept separate from bill claims
    
    alert('Tax deduction added successfully!');
}

// Delete a tax deduction
function deleteTaxDeduction(index) {
    if (!confirm('Are you sure you want to delete this tax deduction?')) return;

    let taxDeductions = DataManager.loadTaxDeductions();
    
    if (index >= 0 && index < taxDeductions.length) {
        // Get deduction info before deleting
        const deduction = taxDeductions[index];
        
        // Delete from tax deductions
        taxDeductions.splice(index, 1);
        DataManager.saveTaxDeductions(taxDeductions);
        
        // Clear tax summary cache since tax deductions affect tax calculations
        DataManager.clearTaxSummaryCache();
        
        // Tax deductions are now kept separate from bill claims
        
        loadTaxDeductions();
    }
}

// Clear the form
function clearForm() {
    document.getElementById('taxForm').reset();
}

// Process XLSX file
function processTaxXLSX() {
    const fileInput = document.getElementById('taxFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select an XLSX file to upload.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            
            // Convert to array of arrays
            const xlsxData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Skip header row and process data
            let taxDeductions = DataManager.loadTaxDeductions();
            let newDeductions = 0;
            
            xlsxData.slice(1).forEach(row => {
                if (!row || row.length < 3) return; // Ensure row has at least 3 columns
                
                const regtNo = String(row[0] || '').trim();
                const month = String(row[1] || '').trim();
                const amount = safeParseNumber(row[2]);
                const employerName = row.length > 3 ? String(row[3] || '').trim() : '';
                
                if (!regtNo || !month || amount <= 0) return; // Skip invalid rows
                
                // Add to tax deductions only (no longer adding to bill claims)
                taxDeductions.push({
                    regtNo: regtNo,
                    month: month,
                    amount: amount,
                    employerName: employerName,
                    date: new Date().toISOString().split('T')[0]
                });
                
                newDeductions++;
            });
            
            if (newDeductions === 0) {
                alert('No valid tax deductions found in the XLSX file');
                return;
            }
            
            DataManager.saveTaxDeductions(taxDeductions);
            
            // Clear tax summary cache since tax deductions affect tax calculations
            DataManager.clearTaxSummaryCache();
            
            loadTaxDeductions();
            fileInput.value = '';
            
            alert(`Successfully imported ${newDeductions} tax deductions.`);
            
        } catch (error) {
            console.error('Error processing XLSX:', error);
            alert('Error processing XLSX file. Please check the format and try again.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsArrayBuffer(file);
}

// Export tax deductions to Excel
function exportToExcel() {
    let taxDeductions = DataManager.loadTaxDeductions();
    
    if (taxDeductions.length === 0) {
        alert('No tax deductions to export');
        return;
    }
    
    const rows = taxDeductions.map(d => ({
        'Regiment No': d.regtNo,
        'Month': d.month,
        'Amount': d.amount,
        'Other Employer': d.employerName || '',
        'Date Added': d.date
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Deductions');
    XLSX.writeFile(workbook, 'Tax_Deductions_Report.xlsx');
}

// Print deductions
function printDeductions() {
    window.print();
}
