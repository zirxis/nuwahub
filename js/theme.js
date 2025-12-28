// Theme Management System

const THEME_STORAGE_KEY = 'nuwahub_theme';

// Initialize theme on page load
function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(theme);
}

// Set theme
function setTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        updateThemeToggleIcon('sun');
    } else {
        html.removeAttribute('data-theme');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        updateThemeToggleIcon('moon');
    }
}

// Toggle theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Update theme toggle button icon
function updateThemeToggleIcon(icon) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const iconElement = themeToggle.querySelector('i');
        if (iconElement) {
            iconElement.className = `fas fa-${icon}`;
        }
    }
}

// Setup theme toggle button
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Initialize theme and setup toggle on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupThemeToggle();
});

// Also initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        setupThemeToggle();
    });
} else {
    initializeTheme();
    setupThemeToggle();
}
