/**
 * Bill Claims Script - Handles bill claims management for tax calculation
 */

let billClaims = [];
let currentEditIndex = -1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadBillClaims();
    renderBillClaimsTable();

    // Add event listener for regiment number input
    document.getElementById('regtNo').addEventListener('blur', function() {
        const regtNo = this.value.trim();
        if (regtNo) {
            // Get employee data from localStorage
            const salaryData = DataManager.loadSalaryData();
            if (salaryData && salaryData[regtNo] && salaryData[regtNo].length > 0) {
                const firstEntry = salaryData[regtNo][0].details;
                document.getElementById('name').value = firstEntry.name || '';
                document.getElementById('rank').value = firstEntry.rank || '';
            } else {
                // Clear name and rank if employee not found
                document.getElementById('name').value = '';
                document.getElementById('rank').value = '';
            }
        }
    });

    // Event listeners for form submission
    document.getElementById('billClaimForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (currentEditIndex >= 0) {
            updateBillClaim();
        } else {
            addBillClaim();
        }
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        renderBillClaimsTable();
    });

    // XLSX file upload handler
    document.getElementById('xlsxFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            processBillClaimsXLSX(file);
        }
    });
});

// Load bill claims from DataManager
function loadBillClaims() {
    billClaims = DataManager.loadBillClaims();
}

// Save bill claims to DataManager
function saveBillClaims() {
    DataManager.saveBillClaims(billClaims);
    
    // Clear tax summary cache since bill claims affect tax calculations
    DataManager.clearTaxSummaryCache();
}

// Add a new bill claim
function addBillClaim() {
    const claim = getFormData();
    
    if (!validateClaimData(claim)) {
        return;
    }

    billClaims.push(claim);
    saveBillClaims();
    clearForm();
    renderBillClaimsTable();
    alert('Bill claim added successfully!');
}

// Get form data
function getFormData() {
    return {
        regtNo: document.getElementById('regtNo').value.trim(),
        name: document.getElementById('name').value.trim(),
        rank: document.getElementById('rank').value.trim(),
        billType: document.getElementById('billType').value,
        amount: parseFloat(document.getElementById('amount').value) || 0,
        taxable: true, // All bill claims are taxable by default
        description: document.getElementById('description').value.trim(),
        dateAdded: new Date().toISOString()
    };
}

// Validate claim data
function validateClaimData(claim) {
    if (!claim.regtNo) {
        alert('Please enter a Regiment Number');
        return false;
    }
    
    if (!claim.name) {
        alert('Please enter a Name');
        return false;
    }
    
    if (!claim.billType) {
        alert('Please select a Bill Type');
        return false;
    }
    
    if (claim.amount <= 0) {
        alert('Please enter a valid amount (greater than 0)');
        return false;
    }
    
    return true;
}

// Clear the form
function clearForm() {
    document.getElementById('billClaimForm').reset();
    currentEditIndex = -1;
    document.getElementById('submitBtn').textContent = 'Add Claim';
}

// Update an existing bill claim
function updateBillClaim() {
    const claim = getFormData();
    
    if (!validateClaimData(claim)) {
        return;
    }

    if (currentEditIndex >= 0 && currentEditIndex < billClaims.length) {
        billClaims[currentEditIndex] = claim;
        saveBillClaims();
        renderBillClaimsTable();
        clearForm();
        currentEditIndex = -1;
        document.getElementById('submitBtn').textContent = 'Add Claim';
        alert('Bill claim updated successfully!');
    }
}

// Delete a bill claim
function deleteBillClaim(index) {
    if (confirm('Are you sure you want to delete this bill claim?')) {
        billClaims.splice(index, 1);
        saveBillClaims();
        renderBillClaimsTable();

        if (currentEditIndex === index) {
            clearForm();
            currentEditIndex = -1;
            document.getElementById('submitBtn').textContent = 'Add Claim';
        } else if (currentEditIndex > index) {
            currentEditIndex--;
        }
    }
}

