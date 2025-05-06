/**
 * One-time cleanup script to migrate tax deductions from bill claims to dedicated storage
 * 
 * This script should be run once to handle the transition when separating tax deductions
 * from bill claims into their own dedicated storage
 */

document.addEventListener('DOMContentLoaded', function() {
    cleanupTaxDeductions();
});

function cleanupTaxDeductions() {
    try {
        // Load bill claims to check for tax deduction entries
        const billClaims = DataManager.loadBillClaims();
        const taxDeductionClaims = billClaims.filter(claim => claim.billType === 'Tax Deduction');
        
        if (taxDeductionClaims.length === 0) {
            console.log('No tax deductions found in bill claims. No cleanup needed.');
            showCleanupMessage(0, 0);
            return;
        }
        
        // Load existing tax deductions
        let taxDeductions = DataManager.loadTaxDeductions();
        const originalTaxDeductionsCount = taxDeductions.length;
        
        // Migrate tax deduction claims to dedicated storage
        const migratedCount = migrateTaxDeductions(taxDeductionClaims, taxDeductions);
        
        // Remove tax deductions from bill claims
        const remainingBillClaims = billClaims.filter(claim => claim.billType !== 'Tax Deduction');
        DataManager.saveBillClaims(remainingBillClaims);
        
        showCleanupMessage(taxDeductionClaims.length, migratedCount);
        
    } catch (error) {
        console.error('Error during tax deduction cleanup:', error);
        alert('An error occurred while cleaning up tax deductions. Please check the console for details.');
    }
}

function migrateTaxDeductions(taxDeductionClaims, taxDeductions) {
    let migratedCount = 0;
    
    taxDeductionClaims.forEach(claim => {
        // Extract month and employer name from description (if available)
        let month = 'Unknown';
        let employerName = '';
        
        if (claim.description) {
            const taxDeductionPattern = /Tax deduction - (\w+)(?:\s*\(([^)]+)\))?/;
            const match = claim.description.match(taxDeductionPattern);
            
            if (match) {
                month = match[1] || 'Unknown';
                employerName = match[2] || '';
            }
        }
        
        // Create new tax deduction entry
        const taxDeduction = {
            regtNo: claim.regtNo,
            month: month,
            amount: claim.amount,
            employerName: employerName,
            date: claim.dateAdded ? claim.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]
        };
        
        // Avoid duplicates by checking if similar entry already exists
        const isDuplicate = taxDeductions.some(existing => 
            existing.regtNo === taxDeduction.regtNo && 
            existing.month === taxDeduction.month && 
            Math.abs(existing.amount - taxDeduction.amount) < 0.01
        );
        
        if (!isDuplicate) {
            taxDeductions.push(taxDeduction);
            migratedCount++;
        }
    });
    
    // Save updated tax deductions
    if (migratedCount > 0) {
        DataManager.saveTaxDeductions(taxDeductions);
    }
    
    return migratedCount;
}

function showCleanupMessage(foundCount, migratedCount) {
    let messageHtml = '';
    
    if (foundCount === 0) {
        messageHtml = `
            <div class="alert alert-info">
                <h4>No Cleanup Required</h4>
                <p>No tax deductions were found in the bill claims storage. No cleanup was needed.</p>
            </div>
        `;
    } else if (migratedCount === 0) {
        messageHtml = `
            <div class="alert alert-warning">
                <h4>Cleanup Complete - No New Entries</h4>
                <p>Found ${foundCount} tax deduction entries in bill claims, but all were already migrated to dedicated storage. Bill claims have been updated.</p>
            </div>
        `;
    } else {
        messageHtml = `
            <div class="alert alert-success">
                <h4>Cleanup Complete</h4>
                <p>Successfully migrated ${migratedCount} tax deduction entries from bill claims to dedicated storage.</p>
                <p>Removed ${foundCount} tax deduction entries from bill claims.</p>
            </div>
        `;
    }
    
    // Display the message
    const messageContainer = document.getElementById('cleanup-message');
    if (messageContainer) {
        messageContainer.innerHTML = messageHtml;
    } else {
        // Create and append message container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'cleanup-message';
        container.className = 'container mt-3';
        container.innerHTML = messageHtml;
        
        // Insert after the navbar
        const navbar = document.querySelector('.navbar');
        if (navbar && navbar.nextSibling) {
            document.body.insertBefore(container, navbar.nextSibling);
        } else {
            document.body.insertBefore(container, document.body.firstChild);
        }
    }
}