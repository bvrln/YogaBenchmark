// Simple 2-tab manager

class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab');
        this.panels = document.querySelectorAll('.tab-panel');
        this.init();
    }

    init() {
        // Add click handlers to tabs
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
                window.location.hash = tabId;
            });
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash) {
                this.switchTab(hash);
            }
        });

        // Load initial tab from URL or default to 'mystudio'
        const initialTab = window.location.hash.slice(1) || 'mystudio';
        this.switchTab(initialTab);
    }

    switchTab(tabId) {
        // Remove active class from all tabs and panels
        this.tabs.forEach(t => t.classList.remove('active'));
        this.panels.forEach(p => p.classList.remove('active'));

        // Add active class to selected tab and panel
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedPanel = document.getElementById(`${tabId}-panel`);

        if (selectedTab && selectedPanel) {
            selectedTab.classList.add('active');
            selectedPanel.classList.add('active');

            // Trigger map resize if switching to benchmark tab
            if (tabId === 'benchmark' && window.map) {
                setTimeout(() => window.map.invalidateSize(), 100);
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TabManager());
} else {
    new TabManager();
}