// Edit a bill claim
function editBillClaim(index) {
    if (index >= 0 && index < billClaims.length) {
        currentEditIndex = index;
        const claim = billClaims[index];

        document.getElementById('regtNo').value = claim.regtNo;
        document.getElementById('name').value = claim.name;
        document.getElementById('rank').value = claim.rank;
        document.getElementById('billType').value = claim.billType;
        document.getElementById('amount').value = claim.amount;
        document.getElementById('taxable').checked = claim.taxable;
        document.getElementById('description').value = claim.description;

        document.getElementById('submitBtn').textContent = 'Update Claim';
        document.getElementById('billClaimForm').scrollIntoView({ behavior: 'smooth' });
    }
}

// Render the bill claims table
function renderBillClaimsTable() {
    const tableBody = document.getElementById('billClaimsTableBody');
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    tableBody.innerHTML = '';

    const filteredClaims = billClaims.filter(claim => 
        claim.regtNo.toLowerCase().includes(searchText) ||
        claim.name.toLowerCase().includes(searchText) ||
        (claim.billType && claim.billType.toLowerCase().includes(searchText))
    );

    if (filteredClaims.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No bill claims found</td></tr>';
        updateTotalAmount([]);
        return;
    }

    filteredClaims.forEach((claim, index) => {
        const originalIndex = billClaims.indexOf(claim);
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${claim.regtNo}</td>
            <td>${claim.name}</td>
            <td>${claim.rank}</td>
            <td>${claim.billType}</td>
            <td>${formatCurrency(claim.amount)}</td>
            <td>${claim.taxable ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn-edit" onclick="editBillClaim(${originalIndex})">Edit</button>
                <button class="btn-delete" onclick="deleteBillClaim(${originalIndex})">Delete</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    updateTotalAmount(filteredClaims);
}

// Update the total amount display
function updateTotalAmount(claims) {
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const totalTaxable = claims.reduce((sum, claim) => claim.taxable ? sum + claim.amount : sum, 0);

    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('totalTaxable').textContent = formatCurrency(totalTaxable);
}

// Process XLSX file
function processBillClaimsXLSX(file) {
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
            const newClaims = [];
            
            xlsxData.slice(1).forEach(row => {
                if (!row || row.length < 6) return; // Ensure row has at least 6 columns
                
                newClaims.push({
                    regtNo: String(row[0] || '').trim(),
                    name: String(row[1] || '').trim(),
                    rank: String(row[2] || '').trim(),
                    billType: String(row[3] || '').trim(),
                    amount: safeParseNumber(row[4]),
                    taxable: true, // All bills are taxable by default
                    description: String(row[6] || '').trim(),
                    dateAdded: new Date().toISOString()
                });
            });
            
            // Filter out invalid entries
            const validClaims = newClaims.filter(claim => 
                claim.regtNo && claim.name && claim.amount > 0
            );
            
            if (validClaims.length === 0) {
                alert('No valid bill claims found in the XLSX file');
                return;
            }
            
            // Ask user to append or replace
            const action = confirm(
                `Found ${validClaims.length} valid bill claims.\n\n` +
                'Click OK to append to existing claims, or Cancel to replace all existing claims.'
            );
            
            if (action) {
                // Append
                billClaims = [...billClaims, ...validClaims];
            } else {
                // Replace
                billClaims = validClaims;
            }
            
            saveBillClaims();
            renderBillClaimsTable();
            alert(`Successfully imported ${validClaims.length} bill claims.`);
            document.getElementById('xlsxFile').value = '';
            
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

// Export bill claims to CSV
function exportToCSV() {
    if (billClaims.length === 0) {
        alert('No bill claims to export');
        return;
    }

    let csvContent = "Regiment No,Name,Rank,Bill Type,Amount,Taxable,Description\n";

    billClaims.forEach(claim => {
        csvContent += `"${claim.regtNo}","${claim.name}","${claim.rank}","${claim.billType}",${claim.amount},${claim.taxable ? 'Yes' : 'No'},"${claim.description}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bill_claims.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Print claims
function printClaims() {
    window.print();
}
