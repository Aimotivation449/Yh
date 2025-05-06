/**
 * Theme Controller - Handles dark/light theme toggle with improved reliability
 * Enhanced with proper CSS variable management and reduced DOM manipulation
 */

// Theme preferences storage key
const THEME_STORAGE_KEY = 'theme';

// Available themes
const THEMES = {
    DARK: 'dark',
    LIGHT: 'light'
};

// Bootstrap theme URLs
const BOOTSTRAP_URLS = {
    DARK: 'https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css',
    LIGHT: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
};

/**
 * Initialize theme controls when DOM is ready
 */
function initializeTheme() {
    // Create the theme toggle button
    createThemeToggleButton();
    
    // Get and apply the user's preferred theme
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    
    // Add mutation observer to ensure theme is maintained
    setupThemePersistence();
    
    console.log('Theme system initialized with', savedTheme, 'theme');
}

/**
 * Get the saved theme preference or use system preference with dark fallback
 * @returns {string} - 'dark' or 'light'
 */
function getSavedTheme() {
    // Check localStorage first
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme && (storedTheme === THEMES.DARK || storedTheme === THEMES.LIGHT)) {
        return storedTheme;
    }
    
    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return THEMES.LIGHT;
    }
    
    // Default to dark
    return THEMES.DARK;
}

/**
 * Create and add the theme toggle button to the page
 */
function createThemeToggleButton() {
    // Don't create button if it already exists
    if (document.getElementById('themeToggleBtn')) {
        return;
    }

    // Create container for the theme toggle button
    const themeToggleContainer = document.createElement('div');
    themeToggleContainer.className = 'theme-toggle-container';
    themeToggleContainer.style.position = 'fixed';
    themeToggleContainer.style.bottom = '20px';
    themeToggleContainer.style.right = '20px';
    themeToggleContainer.style.zIndex = '1050';
    
    // Create the toggle button
    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = 'themeToggleBtn';
    themeToggleBtn.className = 'btn btn-sm rounded-circle theme-toggle';
    themeToggleBtn.style.width = '40px';
    themeToggleBtn.style.height = '40px';
    themeToggleBtn.style.display = 'flex';
    themeToggleBtn.style.alignItems = 'center';
    themeToggleBtn.style.justifyContent = 'center';
    themeToggleBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    themeToggleBtn.style.transition = 'all 0.2s ease';
    themeToggleBtn.title = 'Toggle Dark/Light Mode';
    themeToggleBtn.setAttribute('aria-label', 'Toggle Dark/Light Mode');
    
    // Add theme toggle event
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Add button to container and container to body
    themeToggleContainer.appendChild(themeToggleBtn);
    document.body.appendChild(themeToggleContainer);
    
    // Set initial icon
    updateThemeIcon();
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    
    // Apply the new theme
    applyTheme(newTheme);
    
    // Save preference to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    
    console.log('Theme switched to:', newTheme);
}

/**
 * Get the current theme
 * @returns {string} - 'dark' or 'light'
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-bs-theme') || THEMES.DARK;
}

/**
 * Apply the specified theme to the document
 * @param {string} theme - The theme to apply ('dark' or 'light')
 */
function applyTheme(theme) {
    // Validate theme
    if (theme !== THEMES.DARK && theme !== THEMES.LIGHT) {
        console.error('Invalid theme:', theme);
        theme = THEMES.DARK; // Fallback to dark
    }
    
    // Apply the theme attribute to the HTML element
    document.documentElement.setAttribute('data-bs-theme', theme);
    
    // Apply theme classes to body
    if (theme === THEMES.DARK) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    }
    
    // Update Bootstrap CSS if needed
    updateBootstrapTheme(theme);
    
    // Update the theme toggle button
    updateThemeIcon();
    
    // Apply theme-specific styles
    applyThemeStyles(theme);
}

/**
 * Updates the Bootstrap theme CSS file based on the selected theme
 * @param {string} theme - The theme to apply ('dark' or 'light')
 */
