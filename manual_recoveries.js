/**
 * Manual Recoveries Script - Handles manual recovery entries
 */

let currentEditIndex = -1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadRecoveries();
    
    // Check if regiment number is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const regtNoParam = urlParams.get('regtNo');
    
    if (regtNoParam) {
        const regtNoInput = document.getElementById('regtNo');
        regtNoInput.value = regtNoParam;
        // Trigger the blur event to populate name and rank
        regtNoInput.dispatchEvent(new Event('blur'));
        
        // Focus on recovery type dropdown
        setTimeout(() => {
            document.getElementById('recoveryType').focus();
        }, 100);
    }
    
    document.getElementById('recoveryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (currentEditIndex >= 0) {
            updateRecovery();
        } else {
            addRecovery();
        }
    });
    
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
    
    document.getElementById('searchInput').addEventListener('input', function() {
        loadRecoveries();
    });
});

// Load recoveries from localStorage
function loadRecoveries() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    // Get recoveries from their own storage
    let recoveries = DataManager.loadManualRecoveries();
    
    // Filter by regiment number if search input is provided
    if (searchInput) {
        recoveries = recoveries.filter(recovery => 
            recovery.regtNo.toLowerCase().includes(searchInput));
    }
    
    displayRecoveries(recoveries);
}

// Display recoveries in the table
function displayRecoveries(recoveries) {
    const tableBody = document.getElementById('recoveriesTableBody');
    const totalElement = document.getElementById('totalRecoveries');
    
    tableBody.innerHTML = '';
    
    if (recoveries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No recoveries found</td></tr>';
        totalElement.textContent = formatCurrency(0);
        return;
    }
    
    let totalAmount = 0;
    
    recoveries.forEach((recovery, index) => {
        totalAmount += recovery.amount;
        
        const dateAdded = new Date(recovery.dateAdded);
        const formattedDate = isNaN(dateAdded.getTime()) 
            ? 'N/A' 
            : dateAdded.toLocaleDateString();
        
        // Get recovery type and description based on new or legacy format
        let recoveryType = recovery.recoveryType || "Recovery";
        let description = recovery.description || "";
        
        // For compatibility with legacy data
        if (!recovery.recoveryType && description.includes(' - ')) {
            const parts = description.split(' - ');
            recoveryType = parts[0];
            description = parts.slice(1).join(' - ');
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${recovery.regtNo}</td>
            <td>${recovery.name}</td>
            <td>${recovery.rank}</td>
            <td>${recoveryType}</td>
            <td>${formatCurrency(recovery.amount)}</td>
            <td>${description || '-'}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn-edit" onclick="editRecovery(${index})">Edit</button>
                <button class="btn-delete" onclick="deleteRecovery(${index})">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    totalElement.textContent = formatCurrency(totalAmount);
}

// Add a new recovery
function addRecovery() {
    const regtNo = document.getElementById('regtNo').value.trim();
    const name = document.getElementById('name').value.trim();
    const rank = document.getElementById('rank').value.trim();
    const recoveryType = document.getElementById('recoveryType').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const description = document.getElementById('description').value.trim();
    
    if (!regtNo) {
        alert('Please enter a Regiment Number');
        return;
    }
    
    if (!recoveryType) {
        alert('Please select a Recovery Type');
        return;
    }
    
    if (amount <= 0) {
        alert('Please enter a valid amount (greater than 0)');
        return;
    }
    
    // Create recovery entry
    const recovery = {
        regtNo: regtNo,
        name: name,
        rank: rank,
        recoveryType: recoveryType,
        amount: amount,
        description: description,
        dateAdded: new Date().toISOString()
    };
    
    // Add to manual recoveries
    let recoveries = DataManager.loadManualRecoveries();
    recoveries.push(recovery);
    DataManager.saveManualRecoveries(recoveries);
    
    // Clear tax summary cache since recoveries affect tax calculations
    DataManager.clearTaxSummaryCache();
    
    clearForm();
    loadRecoveries();
    alert('Recovery added successfully!');
}

// Update an existing recovery
function updateRecovery() {
    const recoveries = DataManager.loadManualRecoveries();
    
    if (currentEditIndex < 0 || currentEditIndex >= recoveries.length) {
        alert('Invalid recovery selection');
        return;
    }
    
    const originalRecovery = recoveries[currentEditIndex];
    
    const regtNo = document.getElementById('regtNo').value.trim();
    const name = document.getElementById('name').value.trim();
    const rank = document.getElementById('rank').value.trim();
    const recoveryType = document.getElementById('recoveryType').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const description = document.getElementById('description').value.trim();
    
    if (!regtNo || !recoveryType || amount <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Update the recovery
    recoveries[currentEditIndex] = {
        regtNo: regtNo,
        name: name,
        rank: rank,
        recoveryType: recoveryType,
        amount: amount,
        description: description,
        dateAdded: originalRecovery.dateAdded // Keep original date
    };
    
    DataManager.saveManualRecoveries(recoveries);
    
    // Clear tax summary cache since recoveries affect tax calculations
    DataManager.clearTaxSummaryCache();
    
    clearForm();
    loadRecoveries();
    alert('Recovery updated successfully!');
}

// Edit a recovery entry
function editRecovery(index) {
    const recoveries = DataManager.loadManualRecoveries();
    
    if (index < 0 || index >= recoveries.length) {
        alert('Invalid recovery selection');
        return;
    }
    
    currentEditIndex = index;
    const recovery = recoveries[index];
    
    document.getElementById('regtNo').value = recovery.regtNo;
    document.getElementById('name').value = recovery.name;
    document.getElementById('rank').value = recovery.rank;
    document.getElementById('amount').value = recovery.amount;
    
    // Check if we're using new format or old format
    let recoveryType = recovery.recoveryType || "Miscellaneous Recovery";
    let description = recovery.description || "";
    
    // Handle legacy format (bill claims with "Recovery" type)
    if (!recovery.recoveryType && recovery.description) {
        const parts = recovery.description.split(' - ');
        if (parts.length > 1) {
            recoveryType = parts[0];
            description = parts.slice(1).join(' - ');
        }
    }
    
    // Set recovery type or default to Miscellaneous if not found
    const typeSelect = document.getElementById('recoveryType');
    let typeFound = false;
    
    Array.from(typeSelect.options).forEach(option => {
        if (option.value === recoveryType) {
            option.selected = true;
            typeFound = true;
        } else {
            option.selected = false;
        }
    });
    
    if (!typeFound && recoveryType) {
        // If type not in dropdown, add it
        const option = document.createElement('option');
        option.value = recoveryType;
        option.textContent = recoveryType;
        option.selected = true;
        typeSelect.appendChild(option);
    }
    
    document.getElementById('description').value = description;
    document.getElementById('submitBtn').textContent = 'Update Recovery';
}

// Delete a recovery entry
function deleteRecovery(index) {
    if (!confirm('Are you sure you want to delete this recovery entry?')) {
        return;
    }
    
    const recoveries = DataManager.loadManualRecoveries();
    
    if (index < 0 || index >= recoveries.length) {
        alert('Invalid recovery selection');
        return;
    }
    
    // Remove the recovery from the array
    recoveries.splice(index, 1);
    DataManager.saveManualRecoveries(recoveries);
    
    // Clear tax summary cache since recoveries affect tax calculations
    DataManager.clearTaxSummaryCache();
    
    // Reset current edit index if needed
    if (currentEditIndex === index) {
        clearForm();
    } else if (currentEditIndex > index) {
        currentEditIndex--;
    }
    
    loadRecoveries();
}

// Clear the form
function clearForm() {
    document.getElementById('recoveryForm').reset();
    currentEditIndex = -1;
    document.getElementById('submitBtn').textContent = 'Add Recovery';
}

// Export recoveries to Excel
function exportToExcel() {
    const recoveries = DataManager.loadManualRecoveries();
    
    if (recoveries.length === 0) {
        alert('No recoveries to export');
        return;
    }
    
    const rows = recoveries.map(recovery => {
        // Get recovery type from either the new property or extract from description
        let recoveryType = recovery.recoveryType || "Recovery";
        let description = recovery.description || "";
        
        // For compatibility with legacy data
        if (!recovery.recoveryType && description.includes(' - ')) {
            const parts = description.split(' - ');
            recoveryType = parts[0];
            description = parts.slice(1).join(' - ');
        }
        
        const dateAdded = new Date(recovery.dateAdded);
        const formattedDate = isNaN(dateAdded.getTime()) 
            ? 'N/A' 
            : dateAdded.toLocaleDateString();
        
        return {
            'Regiment No': recovery.regtNo,
            'Name': recovery.name,
            'Rank': recovery.rank,
            'Recovery Type': recoveryType,
            'Amount': recovery.amount,
            'Description': description,
            'Date Added': formattedDate
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recoveries');
    XLSX.writeFile(workbook, 'Manual_Recoveries_Report.xlsx');
}

// Print recoveries
function printRecoveries() {
    window.print();
}

// Format currency with rupee symbol and 2 decimal places
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Process XLSX file for multiple employee recoveries
function processRecoveriesXLSX() {
    const fileInput = document.getElementById('xlsxFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select an XLSX file to upload');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            
            // Convert to JSON
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (rows.length < 2) {
                alert('The XLSX file contains no data or is invalid');
                return;
            }
            
            // Column indices based on expected headers
            const headers = rows[0];
            let regtNoIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('regiment'));
            let nameIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase() === 'name');
            let rankIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase() === 'rank');
            let typeIndex = headers.findIndex(h => typeof h === 'string' && (h.toLowerCase().includes('type') || h.toLowerCase().includes('recovery type')));
            let amountIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('amount'));
            let descIndex = headers.findIndex(h => typeof h === 'string' && (h.toLowerCase().includes('desc') || h.toLowerCase().includes('description')));
            
            // Handle case where specific headers aren't found - assume standard order
            if (regtNoIndex === -1) regtNoIndex = 0;
            if (nameIndex === -1) nameIndex = 1;
            if (rankIndex === -1) rankIndex = 2;
            if (typeIndex === -1) typeIndex = 3;
            if (amountIndex === -1) amountIndex = 4;
            if (descIndex === -1) descIndex = 5;
            
            // Process data rows
            const newRecoveries = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0 || !row[regtNoIndex]) continue;
                
                const regtNo = String(row[regtNoIndex] || '').trim();
                if (!regtNo) continue; // Skip rows without regiment number
                
                const amount = parseFloat(row[amountIndex]) || 0;
                if (amount <= 0) continue; // Skip rows with invalid amounts
                
                // Extract recovery type - default to "Leave Recovery" if not found
                const recoveryType = String(row[typeIndex] || 'Leave Recovery').trim();
                
                // Create recovery object
                const recovery = {
                    regtNo: regtNo,
                    name: String(row[nameIndex] || '').trim(),
                    rank: String(row[rankIndex] || '').trim(),
                    recoveryType: recoveryType,
                    amount: amount,
                    description: String(row[descIndex] || '').trim(),
                    dateAdded: new Date().toISOString()
                };
                
                newRecoveries.push(recovery);
            }
            
            if (newRecoveries.length === 0) {
                alert('No valid recovery entries found in the XLSX file');
                return;
            }
            
            // Confirm with the user
            const action = confirm(
                `Found ${newRecoveries.length} valid recovery entries.\n\n` +
                'Click OK to add these to existing recoveries, or Cancel to abort.'
            );
            
            if (!action) return;
            
            // Add the new recoveries to the existing ones
            const existingRecoveries = DataManager.loadManualRecoveries();
            const updatedRecoveries = [...existingRecoveries, ...newRecoveries];
            
            // Save and refresh
            DataManager.saveManualRecoveries(updatedRecoveries);
            
            // Clear tax summary cache since recoveries affect tax calculations
            DataManager.clearTaxSummaryCache();
            
            loadRecoveries();
            
            // Clear the file input
            fileInput.value = '';
            
            alert(`Successfully added ${newRecoveries.length} recovery entries.`);
            
        } catch (error) {
            console.error('Error processing XLSX file:', error);
            alert('Failed to process the XLSX file. Please check the file format and try again.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsArrayBuffer(file);
}