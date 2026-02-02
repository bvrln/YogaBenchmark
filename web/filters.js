
// ============================================================================
// FILTERS AND SEARCH
// ============================================================================

let currentFilters = {
    search: '',
    tier: 'all',
    segment: 'all',
    comparableOnly: false
};

function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const tierFilter = document.getElementById('tier-filter');
    const segmentFilter = document.getElementById('segment-filter');
    const comparableOnlyCheckbox = document.getElementById('comparable-only');
    const resetButton = document.getElementById('reset-filters');
    const filterStatus = document.getElementById('filter-status');

    if (!searchInput || !tierFilter || !segmentFilter) return;

    // Search filter
    searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });

    // Tier filter
    tierFilter.addEventListener('change', (e) => {
        currentFilters.tier = e.target.value;
        applyFilters();
    });

    // Segment filter
    segmentFilter.addEventListener('change', (e) => {
        currentFilters.segment = e.target.value;
        applyFilters();
    });

    // Comparable only toggle
    if (comparableOnlyCheckbox) {
        comparableOnlyCheckbox.addEventListener('change', (e) => {
            currentFilters.comparableOnly = e.target.checked;
            applyFilters();
        });
    }

    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            searchInput.value = '';
            tierFilter.value = 'all';
            segmentFilter.value = 'all';
            if (comparableOnlyCheckbox) comparableOnlyCheckbox.checked = false;
            currentFilters = { search: '', tier: 'all', segment: 'all', comparableOnly: false };
            applyFilters();
        });
    }
}

function applyFilters() {
    if (!window._competitors || !window._offers) return;

    let filtered = window._competitors.filter(comp => {
        // Search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search;
            const name = (comp.name || '').toLowerCase();
            const city = (comp.city || '').toLowerCase();
            const address = (comp.address || '').toLowerCase();
            if (!name.includes(searchLower) && !city.includes(searchLower) && !address.includes(searchLower)) {
                return false;
            }
        }

        // Tier filter
        if (currentFilters.tier !== 'all' && comp.tier !== currentFilters.tier) {
            return false;
        }

        // Segment filter
        if (currentFilters.segment !== 'all') {
            const segment = (comp.segment || '').toLowerCase();
            if (!segment.includes(currentFilters.segment.toLowerCase())) {
                return false;
            }
        }

        return true;
    });

    // Update filter status
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
        const total = window._competitors.length;
        const shown = filtered.length;
        if (shown < total) {
            filterStatus.textContent = `Showing ${shown} of ${total} competitors`;
            filterStatus.style.color = '#f57c00';
        } else {
            filterStatus.textContent = '';
        }
    }

    // Re-render competitors table with filtered list
    renderCompetitorsTable(filtered);
}

// ============================================================================
// TOP COMPARABLE COMPETITORS
// ============================================================================

function generateTopCompetitors() {
    const container = document.getElementById('top-competitors-list');
    if (!container || !window._competitors || !window._offers) return;

    // Get Movement's Yoga offers for comparison
    const ownOffers = window._ownStudioOffers || [];
    if (!ownOffers.length) {
        container.innerHTML = '<p class="note">No own studio offers found for comparison</p>';
        return;
    }

    // Calculate similarity score for each competitor
    const scores = window._competitors.map(comp => {
        const compOffers = window._offers.filter(o => o.competitor_id === comp.competitor_id);
        if (!compOffers.length) return { competitor: comp, score: 0, breakdown: {} };

        let totalComparability = 0;
        let offerCount = 0;
        const breakdown = {
            offerMatches: 0,
            segmentMatch: 0,
            tierBonus: 0,
            distanceBonus: 0
        };

        // Compare offers
        ownOffers.forEach(ownOffer => {
            compOffers.forEach(compOffer => {
                const comparability = calculateComparability(ownOffer, compOffer);
                if (comparability >= 60) {
                    totalComparability += comparability;
                    offerCount++;
                    if (comparability >= 85) breakdown.offerMatches++;
                }
            });
        });

        // Segment match bonus
        const ownSegment = 'hot yoga';
        const compSegment = (comp.segment || '').toLowerCase();
        if (compSegment.includes('hot') || compSegment.includes(ownSegment)) {
            breakdown.segmentMatch = 20;
        }

        // Tier bonus (prefer Tier 1 and 2)
        if (comp.tier === 'Tier 1') breakdown.tierBonus = 15;
        else if (comp.tier === 'Tier 2') breakdown.tierBonus = 10;

        // Distance bonus (closer is better)
        const distance = Number(comp.distance_walk_min || comp.distance_bike_min || 999);
        if (distance <= 5) breakdown.distanceBonus = 10;
        else if (distance <= 15) breakdown.distanceBonus = 5;

        const avgComparability = offerCount > 0 ? totalComparability / offerCount : 0;
        const finalScore = avgComparability + breakdown.segmentMatch + breakdown.tierBonus + breakdown.distanceBonus;

        return {
            competitor: comp,
            score: Math.round(finalScore),
            breakdown,
            offerCount
        };
    });

    // Sort by score and take top 10
    const topCompetitors = scores
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    if (!topCompetitors.length) {
        container.innerHTML = '<p class="note">No comparable competitors found</p>';
        return;
    }

    // Render ranked list
    container.innerHTML = topCompetitors.map((item, index) => {
        const comp = item.competitor;
        const badge = index < 3 ? '🥇🥈🥉'[index] : `#${index + 1}`;
        const scoreColor = item.score >= 85 ? '#2e7d32' : item.score >= 70 ? '#f57c00' : '#757575';

        return `
      <div class="competitor-rank-item" style="padding: 8px; margin: 4px 0; border-left: 3px solid ${scoreColor}; background: #f5f5f5;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 16px; margin-right: 8px;">${badge}</span>
            <strong>${comp.name || comp.brand}</strong>
            <span style="color: #666; font-size: 12px; margin-left: 8px;">${comp.tier || ''}</span>
          </div>
          <span style="font-weight: bold; color: ${scoreColor};">${item.score}%</span>
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ${comp.city || ''} • ${item.offerCount} comparable offers • ${comp.segment || ''}
        </div>
      </div>
    `;
    }).join('');

    // Store top competitor IDs for "Pin Top 5" button
    window._topCompetitorIds = topCompetitors.slice(0, 5).map(item => item.competitor.competitor_id);
}

function pinTopCompetitors() {
    if (!window._topCompetitorIds || !window._topCompetitorIds.length) {
        alert('No top competitors available to pin');
        return;
    }

    // Add top 5 to pinned competitors
    window._topCompetitorIds.forEach(id => pinnedCompetitors.add(id));

    // Save to server
    savePins();

    // Re-render
    if (window._competitors) {
        renderCompetitorsTable(window._competitors);
    }

    alert(`Pinned top ${window._topCompetitorIds.length} competitors!`);
}

// Initialize filters and top competitors when data loads
const originalFetchOffers = window.fetchOffers || (() => { });
window.fetchOffers = function () {
    originalFetchOffers();
    setTimeout(() => {
        setupFilters();
        generateTopCompetitors();
    }, 500);
};

// Wire up Pin Top 5 button
const pinTopButton = document.getElementById('pin-top-competitors');
if (pinTopButton) {
    pinTopButton.addEventListener('click', pinTopCompetitors);
}