function updateBootstrapTheme(theme) {
    // Skip if we're in a browser without document head
    if (!document.head) return;
    
    // Find the Bootstrap CSS link
    const bootstrapLinks = document.querySelectorAll('link[href*="bootstrap"]');
    
    if (bootstrapLinks.length > 0) {
        const link = bootstrapLinks[0];
        const targetUrl = theme === THEMES.LIGHT ? BOOTSTRAP_URLS.LIGHT : BOOTSTRAP_URLS.DARK;
        
        // Only update if needed
        if (link.href !== targetUrl) {
            // Create a new link element
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = targetUrl;
            
            // Add load event to remove the old link after new one loads
            newLink.onload = function() {
                // Remove the old link after a small delay to prevent flash
                setTimeout(() => {
                    if (link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                }, 50);
            };
            
            // Insert the new link before the old one
            link.parentNode.insertBefore(newLink, link);
        }
    }
}

/**
 * Set up an observer to ensure theme persistence
 */
function setupThemePersistence() {
    // Skip if MutationObserver is not available
    if (!window.MutationObserver) return;
    
    // Create observer instance
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'data-bs-theme') {
                const newTheme = document.documentElement.getAttribute('data-bs-theme');
                const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
                
                // If theme was changed externally, update our state
                if (newTheme !== savedTheme) {
                    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
                    applyThemeStyles(newTheme);
                    updateThemeIcon();
                }
            }
        });
    });
    
    // Start observing html element
    observer.observe(document.documentElement, { attributes: true });
}

/**
 * Update the theme toggle icon based on current theme
 */
function updateThemeIcon() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) return;
    
    const currentTheme = getCurrentTheme();
    const bgClass = currentTheme === THEMES.DARK ? 'btn-outline-light' : 'btn-outline-dark';
    
    // Update button appearance
    themeToggleBtn.className = `btn btn-sm rounded-circle theme-toggle ${bgClass}`;
    
    // Update icon
    themeToggleBtn.innerHTML = getThemeIcon();
}

/**
 * Get the appropriate icon SVG based on current theme
 * @returns {string} - SVG icon markup
 */
function getThemeIcon() {
    const currentTheme = getCurrentTheme();
    
    if (currentTheme === THEMES.DARK) {
        // Sun icon for dark mode (clicking will switch to light)
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sun" viewBox="0 0 16 16">
            <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
        </svg>`;
    } else {
        // Moon icon for light mode (clicking will switch to dark)
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon" viewBox="0 0 16 16">
            <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278zM4.858 1.311A7.269 7.269 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.316 7.316 0 0 0 5.205-2.162c-.337.042-.68.063-1.029.063-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286z"/>
        </svg>`;
    }
}

/**
 * Apply theme-specific CSS styles
 * Optimize by using CSS variables instead of direct style manipulation
 * @param {string} theme - The current theme ('dark' or 'light')
 */
function applyThemeStyles(theme) {
    // Create style if it doesn't exist
    let styleEl = document.getElementById('dynamic-theme-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-theme-styles';
        document.head.appendChild(styleEl);
    }
    
    // Define theme-specific CSS
    const cssRules = theme === THEMES.LIGHT 
        ? `
            /* Light theme specific styles */
            :root {
                --table-header-bg: #f1f3fa !important;
                --table-header-color: #212529 !important;
                --table-cell-color: #212529 !important;
                --input-text-color: #212529 !important;
                --input-bg-color: #ffffff !important;
                --link-color: #0d6efd !important;
                --btn-outline-text: #212529 !important;
            }
            
            /* Apply styles using CSS variables */
            th {
                background-color: var(--table-header-bg) !important;
                color: var(--table-header-color) !important;
            }
            
            td {
                color: var(--table-cell-color) !important;
            }
            
            .form-control, .form-select {
                color: var(--input-text-color) !important;
                background-color: var(--input-bg-color) !important;
            }
            
            a:not(.btn) {
                color: var(--link-color) !important;
            }
            
            .btn-outline-secondary {
                color: var(--btn-outline-text) !important;
            }
            `
        : `
            /* Dark theme specific styles */
            :root {
                --table-header-bg: #2c3136 !important;
                --table-header-color: #f8f9fa !important;
                --table-cell-color: #f8f9fa !important;
                --input-text-color: #f8f9fa !important;
                --input-bg-color: #2b3035 !important;
                --link-color: #0dcaf0 !important;
                --btn-outline-text: #f8f9fa !important;
            }
            
            /* Apply styles using CSS variables */
            th {
                background-color: var(--table-header-bg) !important;
                color: var(--table-header-color) !important;
            }
            
            td {
                color: var(--table-cell-color) !important;
            }
            
            .form-control, .form-select {
                color: var(--input-text-color) !important;
                background-color: var(--input-bg-color) !important;
            }
            
            a:not(.btn) {
                color: var(--link-color) !important;
            }
            
            .btn-outline-secondary {
                color: var(--btn-outline-text) !important;
            }
            `;
    
    // Set the CSS content
    styleEl.textContent = cssRules;
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);