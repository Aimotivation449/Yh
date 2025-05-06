/**
 * Sidebar Controller - Responsible for sidebar toggle functionality and state management
 * This implementation ensures consistent behavior across all pages and improved reliability
 */

/**
 * Sidebar is now permanently visible - no toggle functionality
 * This function is kept for backward compatibility but does nothing
 */
function toggleSidebar() {
    // No-op - sidebar is permanently visible
    return;
}

/**
 * Updates DOM elements to reflect sidebar state
 * Now sidebar is always visible, regardless of the parameter
 * @param {boolean} isCollapsed - Ignored, kept for backward compatibility
 */
function updateSidebarState(isCollapsed) {
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    
    // Always ensure sidebar is visible
    if (sidebar) {
        sidebar.classList.remove('collapsed');
    }
    
    // Always ensure body doesn't have sidebar-collapsed class
    if (body) {
        body.classList.remove('sidebar-collapsed');
    }
    
    // Hide any toggle buttons (they're no longer needed)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileToggle = document.getElementById('toggleBtn');
    
    if (sidebarToggle) {
        sidebarToggle.style.display = 'none';
    }
    
    if (mobileToggle) {
        mobileToggle.style.display = 'none';
    }
}

/**
 * Save sidebar state to localStorage
 * @param {boolean} isCollapsed - Sidebar collapsed state
 */
function saveSidebarState(isCollapsed) {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
}

/**
 * Load sidebar state from localStorage
 * Now always returns false since sidebar should always be visible
 * @returns {boolean} - Always false for visible sidebar
 */
function loadSidebarState() {
    // Always return false to keep sidebar expanded
    return false;
}

/**
 * Manages overlay for mobile view when sidebar is expanded
 * @param {boolean} isCollapsed - Whether sidebar is collapsed
 */
function manageMobileOverlay(isCollapsed) {
    const isMobile = window.innerWidth < 768;
    
    // Only manage overlay on mobile
    if (!isMobile) return;
    
    let overlay = document.getElementById('sidebar-overlay');
    
    // Remove existing overlay if sidebar is collapsed
    if (isCollapsed && overlay) {
        document.body.removeChild(overlay);
        return;
    }
    
    // Create overlay if sidebar is expanded and we're on mobile
    if (!isCollapsed && !overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '999';
        overlay.style.transition = 'opacity 0.3s ease';
        
        // Close sidebar when overlay is clicked
        overlay.addEventListener('click', toggleSidebar);
        
        // Add to DOM
        document.body.appendChild(overlay);
        
        // Force reflow and add active class
        overlay.offsetHeight;
        overlay.style.opacity = '1';
    }
}

/**
 * Initialize sidebar functionality
 */
function initializeSidebar() {
    // Get sidebar toggle buttons
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    // Add click event listeners to toggle buttons
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleSidebar();
        });
    }
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleSidebar();
        });
    }
    
    // Apply initial state based on settings
    const isCollapsed = loadSidebarState();
    updateSidebarState(isCollapsed);
    console.log('Initial sidebar state applied:', isCollapsed ? 'collapsed' : 'expanded');
    
    // Handle mobile resize events
    window.addEventListener('resize', handleResize);
    
    // Set active menu item
    highlightActiveMenuItem();
}

/**
 * Handle window resize events
 * Now does nothing since sidebar is always visible
 */
function handleResize() {
    // No-op - sidebar is always visible regardless of screen size
    return;
}

/**
 * Highlight the active menu item based on current page
 */
function highlightActiveMenuItem() {
    // Get current page filename
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    console.log('Current page:', currentPage);
    
    // Find and highlight the appropriate menu item
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const dataPage = item.getAttribute('data-page');
        const isActive = dataPage === currentPage;
        item.classList.toggle('active', isActive);
        
        if (isActive) {
            console.log('Active menu item:', dataPage);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidebar);