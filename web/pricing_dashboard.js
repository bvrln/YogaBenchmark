// ============================================================================
// OWNER-FOCUSED PRICING DASHBOARD
// ============================================================================

function generatePricingRecommendations() {
    const container = document.getElementById('pricing-recommendations');
    if (!container) return;

    const ownOffers = window._ownStudioOffers || [];
    const allOffers = window._offers || [];

    if (!ownOffers.length || !allOffers.length) {
        container.innerHTML = '<p class="note">Loading pricing data...</p>';
        return;
    }

    // Group own offers by type
    const offersByType = {
        drop_in: ownOffers.filter(o => o.offer_type === 'drop_in'),
        pack: ownOffers.filter(o => o.offer_type === 'pack'),
        membership: ownOffers.filter(o => o.offer_type === 'membership'),
        intro: ownOffers.filter(o => o.offer_type === 'intro')
    };

    let html = '<div class="pricing-dashboard">';

    // Header
    html += `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px 0; color: white;">📊 Pricing Strategy for Movement's Yoga</h2>
      <p style="margin: 0; opacity: 0.9;">Market analysis and recommendations based on ${allOffers.length} competitor offers</p>
    </div>
  `;

    // Analyze each own offer
    ownOffers.forEach(ownOffer => {
        const analysis = analyzeOffer(ownOffer, allOffers);
        html += renderOfferAnalysis(ownOffer, analysis);
    });

    // Competitive position summary
    html += generateCompetitivePosition(ownOffers, allOffers);

    html += '</div>';
    container.innerHTML = html;
}

function analyzeOffer(ownOffer, allOffers) {
    // Find comparable offers
    const comparableOffers = allOffers.filter(compOffer => {
        if (compOffer.competitor_id === 'our-studio') return false;
        if (typeof calculateComparability === 'function') {
            return calculateComparability(ownOffer, compOffer) >= 70;
        }
        return false;
    });

    if (!comparableOffers.length) {
        return {
            comparableCount: 0,
            median: null,
            min: null,
            max: null,
            recommendation: 'No comparable offers found',
            confidence: 'low'
        };
    }

    // Calculate price per class for comparison
    const ownPricePerClass = calculatePricePerClass(ownOffer);
    const comparablePrices = comparableOffers
        .map(o => calculatePricePerClass(o))
        .filter(p => p > 0)
        .sort((a, b) => a - b);

    const median = comparablePrices[Math.floor(comparablePrices.length / 2)];
    const min = Math.min(...comparablePrices);
    const max = Math.max(...comparablePrices);

    // Generate recommendation
    const diff = ownPricePerClass - median;
    const diffPercent = (diff / median) * 100;

    let recommendation, action, confidence;

    if (Math.abs(diffPercent) < 5) {
        recommendation = '✓ Competitive';
        action = 'Maintain current pricing';
        confidence = 'high';
    } else if (diffPercent > 15) {
        recommendation = '💡 Above market';
        action = `Consider reducing to €${(median * 0.95).toFixed(2)}-€${median.toFixed(2)} per class`;
        confidence = comparablePrices.length >= 5 ? 'high' : 'medium';
    } else if (diffPercent > 5) {
        recommendation = '💡 Slightly above market';
        action = `Consider €${median.toFixed(2)} per class OR emphasize premium value`;
        confidence = comparablePrices.length >= 5 ? 'high' : 'medium';
    } else if (diffPercent < -15) {
        recommendation = '💰 Below market';
        action = `Opportunity to increase to €${median.toFixed(2)}-€${(median * 1.05).toFixed(2)} per class`;
        confidence = comparablePrices.length >= 5 ? 'high' : 'medium';
    } else {
        recommendation = '💰 Slightly below market';
        action = `Consider increasing to €${median.toFixed(2)} per class`;
        confidence = comparablePrices.length >= 5 ? 'high' : 'medium';
    }

    return {
        comparableCount: comparablePrices.length,
        median,
        min,
        max,
        ownPrice: ownPricePerClass,
        diff,
        diffPercent,
        recommendation,
        action,
        confidence
    };
}

function calculatePricePerClass(offer) {
    const price = Number(offer.price_eur);
    if (!price || price <= 0) return 0;

    // Drop-in
    if (offer.offer_type === 'drop_in') {
        return price;
    }

    // Pack
    if (offer.offer_type === 'pack' || offer.offer_type === 'intro') {
        const sessions = Number(offer.sessions_included);
        if (sessions > 0) return price / sessions;
    }

    // Membership
    if (offer.offer_type === 'membership') {
        const sessions = Number(offer.sessions_included);
        const duration = Number(offer.duration_days) || 28;

        // Unlimited
        if (offer.usage_limit_type === 'unlimited' || !sessions) {
            // Assume 12 classes per month for unlimited
            const classesPerMonth = 12;
            const monthlyPrice = offer.price_unit === 'year' ? price / 12 : price;
            return monthlyPrice / classesPerMonth;
        }

        // Limited sessions
        if (sessions > 0) {
            return price / sessions;
        }
    }

    return 0;
}

