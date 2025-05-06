/**
 * Settings Script - Handles application settings and preferences
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load and set tax parameters
    loadTaxParameters();
    
    // Load and set organization details
    loadOrganizationDetails();
    
    // Load backup settings and history
    loadBackupSettings();
    loadBackupHistory();
    
    // Setup tax slab rate row handlers
    setupTaxSlabHandlers();
    
    // Add event listeners
    document.getElementById('taxParametersForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTaxParameters();
    });
    
    document.getElementById('organizationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveOrganizationDetails();
    });
    
    // Backup and restore event listeners
    document.getElementById('exportAllData').addEventListener('click', createBackup);
    document.getElementById('importDataBtn').addEventListener('click', function() {
        document.getElementById('importDataFile').click();
    });
    
    document.getElementById('importDataFile').addEventListener('change', importData);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    
    // Scheduled backup event listeners
    if (document.getElementById('scheduledBackupForm')) {
        document.getElementById('scheduledBackupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveBackupSettings();
        });
    }
    
    if (document.getElementById('runBackupNow')) {
        document.getElementById('runBackupNow').addEventListener('click', runManualScheduledBackup);
    }
    
    // Check if automatic backup is due
    checkAndPerformAutomaticBackup();
});

// Load tax parameters
function loadTaxParameters() {
    const params = DataManager.getTaxParameters();
    
    document.getElementById('standardDeduction').value = params.standardDeduction || 75000;
    document.getElementById('educationCess').value = params.educationCess || 4;
    
    // Load tax slab rates
    if (params.taxSlabs && params.taxSlabs.length > 0) {
        const slabTable = document.getElementById('taxSlabTable').getElementsByTagName('tbody')[0];
        const slabRows = slabTable.getElementsByTagName('tr');
        
        for (let i = 0; i < Math.min(slabRows.length, params.taxSlabs.length); i++) {
            const row = slabRows[i];
            const inputs = row.getElementsByTagName('input');
            
            // Set min value (readonly)
            inputs[0].value = params.taxSlabs[i].min;
            
            // Set max value (editable except for last row)
            if (i < params.taxSlabs.length - 1) {
                inputs[1].value = params.taxSlabs[i].max;
                inputs[1].disabled = false;
            } else {
                inputs[1].value = "";
                inputs[1].disabled = true;
                inputs[1].placeholder = "No limit";
            }
            
            // Set rate (%)
            inputs[2].value = params.taxSlabs[i].rate;
        }
    }
    
    // Load tax rebate parameters
    if (document.getElementById('taxRebateLimit')) {
        document.getElementById('taxRebateLimit').value = params.taxRebateLimit || 1200000;
    }
    
    if (document.getElementById('maxRebateAmount')) {
        document.getElementById('maxRebateAmount').value = params.maxRebateAmount || 60000;
    }
    
    const fiscalYearSelect = document.getElementById('fiscalYear');
    if (fiscalYearSelect) {
        // Get current fiscal year using the utility function
        let defaultFiscalYear = getCurrentIndianFiscalYear();
        
        const storedFiscalYear = params.fiscalYear || defaultFiscalYear;
        
        // Create options for fiscal years if not already present
        if (fiscalYearSelect.options.length === 0) {
            const currentYearNum = parseInt(storedFiscalYear.split('-')[0]);
            for (let year = currentYearNum - 2; year <= currentYearNum + 2; year++) {
                const option = document.createElement('option');
                option.value = `${year}-${year + 1}`;
                option.textContent = `${year}-${year + 1}`;
                fiscalYearSelect.appendChild(option);
            }
        }
        
        // Set selected fiscal year
        Array.from(fiscalYearSelect.options).forEach(option => {
            if (option.value === storedFiscalYear) {
                option.selected = true;
            }
        });
    }
}

// Save tax parameters
function saveTaxParameters() {
    const standardDeduction = parseInt(document.getElementById('standardDeduction').value) || 75000;
    const educationCess = parseFloat(document.getElementById('educationCess').value) || 4;
    const fiscalYear = document.getElementById('fiscalYear').value;
    const taxRebateLimit = parseInt(document.getElementById('taxRebateLimit').value) || 1200000;
    const maxRebateAmount = parseInt(document.getElementById('maxRebateAmount').value) || 60000;
    
    // Get tax slab rates from the table
    const taxSlabs = [];
    const slabTable = document.getElementById('taxSlabTable').getElementsByTagName('tbody')[0];
    const slabRows = slabTable.getElementsByTagName('tr');
    
    for (let i = 0; i < slabRows.length; i++) {
        const row = slabRows[i];
        const inputs = row.getElementsByTagName('input');
        
        const min = parseInt(inputs[0].value) || 0;
        let max = null;
        
        // For all rows except the last one, get the max value
        if (i < slabRows.length - 1) {
            max = parseInt(inputs[1].value) || 0;
        }
        
        const rate = parseFloat(inputs[2].value) || 0;
        
        taxSlabs.push({
            min: min,
            max: max,
            rate: rate
        });
    }
    
    // Validate tax slabs using the common validation function
    if (!validateTaxSlabs()) {
        return;
    }
    
    const params = {
        standardDeduction: standardDeduction,
        educationCess: educationCess,
        fiscalYear: fiscalYear,
        taxSlabs: taxSlabs,
        taxRebateLimit: taxRebateLimit,
        maxRebateAmount: maxRebateAmount
    };
    
    DataManager.saveTaxParameters(params);
    alert('Tax parameters saved successfully!');
}

// Load organization details
function loadOrganizationDetails() {
    const details = DataManager.getOrganizationDetails();
    
    document.getElementById('orgName').value = details.name || 'Border Security Force';
    document.getElementById('orgDepartment').value = details.department || 'Accounts Department';
    document.getElementById('orgAddress').value = details.address || '';
    document.getElementById('contactPerson').value = details.contactPerson || '';
    document.getElementById('contactEmail').value = details.email || '';
}

// Save organization details
function saveOrganizationDetails() {
    const name = document.getElementById('orgName').value.trim();
    const department = document.getElementById('orgDepartment').value.trim();
    const address = document.getElementById('orgAddress').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    
    const details = {
        name: name,
        department: department,
        address: address,
        contactPerson: contactPerson,
        email: email
    };
    
    DataManager.saveOrganizationDetails(details);
    alert('Organization details saved successfully!');
}

// Load backup settings
function loadBackupSettings() {
    const settings = DataManager.getScheduledBackupSettings();
    
    if (document.getElementById('enableScheduledBackups')) {
        document.getElementById('enableScheduledBackups').checked = settings.enabled;
    }
    
    if (document.getElementById('backupFrequency')) {
        document.getElementById('backupFrequency').value = settings.frequency;
    }
    
    if (document.getElementById('backupRetention')) {
        document.getElementById('backupRetention').value = settings.retention;
    }
}

// Save backup settings
function saveBackupSettings() {
    const settings = {
        enabled: document.getElementById('enableScheduledBackups').checked,
        frequency: document.getElementById('backupFrequency').value,
        retention: parseInt(document.getElementById('backupRetention').value),
        lastBackup: DataManager.getScheduledBackupSettings().lastBackup
    };
    
    DataManager.saveScheduledBackupSettings(settings);
    alert('Backup settings saved successfully!');
}

// Load backup history
function loadBackupHistory() {
    const history = DataManager.getBackupHistory();
    const tableBody = document.getElementById('backupHistoryTable').getElementsByTagName('tbody')[0];
    const noBackupsMessage = document.getElementById('noBackupsMessage');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (history.length === 0) {
        if (noBackupsMessage) {
            noBackupsMessage.classList.remove('d-none');
        }
        return;
    }
    
    if (noBackupsMessage) {
        noBackupsMessage.classList.add('d-none');
    }
    
    // Add rows for each backup
    history.forEach((backup, index) => {
        const row = document.createElement('tr');
        
        // Format date
        const backupDate = new Date(backup.date);
        const formattedDate = formatDate(backupDate, 'DD-MMM-YYYY HH:mm');
        
        // Format size
        const size = backup.size;
        let formattedSize;
        if (size < 1024) {
            formattedSize = `${size} B`;
        } else if (size < 1024 * 1024) {
            formattedSize = `${(size / 1024).toFixed(1)} KB`;
        } else {
            formattedSize = `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
        
        // Format records
        const records = backup.records;
        let recordsText = '';
        if (records) {
            const entries = [];
            if (records.employees) entries.push(`${records.employees} Employees`);
            if (records.billClaims) entries.push(`${records.billClaims} Claims`);
            if (records.taxDeductions) entries.push(`${records.taxDeductions} Deductions`);
            recordsText = entries.join(', ');
        }
        
        // Create cells
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${backup.description || 'Manual backup'}</td>
            <td>${formattedSize}</td>
            <td>${recordsText}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary restore-backup-btn" data-backup-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-download">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </td>
        `;
        
        // Add event listener to restore button
        const restoreBtn = row.querySelector('.restore-backup-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', function() {
                restoreFromBackupHistory(backup.filename);
            });
        }
        
        tableBody.appendChild(row);
    });
}

// Restore from backup history
function restoreFromBackupHistory(filename) {
    // Extract timestamp from filename
    const timestamp = filename.replace(/^(auto|import)_backup_(.+)\.json$/, '$2');
    const key = `backup_${timestamp}`;
    
    try {
        const backupJSON = localStorage.getItem(key);
        if (!backupJSON) {
            alert('Backup data not found in storage.');
            return;
        }
        
        const backupData = JSON.parse(backupJSON);
        
        // Confirm before restoring
        const confirmMsg = 'Restoring this backup will replace your existing data. Continue?';
        showConfirmationModal(confirmMsg, function() {
            const result = DataManager.importAllData(backupData);
            
            if (result.success) {
                alert('Backup restored successfully!');
                window.location.reload();
            } else {
                alert(`Error restoring backup: ${result.message}`);
                console.error('Backup restore error details:', result.details);
            }
        });
    } catch (error) {
        console.error('Error restoring from backup history:', error);
        alert('Error restoring from backup. The backup may be corrupted.');
    }
}

// Run backup manually using the scheduled backup system
function runManualScheduledBackup() {
    const result = DataManager.performAutomaticBackupIfDue();
    
    if (result) {
        alert('Backup completed successfully!');
        loadBackupHistory(); // Refresh the history display
    } else {
        alert('Backup was not created. Please try again.');
    }
}

// Check and perform automatic backup if due
function checkAndPerformAutomaticBackup() {
    // Only perform if enabled in settings
    const settings = DataManager.getScheduledBackupSettings();
    
    if (settings.enabled && DataManager.isAutomaticBackupDue()) {
        console.log('Automatic backup is due, performing now...');
        const result = DataManager.performAutomaticBackupIfDue();
        
        if (result) {
            console.log('Automatic backup completed successfully');
            loadBackupHistory(); // Refresh the history display
        } else {
            console.error('Automatic backup failed');
        }
    }
}

// Create new backup (called from UI)
function createBackup() {
    // Show a prompt for backup description
    const description = prompt('Enter a description for this backup (optional):');
    
    // Create the backup
    const data = DataManager.exportAllData(description || 'Manual backup');
    
    if (!data) {
        alert('Error creating backup. Please try again.');
        return;
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[-:\.T]/g, '').slice(0, 14);
    const filename = `backup_${timestamp}.json`;
    
    // Save to localStorage for history
    try {
        localStorage.setItem(`backup_${timestamp}`, JSON.stringify(data));
        
        // Add to history
        DataManager.addBackupToHistory(filename, {
            date: new Date().toISOString(),
            size: JSON.stringify(data).length,
            records: data.metadata.recordCounts,
            description: description || 'Manual backup'
        });
        
        // Refresh history display
        loadBackupHistory();
        
        // Also download the file
        const exportStr = JSON.stringify(data, null, 2);
        const blob = new Blob([exportStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bsf_tax_calculator_${formatDate(new Date(), 'YYYY-MM-DD')}_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Backup created and downloaded successfully!');
    } catch (error) {
        console.error('Error saving backup to history:', error);
        alert('Error saving backup history. The file was downloaded but not added to history.');
    }
}

// Export all data (legacy function, kept for backward compatibility)
function exportAllData() {
    createBackup();
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Confirm before importing
            const confirmMsg = 'Importing this data will replace your existing data. Continue?';
            showConfirmationModal(confirmMsg, function() {
                const result = DataManager.importAllData(data);
                
                if (result.success) {
                    alert('Data imported successfully!');
                    // Reload the page to reflect changes
                    window.location.reload();
                } else {
                    alert(`Error importing data: ${result.message}`);
                    console.error('Import error details:', result.details);
                }
            });
        } catch (error) {
            console.error('Error parsing import file:', error);
            alert('Error importing data. The file format appears to be invalid.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
}

// Clear all data
function clearAllData() {
    const confirmMsg = 'This will delete ALL data including salary data, bill claims, and tax deductions. This action cannot be undone. Are you sure?';
    
    showConfirmationModal(confirmMsg, function() {
        if (DataManager.clearAllData()) {
            alert('All data has been cleared successfully.');
            // Reload the page to reflect changes
            window.location.reload();
        }
    });
}

// Show confirmation modal
function showConfirmationModal(message, confirmCallback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    document.getElementById('confirmationModalBody').textContent = message;
    
    // Set up the confirm button
    const confirmBtn = document.getElementById('confirmBtn');
    
    // Remove any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add new event listener
    newConfirmBtn.addEventListener('click', function() {
        modal.hide();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    modal.show();
}

// Format date helper function is now in utils.js

/**
 * Validate tax slabs to ensure they form a valid progressive structure
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTaxSlabs() {
    const slabTable = document.getElementById('taxSlabTable');
    if (!slabTable) return true; // Nothing to validate
    
    const tbody = slabTable.getElementsByTagName('tbody')[0];
    if (!tbody) return true;
    
    const rows = tbody.getElementsByTagName('tr');
    if (!rows || rows.length === 0) return true;
    
    // Collect all slab data
    const slabs = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const inputs = row.getElementsByTagName('input');
        
        if (inputs.length >= 3) {
            const min = parseInt(inputs[0].value) || 0;
            let max = null;
            
            // For all rows except the last one, get the max value
            if (i < rows.length - 1) {
                max = parseInt(inputs[1].value) || 0;
            }
            
            const rate = parseFloat(inputs[2].value) || 0;
            
            slabs.push({ min, max, rate });
        }
    }
    
    // Validation checks
    let isValid = true;
    let errorMessage = '';
    
    // Check for increasing min values
    for (let i = 1; i < slabs.length; i++) {
        if (slabs[i].min <= slabs[i-1].min) {
            isValid = false;
            errorMessage = 'Tax slab minimum values must be increasing';
            break;
        }
    }
    
    // Check for max values matching next min values
    for (let i = 0; i < slabs.length - 1; i++) {
        if (slabs[i].max !== slabs[i+1].min) {
            isValid = false;
            errorMessage = 'Tax slab maximum values must match the next slab\'s minimum value';
            break;
        }
    }
    
    if (!isValid && errorMessage) {
        alert('Error in tax slab configuration: ' + errorMessage);
    }
    
    return isValid;
}

/**
 * Setup event handlers for tax slab table to ensure min values get updated based on previous max values
 */
function setupTaxSlabHandlers() {
    const slabTable = document.getElementById('taxSlabTable');
    if (!slabTable) return;
    
    const tbody = slabTable.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');
    if (!rows || rows.length === 0) return;
    
    // Add change event listeners to all max value inputs to update the next row's min value
    for (let i = 0; i < rows.length - 1; i++) { // Skip the last row
        const currentRow = rows[i];
        const nextRow = rows[i + 1];
        
        const maxInputs = currentRow.getElementsByClassName('slab-max');
        const nextMinInputs = nextRow.getElementsByClassName('slab-min');
        
        if (maxInputs.length > 0 && nextMinInputs.length > 0) {
            const maxInput = maxInputs[0];
            const nextMinInput = nextMinInputs[0];
            
            // When the max value changes, update the next row's min value
            maxInput.addEventListener('input', function() {
                const newMax = parseInt(this.value) || 0;
                nextMinInput.value = newMax;
            });
        }
    }
}