function renderOfferAnalysis(ownOffer, analysis) {
    const offerName = ownOffer.offer_name || ownOffer.name || 'Offer';
    const price = Number(ownOffer.price_eur);
    const priceLabel = ownOffer.price_unit === 'month' ? `€${price}/month` :
        ownOffer.price_unit === 'year' ? `€${price}/year` :
            `€${price}`;

    const confidenceColor = analysis.confidence === 'high' ? '#2e7d32' :
        analysis.confidence === 'medium' ? '#f57c00' : '#757575';

    const recommendationColor = analysis.recommendation.includes('✓') ? '#2e7d32' :
        analysis.recommendation.includes('💰') ? '#1976d2' :
            '#f57c00';

    return `
    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 4px 0; color: #333;">${offerName}</h3>
          <div style="color: #666; font-size: 14px;">
            ${ownOffer.class_type || 'Hot Yoga'} • ${ownOffer.heat || 'Hot'} • ${ownOffer.class_length_min || '60'}min
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #333;">${priceLabel}</div>
          <div style="font-size: 12px; color: #666;">€${analysis.ownPrice ? analysis.ownPrice.toFixed(2) : '0.00'}/class</div>
        </div>
      </div>

      <div style="background: #f5f5f5; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Market Median</div>
            <div style="font-size: 18px; font-weight: bold; color: #333;">€${analysis.median ? analysis.median.toFixed(2) : 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Range</div>
            <div style="font-size: 14px; color: #666;">€${analysis.min ? analysis.min.toFixed(2) : 'N/A'} - €${analysis.max ? analysis.max.toFixed(2) : 'N/A'}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Comparable Offers</div>
            <div style="font-size: 18px; font-weight: bold; color: #333;">${analysis.comparableCount}</div>
          </div>
        </div>
        <div style="font-size: 11px; color: ${confidenceColor}; text-align: right;">
          Confidence: ${analysis.confidence.toUpperCase()}
        </div>
      </div>

      <div style="background: ${recommendationColor}15; border-left: 4px solid ${recommendationColor}; padding: 12px; border-radius: 4px;">
        <div style="font-weight: bold; color: ${recommendationColor}; margin-bottom: 4px;">
          ${analysis.recommendation}
        </div>
        <div style="color: #333; font-size: 14px;">
          ${analysis.action}
        </div>
      </div>
    </div>
  `;
}

function generateCompetitivePosition(ownOffers, allOffers) {
    // Calculate overall position
    const ownPrices = ownOffers.map(o => calculatePricePerClass(o)).filter(p => p > 0);
    const compPrices = allOffers
        .filter(o => o.competitor_id !== 'our-studio')
        .map(o => calculatePricePerClass(o))
        .filter(p => p > 0);

    if (!ownPrices.length || !compPrices.length) return '';

    const ownAvg = ownPrices.reduce((a, b) => a + b, 0) / ownPrices.length;
    const compAvg = compPrices.reduce((a, b) => a + b, 0) / compPrices.length;
    const diff = ((ownAvg - compAvg) / compAvg) * 100;

    let position, positionColor;
    if (diff > 10) {
        position = 'Premium';
        positionColor = '#9c27b0';
    } else if (diff > -10) {
        position = 'Mid-Market';
        positionColor = '#1976d2';
    } else {
        position = 'Value';
        positionColor = '#2e7d32';
    }

    return `
    <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); border-radius: 8px; padding: 20px; margin-top: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #333;">Competitive Position Summary</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">YOUR AVERAGE</div>
          <div style="font-size: 28px; font-weight: bold; color: #333;">€${ownAvg.toFixed(2)}</div>
          <div style="font-size: 12px; color: #666;">per class</div>
        </div>
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">MARKET AVERAGE</div>
          <div style="font-size: 28px; font-weight: bold; color: #333;">€${compAvg.toFixed(2)}</div>
          <div style="font-size: 12px; color: #666;">per class</div>
        </div>
        <div style="background: white; padding: 16px; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">POSITION</div>
          <div style="font-size: 24px; font-weight: bold; color: ${positionColor};">${position}</div>
          <div style="font-size: 12px; color: #666;">${diff > 0 ? '+' : ''}${diff.toFixed(1)}% vs market</div>
        </div>
      </div>
    </div>
  `;
}

// Initialize pricing dashboard when data loads
document.addEventListener('DOMContentLoaded', () => {
    const checkDataInterval = setInterval(() => {
        if (window._ownStudioOffers && window._offers) {
            clearInterval(checkDataInterval);
            generatePricingRecommendations();
        }
    }, 100);

    setTimeout(() => clearInterval(checkDataInterval), 10000);
});
