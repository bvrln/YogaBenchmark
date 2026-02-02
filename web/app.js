const offersBody = document.getElementById("offers-body");
const competitorsBody = document.getElementById("competitors-body");
const benchmarkBody = document.getElementById("benchmark-body");
const competitorBenchmarkBody = document.getElementById("competitor-benchmark-body");
const competitorDetail = document.getElementById("competitor-detail");
const competitorOffersBody = document.getElementById("competitor-offers-body");
const statusLine = document.getElementById("status-line");
const refreshButton = document.getElementById("refresh-pricing");
const refreshStatus = document.getElementById("refresh-status");
window.__app_js_loaded = true;

const fallbackOffers = [
  {
    competitor_id: "our-studio",
    studio: "Movement's Yoga",
    tier: "Our studio",
    offer: "Drop-in",
    offer_type: "drop_in",
    class_type: "vinyasa",
    heat: "none",
    class_length_min: "60",
    sessions_included: "",
    duration_days: "",
    price_eur: "22",
    price: "EUR 22",
    price_per_class: "22.00",
  },
  {
    competitor_id: "comp-001",
    studio: "Saints & Stars",
    tier: "Tier 3",
    offer: "Unlimited / month",
    offer_type: "membership",
    class_type: "hot_yoga",
    heat: "hot",
    class_length_min: "60",
    sessions_included: "",
    duration_days: "30",
    price_eur: "149",
    price: "EUR 149",
    price_per_class: "18.62",
  },
  {
    competitor_id: "comp-003",
    studio: "YogaWorks De Pijp",
    tier: "Tier 1",
    offer: "Drop-in",
    offer_type: "drop_in",
    class_type: "vinyasa",
    heat: "none",
    class_length_min: "60",
    sessions_included: "",
    duration_days: "",
    price_eur: "20",
    price: "EUR 20",
    price_per_class: "20.00",
  },
  {
    competitor_id: "comp-004",
    studio: "Hot Flow Studio",
    tier: "Tier 2",
    offer: "10-class pack",
    offer_type: "pack",
    class_type: "hot_yoga",
    heat: "hot",
    class_length_min: "60",
    sessions_included: "10",
    duration_days: "180",
    price_eur: "150",
    price: "EUR 150",
    price_per_class: "15.00",
  },
  {
    competitor_id: "comp-005",
    studio: "Urban Zen",
    tier: "Tier 2",
    offer: "Intro 2 weeks",
    offer_type: "intro",
    class_type: "yin",
    heat: "none",
    class_length_min: "60",
    sessions_included: "",
    duration_days: "14",
    price_eur: "25",
    price: "EUR 25",
    price_per_class: "25.00",
  },
];

const fallbackCompetitors = [
  { name: "Saints & Stars", tier: "Tier 3", distance_walk_min: "", distance_bike_min: "15", segment: "boutique", latitude: 52.364, longitude: 4.881 },
  { name: "SportCity", tier: "Tier 3", distance_walk_min: "", distance_bike_min: "20", segment: "gym chain", latitude: 52.370, longitude: 4.899 },
  { name: "YogaWorks De Pijp", tier: "Tier 1", distance_walk_min: "8", distance_bike_min: "3", segment: "studio", latitude: 52.356, longitude: 4.892 },
  { name: "Hot Flow Studio", tier: "Tier 2", distance_walk_min: "18", distance_bike_min: "8", segment: "hot yoga", latitude: 52.369, longitude: 4.871 },
  { name: "Urban Zen", tier: "Tier 2", distance_walk_min: "20", distance_bike_min: "9", segment: "studio", latitude: 52.359, longitude: 4.907 },
  { name: "Studio Flow", tier: "Tier 1", distance_walk_min: "12", distance_bike_min: "5", segment: "studio", latitude: 52.352, longitude: 4.894 },
  { name: "Yin House", tier: "Tier 2", distance_walk_min: "22", distance_bike_min: "10", segment: "yin", latitude: 52.373, longitude: 4.906 },
  { name: "Balance Loft", tier: "Tier 2", distance_walk_min: "19", distance_bike_min: "9", segment: "studio", latitude: 52.344, longitude: 4.889 },
  { name: "Flow & Fire", tier: "Tier 1", distance_walk_min: "10", distance_bike_min: "4", segment: "hot yoga", latitude: 52.361, longitude: 4.885 },
  { name: "Lotus Dock", tier: "Tier 3", distance_walk_min: "", distance_bike_min: "18", segment: "studio", latitude: 52.380, longitude: 4.873 },
  { name: "Pilates Loft", tier: "Tier 2", distance_walk_min: "21", distance_bike_min: "9", segment: "pilates", latitude: 52.368, longitude: 4.917 },
  { name: "Barre Bridge", tier: "Tier 2", distance_walk_min: "23", distance_bike_min: "11", segment: "barre", latitude: 52.349, longitude: 4.902 },
  { name: "Vinyasa Room", tier: "Tier 1", distance_walk_min: "9", distance_bike_min: "4", segment: "vinyasa", latitude: 52.357, longitude: 4.882 },
  { name: "Ashtanga Deck", tier: "Tier 2", distance_walk_min: "20", distance_bike_min: "8", segment: "ashtanga", latitude: 52.365, longitude: 4.911 },
  { name: "Yin & Tonic", tier: "Tier 2", distance_walk_min: "24", distance_bike_min: "11", segment: "yin", latitude: 52.341, longitude: 4.899 },
];

const ownLocations = [
  { name: "Movements Vondelpark", latitude: 52.361690, longitude: 4.870534 },
  { name: "Movements City", latitude: 52.361297, longitude: 4.897846 },
  { name: "Movements LABzuid", latitude: 52.348275, longitude: 4.865838 },
  { name: "Movements Haarlem", latitude: 52.385384, longitude: 4.636080 },
];

let pinnedCompetitors = new Set();
window._selectedCompetitorName = "";
window._ownStudioOffers = [];
window._filterState = {
  searchQuery: "",
  tierFilter: "all",
  segmentFilter: [],
  distanceMax: 30,
  showComparableOnly: false,
};

// ============================================================================
// COMPARABILITY SCORING
// ============================================================================

/**
 * Calculate comparability score between two offers (0-100)
 * Higher score = more comparable offerings
 */
function calculateComparability(offer1, offer2) {
  if (!offer1 || !offer2) return 0;

  let score = 0;
  const offerType1 = (offer1.offer_type || "").toLowerCase();
  const offerType2 = (offer2.offer_type || "").toLowerCase();
  const isMembership1 = offerType1 === "membership" || offerType1 === "subscription";
  const isMembership2 = offerType2 === "membership" || offerType2 === "subscription";

  // For memberships, use different scoring weights
  if (isMembership1 && isMembership2) {
    score += scoreClassType(offer1.class_type, offer2.class_type, 25);
    score += scoreHeatLevel(offer1.heat, offer2.heat, 20);
    score += scoreClassLength(offer1.class_length_min, offer2.class_length_min, 15);
    score += scoreUsageRestrictions(offer1, offer2, 25);
    score += scoreContractTerms(offer1, offer2, 15);
  } else {
    // For drop-ins and packs
    score += scoreClassType(offer1.class_type, offer2.class_type, 35);
    score += scoreHeatLevel(offer1.heat, offer2.heat, 25);
    score += scoreClassLength(offer1.class_length_min, offer2.class_length_min, 20);
    score += scoreOfferType(offer1.offer_type, offer2.offer_type, 20);
  }

  return Math.round(score);
}

function scoreClassType(type1, type2, maxPoints) {
  const t1 = (type1 || "").toLowerCase().trim();
  const t2 = (type2 || "").toLowerCase().trim();

  if (!t1 || !t2) return 0;
  if (t1 === t2) return maxPoints;

  // Similar class types
  const similar = [
    ["yoga", "vinyasa", "vinyasa_flow", "hatha", "power_yoga"],
    ["hot_yoga", "heated_yoga", "bikram", "bikram_26_2"],
    ["pilates", "reformer", "reformer_pilates", "mat_pilates"],
    ["yin", "yin_restorative", "restorative"],
  ];

  for (const group of similar) {
    if (group.includes(t1) && group.includes(t2)) {
      return Math.round(maxPoints * 0.7);
    }
  }

  return 0;
}

function scoreHeatLevel(heat1, heat2, maxPoints) {
  const h1 = (heat1 || "none").toLowerCase().trim();
  const h2 = (heat2 || "none").toLowerCase().trim();

  if (h1 === h2) return maxPoints;

  // Close heat levels
  const closeMatches = [
    ["hot", "warm"],
    ["warm", "heated"],
  ];

  for (const pair of closeMatches) {
    if ((pair[0] === h1 && pair[1] === h2) || (pair[1] === h1 && pair[0] === h2)) {
      return Math.round(maxPoints * 0.5);
    }
  }

  return 0;
}

function scoreClassLength(len1, len2, maxPoints) {
  const l1 = Number(len1);
  const l2 = Number(len2);

  if (!Number.isFinite(l1) || !Number.isFinite(l2)) return 0;
  if (l1 === l2) return maxPoints;

  const diff = Math.abs(l1 - l2);
  if (diff <= 15) return Math.round(maxPoints * 0.5);

  return 0;
}

function scoreOfferType(type1, type2, maxPoints) {
  const t1 = (type1 || "").toLowerCase().trim();
  const t2 = (type2 || "").toLowerCase().trim();

  if (!t1 || !t2) return 0;
  if (t1 === t2) return maxPoints;

  // Similar offer structures
  if ((t1 === "pack" || t1 === "bundle") && (t2 === "pack" || t2 === "bundle")) {
    return Math.round(maxPoints * 0.5);
  }

  return 0;
}

function scoreUsageRestrictions(offer1, offer2, maxPoints) {
  // Use new automated fields if available
  const usageType1 = (offer1.usage_limit_type || "").toLowerCase();
  const usageType2 = (offer2.usage_limit_type || "").toLowerCase();

  // If we have the new fields, use them
  if (usageType1 && usageType2) {
    // Both unlimited
    if (usageType1 === "unlimited" && usageType2 === "unlimited") {
      return maxPoints;
    }

    // Both have same restriction type
    if (usageType1 === usageType2) {
      const value1 = Number(offer1.usage_limit_value || 0);
      const value2 = Number(offer2.usage_limit_value || 0);

      // Exact match
      if (value1 === value2) return maxPoints;

      // Close match (within 1 class difference)
      if (Math.abs(value1 - value2) <= 1) return Math.round(maxPoints * 0.8);

      // Same type but different values (e.g., 2x/week vs 3x/week)
      return Math.round(maxPoints * 0.4);
    }

    // One unlimited, one limited
    return Math.round(maxPoints * 0.2);
  }

  // Fallback to old logic if new fields not available
  const sessions1 = offer1.sessions_included || "";
  const sessions2 = offer2.sessions_included || "";
  const unlimited1 = sessions1.toLowerCase().includes("unlimited") || sessions1 === "";
  const unlimited2 = sessions2.toLowerCase().includes("unlimited") || sessions2 === "";

  if (unlimited1 && unlimited2) return maxPoints;
  if (!unlimited1 && !unlimited2) return Math.round(maxPoints * 0.6);
  return Math.round(maxPoints * 0.2);
}

function scoreContractTerms(offer1, offer2, maxPoints) {
  // Use new automated fields if available
  const contractType1 = (offer1.contract_type || "").toLowerCase();
  const contractType2 = (offer2.contract_type || "").toLowerCase();

  if (contractType1 && contractType2) {
    // Exact match
    if (contractType1 === contractType2) return maxPoints;

    // Similar contracts (month-to-month vs quarterly)
    const flexible = ["month_to_month", "quarterly"];
    const committed = ["semi_annual", "annual"];

    if (flexible.includes(contractType1) && flexible.includes(contractType2)) {
      return Math.round(maxPoints * 0.7);
    }

    if (committed.includes(contractType1) && committed.includes(contractType2)) {
      return Math.round(maxPoints * 0.7);
    }

    // Different commitment levels
    return Math.round(maxPoints * 0.3);
  }

  // Fallback to old logic if new fields not available
  const dur1 = Number(offer1.duration_days || 30);
  const dur2 = Number(offer2.duration_days || 30);

  if (!Number.isFinite(dur1) || !Number.isFinite(dur2)) return Math.round(maxPoints * 0.5);
  if (dur1 === dur2) return maxPoints;
  if (Math.abs(dur1 - dur2) <= 7) return Math.round(maxPoints * 0.5);
  return 0;
}

/**
 * Get comparability level and color
 */
function getComparabilityLevel(score) {
  if (score >= 85) return { level: "high", color: "#2e7d32", icon: "🟢", label: "Highly comparable" };
  if (score >= 60) return { level: "medium", color: "#f57c00", icon: "🟡", label: "Moderately comparable" };
  return { level: "low", color: "#c62828", icon: "🔴", label: "Not comparable" };
}

/**
 * Get comparability breakdown for tooltip
 */
function getComparabilityBreakdown(offer1, offer2) {
  const classMatch = scoreClassType(offer1.class_type, offer2.class_type, 100) >= 50;
  const heatMatch = scoreHeatLevel(offer1.heat, offer2.heat, 100) >= 50;
  const lengthMatch = scoreClassLength(offer1.class_length_min, offer2.class_length_min, 100) >= 50;

  return `Class type: ${classMatch ? "✓" : "✗"} | Heat: ${heatMatch ? "✓" : "✗"} | Duration: ${lengthMatch ? "✓" : "✗"}`;
}

// ============================================================================
// EXISTING FUNCTIONS
// ============================================================================

function isOurStudio(row) {
  const name = (row.name || "").toLowerCase();
  const website = (row.website || "").toLowerCase();
  return name.includes("movements") || website.includes("movementsyoga.com");
}

function setStatus(message) {
  if (statusLine) {
    statusLine.textContent = message;
  }
}

function setRefreshStatus(message) {
  if (refreshStatus) {
    refreshStatus.textContent = message;
  }
}

setStatus("Status: JS loaded");

function renderOfferRows(rows) {
  offersBody.innerHTML = "";
  rows.slice(0, 50).forEach((row) => {
    const tr = document.createElement("tr");
    const offerLabel = formatOfferLabel(row);
    tr.innerHTML = `
      <td>${row.studio || ""}</td>
      <td>${row.tier || ""}</td>
      <td>${offerLabel}</td>
      <td>${row.price || ""}</td>
    `;
    offersBody.appendChild(tr);
  });
}

function renderCompetitorRows(rows) {
  competitorsBody.innerHTML = "";
  const filtered = rows.filter((row) => !isOurStudio(row));
  const sorted = [...filtered].sort((a, b) => {
    const aDist = getDistance(a);
    const bDist = getDistance(b);
    if (aDist === bDist) {
      return (a.name || "").localeCompare(b.name || "");
    }
    return aDist - bDist;
  });
  const pinned = sorted.filter((row) => pinnedCompetitors.has(row.competitor_id));
  const unpinned = sorted.filter((row) => !pinnedCompetitors.has(row.competitor_id));
  const ordered = [...pinned, ...unpinned];
  window._rowIndex = new Map();
  ordered.forEach((row) => {
    const distance = row.distance_walk_min
      ? `${row.distance_walk_min}m walk`
      : row.distance_bike_min
        ? `${row.distance_bike_min}m bike`
        : "";
    const tr = document.createElement("tr");
    tr.classList.add("clickable");
    if (pinnedCompetitors.has(row.competitor_id)) {
      tr.classList.add("pinned-row");
    }
    const pinButton = document.createElement("button");
    pinButton.className = `pin-button ${pinnedCompetitors.has(row.competitor_id) ? "pinned" : ""}`;
    pinButton.textContent = pinnedCompetitors.has(row.competitor_id) ? "Pinned" : "Pin";
    pinButton.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePin(row);
    });
    tr.innerHTML = `
      <td class="pin-cell"></td>
      <td>${row.name || row.brand || ""}</td>
      <td>${row.tier || ""}</td>
      <td>${distance}</td>
      <td>${row.segment || ""}</td>
    `;
    tr.querySelector(".pin-cell").appendChild(pinButton);
    tr.addEventListener("click", () => showCompetitorDetail(row));
    competitorsBody.appendChild(tr);
    if (row.competitor_id) {
      window._rowIndex.set(row.competitor_id, tr);
    }
  });
}

function getDistance(row) {
  const walk = Number(row.distance_walk_min);
  const bike = Number(row.distance_bike_min);
  const candidates = [walk, bike].filter((value) => Number.isFinite(value) && value > 0);
  return candidates.length ? Math.min(...candidates) : 9999;
}

function buildMap(rows) {
  const map = L.map("map").setView([ownLocations[0].latitude, ownLocations[0].longitude], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  const redIcon = L.icon({
    iconUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='42' viewBox='0 0 28 42'><path d='M14 0C6.3 0 0 6.3 0 14c0 11.5 14 28 14 28s14-16.5 14-28C28 6.3 21.7 0 14 0z' fill='#c62828'/><circle cx='14' cy='14' r='6' fill='#fff'/></svg>"
      ),
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -32],
  });

  const blueIcon = L.icon({
    iconUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='42' viewBox='0 0 28 42'><path d='M14 0C6.3 0 0 6.3 0 14c0 11.5 14 28 14 28s14-16.5 14-28C28 6.3 21.7 0 14 0z' fill='#1e5aa8'/><circle cx='14' cy='14' r='6' fill='#fff'/></svg>"
      ),
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -32],
  });

  const greenIcon = L.icon({
    iconUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='42' viewBox='0 0 28 42'><path d='M14 0C6.3 0 0 6.3 0 14c0 11.5 14 28 14 28s14-16.5 14-28C28 6.3 21.7 0 14 0z' fill='#2e7d32'/><circle cx='14' cy='14' r='6' fill='#fff'/></svg>"
      ),
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -32],
  });

  window._mapState = {
    map,
    redIcon,
    blueIcon,
    greenIcon,
    markers: new Map(),
    markersByName: new Map(),
  };

  const bounds = L.latLngBounds();
  ownLocations.forEach((studio) => {
    const marker = L.marker([studio.latitude, studio.longitude], { icon: redIcon })
      .addTo(map)
      .bindPopup(`<strong>${studio.name}</strong><br>Our studio`);
    bounds.extend(marker.getLatLng());
  });

  rows.forEach((row) => {
    if (isOurStudio(row) || row.competitor_id === "our-studio") {
      return;
    }
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const isPinned = pinnedCompetitors.has(row.competitor_id);
      const marker = L.marker([lat, lng], { icon: isPinned ? greenIcon : blueIcon })
        .addTo(map)
        .bindPopup(
          `<strong>${row.name || row.brand || "Studio"}</strong><br>${row.tier || ""}` +
          `<br><button class="pin-button popup-pin">Pin</button>`
        );
      bounds.extend(marker.getLatLng());
      marker.on("click", () => showCompetitorDetail(row));
      marker.on("popupopen", () => {
        const container = marker.getPopup().getElement();
        if (!container) {
          return;
        }
        const button = container.querySelector(".popup-pin");
        if (!button) {
          return;
        }
        button.onclick = () => togglePin(row);
        button.textContent = pinnedCompetitors.has(row.competitor_id) ? "Pinned" : "Pin";
        button.className = `pin-button popup-pin ${pinnedCompetitors.has(row.competitor_id) ? "pinned" : ""}`;
      });
      if (row.competitor_id) {
        window._mapState.markers.set(row.competitor_id, marker);
      }
      const markerName = (row.name || row.brand || "").toLowerCase();
      if (markerName) {
        window._mapState.markersByName.set(markerName, marker);
      }
    }
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }
}

function updatePinnedMarkers() {
  const mapState = window._mapState;
  if (!mapState) {
    return;
  }
  mapState.markers.forEach((marker, competitorId) => {
    const isPinned = pinnedCompetitors.has(competitorId);
    marker.setIcon(isPinned ? mapState.greenIcon : mapState.blueIcon);
  });
  highlightCompetitorMarker(window._selectedCompetitorId || "");
}

function renderBenchmark(offers) {
  const groups = new Map();
  offers.forEach((offer) => {
    const key = [
      offer.offer_type || "",
      offer.class_type || "",
      offer.class_length_min || "",
      offer.heat || "",
    ].join("|");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    const price = Number(offer.price_per_class || offer.price_eur);
    if (Number.isFinite(price)) {
      groups.get(key).push(price);
    }
  });

  const rows = [];
  groups.forEach((prices, key) => {
    if (!prices.length) {
      return;
    }
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    const [offerType, classType, length, heat] = key.split("|");
    rows.push({
      offerType: offerType || "-",
      classType: classType || "-",
      length: length ? `${length}m` : "-",
      heat: heat || "-",
      min: prices[0],
      median,
      max: prices[prices.length - 1],
      count: prices.length,
    });
  });

  rows.sort((a, b) => a.offerType.localeCompare(b.offerType));
  benchmarkBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.offerType}</td>
      <td>${row.classType}</td>
      <td>${row.length}</td>
      <td>${row.heat}</td>
      <td>EUR ${row.min.toFixed(2)}</td>
      <td>EUR ${row.median.toFixed(2)}</td>
      <td>EUR ${row.max.toFixed(2)}</td>
      <td>${row.count}</td>
    `;
    benchmarkBody.appendChild(tr);
  });
}

// ============================================================================
// FILTERING AND INSIGHTS
// ============================================================================

function applyFilters(competitors, offers) {
  const { searchQuery, tierFilter, segmentFilter, showComparableOnly } = window._filterState;

  let filteredCompetitors = competitors.filter((comp) => !isOurStudio(comp));

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredCompetitors = filteredCompetitors.filter((comp) => {
      const name = (comp.name || "").toLowerCase();
      const address = (comp.address || "").toLowerCase();
      const city = (comp.city || "").toLowerCase();
      return name.includes(query) || address.includes(query) || city.includes(query);
    });
  }

  // Tier filter
  if (tierFilter !== "all") {
    filteredCompetitors = filteredCompetitors.filter((comp) => comp.tier === tierFilter);
  }

  // Segment filter
  if (segmentFilter.length > 0 && !segmentFilter.includes("all")) {
    filteredCompetitors = filteredCompetitors.filter((comp) => {
      const segment = (comp.segment || "").toLowerCase();
      return segmentFilter.some((s) => segment.includes(s.toLowerCase()));
    });
  }

  updateFilterStatus(filteredCompetitors.length, competitors.length);
  return filteredCompetitors;
}

function updateFilterStatus(filtered, total) {
  const statusEl = document.getElementById("filter-status");
  if (!statusEl) return;

  const activeFilters = [];
  if (window._filterState.searchQuery) activeFilters.push("search");
  if (window._filterState.tierFilter !== "all") activeFilters.push("tier");
  if (window._filterState.segmentFilter.length > 0) activeFilters.push("segment");

  if (activeFilters.length === 0) {
    statusEl.textContent = `Showing all ${total} competitors`;
  } else {
    statusEl.textContent = `Showing ${filtered} of ${total} competitors (${activeFilters.length} filter${activeFilters.length > 1 ? "s" : ""} active)`;
  }
}

function generatePricingInsights(offers) {
  const insightsContainer = document.getElementById("insights-container");
  if (!insightsContainer) return;

  const ownOffers = offers.filter((o) => isOurStudio({ name: o.studio }));
  if (ownOffers.length === 0) {
    insightsContainer.innerHTML = '<p class="note">No Movement\'s Yoga offers found</p>';
    return;
  }

  const insights = [];

  ownOffers.forEach((ownOffer) => {
    const comparableOffers = offers.filter((o) => {
      if (isOurStudio({ name: o.studio })) return false;
      const score = calculateComparability(ownOffer, o);
      return score >= 85;
    });

    if (comparableOffers.length === 0) {
      insights.push({
        type: "warning",
        text: `⚠ ${ownOffer.offer || ownOffer.offer_type}: No comparable offers found - limited market data`
      });
      return;
    }

    const prices = comparableOffers
      .map((o) => Number(o.price_per_class || o.price_eur))
      .filter((p) => Number.isFinite(p))
      .sort((a, b) => a - b);

    if (prices.length === 0) return;

    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    const ownPrice = Number(ownOffer.price_per_class || ownOffer.price_eur);

    if (!Number.isFinite(ownPrice)) return;

    const delta = ownPrice - median;
    const percentDelta = ((delta / median) * 100).toFixed(1);

    if (Math.abs(delta) < median * 0.05) {
      // Within 5% - competitive
      insights.push({
        type: "recommendation",
        text: `✓ ${ownOffer.offer || ownOffer.offer_type} (€${ownPrice.toFixed(2)}): Competitive vs ${comparableOffers.length} comparable offers (median €${median.toFixed(2)})`
      });
    } else if (delta > 0) {
      // Above market
      const suggestedPrice = median.toFixed(2);
      insights.push({
        type: "opportunity",
        text: `💡 ${ownOffer.offer || ownOffer.offer_type} (€${ownPrice.toFixed(2)}): ${percentDelta}% above market median (€${median.toFixed(2)}) - consider €${suggestedPrice}`
      });
    } else {
      // Below market
      insights.push({
        type: "opportunity",
        text: `📈 ${ownOffer.offer || ownOffer.offer_type} (€${ownPrice.toFixed(2)}): ${Math.abs(percentDelta)}% below market - opportunity to increase to €${median.toFixed(2)}`
      });
    }
  });

  if (insights.length === 0) {
    insightsContainer.innerHTML = '<p class="note">Pin competitors to see pricing insights</p>';
    return;
  }

  insightsContainer.innerHTML = insights
    .map((insight) => `<div class="insight-item insight-${insight.type}">${insight.text}</div>`)
    .join("");
}

function setupFilters() {
  const searchInput = document.getElementById("search-input");
  const tierFilter = document.getElementById("tier-filter");
  const segmentFilter = document.getElementById("segment-filter");
  const comparableOnly = document.getElementById("comparable-only");
  const resetButton = document.getElementById("reset-filters");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      window._filterState.searchQuery = e.target.value;
      refreshCompetitorList();
    });
  }

  if (tierFilter) {
    tierFilter.addEventListener("change", (e) => {
      window._filterState.tierFilter = e.target.value;
      refreshCompetitorList();
    });
  }

  if (segmentFilter) {
    segmentFilter.addEventListener("change", (e) => {
      const value = e.target.value;
      window._filterState.segmentFilter = value === "all" ? [] : [value];
      refreshCompetitorList();
    });
  }

  if (comparableOnly) {
    comparableOnly.addEventListener("change", (e) => {
      window._filterState.showComparableOnly = e.target.checked;
      refreshCompetitorList();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      window._filterState = {
        searchQuery: "",
        tierFilter: "all",
        segmentFilter: [],
        distanceMax: 30,
        showComparableOnly: false,
      };
      if (searchInput) searchInput.value = "";
      if (tierFilter) tierFilter.value = "all";
      if (segmentFilter) segmentFilter.value = "all";
      if (comparableOnly) comparableOnly.checked = false;
      refreshCompetitorList();
    });
  }
}

function refreshCompetitorList() {
  if (!window._competitors) return;
  const filtered = applyFilters(window._competitors, window._offers || []);
  renderCompetitorRows(filtered);
}

// ============================================================================
// TOP COMPARABLE COMPETITORS RECOMMENDATION
// ============================================================================

/**
 * Calculate overall similarity score for a competitor vs Movement's Yoga
 * Returns average comparability across all offer combinations
 */
function calculateCompetitorSimilarity(competitor, ownOffers, allOffers) {
  const competitorOffers = allOffers.filter((o) =>
    o.competitor_id === competitor.competitor_id || o.studio === competitor.name
  );

  if (competitorOffers.length === 0) return 0;

  let totalScore = 0;
  let comparisons = 0;

  // Compare each own offer with each competitor offer
  ownOffers.forEach((ownOffer) => {
    competitorOffers.forEach((compOffer) => {
      const score = calculateComparability(ownOffer, compOffer);
      totalScore += score;
      comparisons++;
    });
  });

  if (comparisons === 0) return 0;

  const avgScore = totalScore / comparisons;

  // Bonus points for matching characteristics
  let bonusScore = 0;

  // Segment match (hot yoga, boutique, etc.)
  const segment = (competitor.segment || "").toLowerCase();
  if (segment.includes("hot") || segment.includes("yoga") || segment.includes("boutique")) {
    bonusScore += 10;
  }

  // Tier proximity (Tier 1 and 2 are more relevant)
  if (competitor.tier === "Tier 1") {
    bonusScore += 15;
  } else if (competitor.tier === "Tier 2") {
    bonusScore += 10;
  }

  // Distance proximity
  const distance = getDistance(competitor);
  if (distance < 15) {
    bonusScore += 10;
  } else if (distance < 25) {
    bonusScore += 5;
  }

  return Math.min(100, avgScore + bonusScore);
}

/**
 * Generate and display top comparable competitors
 */
function generateTopCompetitors(competitors, offers) {
  const listEl = document.getElementById("top-competitors-list");
  if (!listEl) return;

  const ownOffers = offers.filter((o) => isOurStudio({ name: o.studio }));
  if (ownOffers.length === 0) {
    listEl.innerHTML = '<p class="note">No Movement\'s Yoga offers found</p>';
    return;
  }

  // Calculate similarity for each competitor
  const scored = competitors
    .filter((comp) => !isOurStudio(comp))
    .map((comp) => ({
      competitor: comp,
      score: calculateCompetitorSimilarity(comp, ownOffers, offers),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (scored.length === 0) {
    listEl.innerHTML = '<p class="note">No comparable competitors found</p>';
    return;
  }

  // Store top competitors for pin button
  window._topCompetitors = scored.slice(0, 5).map((item) => item.competitor);

  // Render list
  const html = scored.map((item, index) => {
    const { competitor, score } = item;
    const distance = competitor.distance_walk_min
      ? `${competitor.distance_walk_min}m walk`
      : competitor.distance_bike_min
        ? `${competitor.distance_bike_min}m bike`
        : "";

    const isPinned = pinnedCompetitors.has(competitor.competitor_id);
    const level = getComparabilityLevel(score);

    return `
      <div class="top-competitor-item ${index < 5 ? 'top-5' : ''}" data-competitor-id="${competitor.competitor_id}">
        <div class="top-competitor-rank">${index + 1}</div>
        <div class="top-competitor-info">
          <div class="top-competitor-name">${competitor.name || competitor.brand || "Unknown"}</div>
          <div class="top-competitor-meta">${competitor.tier || ""} • ${distance} • ${competitor.segment || ""}</div>
        </div>
        <div class="top-competitor-score">
          <span class="comparability-badge comparability-${level.level}" title="${level.label}">
            ${score.toFixed(0)}%
          </span>
          ${isPinned ? '<span class="pinned-indicator">📌</span>' : ''}
        </div>
      </div>
    `;
  }).join("");

  listEl.innerHTML = html;

  // Add click handlers
  listEl.querySelectorAll(".top-competitor-item").forEach((el) => {
    el.addEventListener("click", () => {
      const competitorId = el.dataset.competitorId;
      const competitor = competitors.find((c) => c.competitor_id === competitorId);
      if (competitor) {
        showCompetitorDetail(competitor);
      }
    });
  });
}

/**
 * Pin top 5 competitors
 */
function pinTopCompetitors() {
  if (!window._topCompetitors || window._topCompetitors.length === 0) {
    alert("No top competitors available to pin");
    return;
  }

  window._topCompetitors.forEach((comp) => {
    if (comp.competitor_id && !pinnedCompetitors.has(comp.competitor_id)) {
      pinnedCompetitors.add(comp.competitor_id);
    }
  });

  savePinnedCompetitors();

  if (window._competitors) {
    const filtered = applyFilters(window._competitors, window._offers || []);
    renderCompetitorRows(filtered);
  }

  if (window._offers) {
    generateTopCompetitors(window._competitors || [], window._offers);
    generatePricingInsights(window._offers);
  }

  updatePinnedMarkers();
  setRefreshStatus("Top competitors pinned - pricing refresh recommended");
}


function togglePin(row) {
  if (!row.competitor_id) {
    return;
  }
  if (pinnedCompetitors.has(row.competitor_id)) {
    pinnedCompetitors.delete(row.competitor_id);
  } else {
    if (pinnedCompetitors.size >= 10) {
      alert("You can pin up to 10 competitors.");
      return;
    }
    pinnedCompetitors.add(row.competitor_id);
  }
  savePinnedCompetitors();
  if (window._competitors) {
    renderCompetitorRows(window._competitors);
  }
  updatePinnedMarkers();
  if (refreshStatus) {
    setRefreshStatus("Pricing refresh recommended");
  }
}


function savePinnedCompetitors() {
  const payload = Array.from(pinnedCompetitors);
  localStorage.setItem("pinnedCompetitors", JSON.stringify(payload));
  fetch("/api/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitor_ids: payload }),
  }).catch(() => { });
}


function loadPinnedCompetitors() {
  const local = localStorage.getItem("pinnedCompetitors");
  if (local) {
    try {
      pinnedCompetitors = new Set(JSON.parse(local));
    } catch { }
  }
  return fetch("/api/pins")
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then((data) => {
      if (data && Array.isArray(data.competitor_ids)) {
        pinnedCompetitors = new Set(data.competitor_ids);
        localStorage.setItem("pinnedCompetitors", JSON.stringify(data.competitor_ids));
      }
    })
    .catch(() => { });
}


function renderCompetitorBenchmark(offers, selectedId) {
  competitorBenchmarkBody.innerHTML = "";
  const competitorIds = new Set([...pinnedCompetitors]);
  if (selectedId) {
    competitorIds.add(selectedId);
  }
  if (window._ownStudioOffers.length) {
    competitorIds.add("our-studio");
  }

  if (!competitorIds.size) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='8'>Select a competitor or pin key players.</td>";
    competitorBenchmarkBody.appendChild(tr);
    return;
  }

  const marketGroups = new Map();
  offers.forEach((offer) => {
    const key = [
      offer.offer_type || "",
      offer.class_type || "",
      offer.class_length_min || "",
      offer.heat || "",
    ].join("|");
    if (!marketGroups.has(key)) {
      marketGroups.set(key, []);
    }
    const price = Number(offer.price_per_class || offer.price_eur);
    if (Number.isFinite(price)) {
      marketGroups.get(key).push(price);
    }
  });

  const rows = [];
  const selectedOffers = offers.filter((offer) => competitorIds.has(offer.competitor_id));
  selectedOffers.forEach((offer) => {
    const key = [
      offer.offer_type || "",
      offer.class_type || "",
      offer.class_length_min || "",
      offer.heat || "",
    ].join("|");
    const marketPrices = marketGroups.get(key) || [];
    if (!marketPrices.length) {
      return;
    }
    const sorted = [...marketPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const selectedPrice = Number(offer.price_per_class || offer.price_eur);
    if (!Number.isFinite(selectedPrice)) {
      return;
    }
    rows.push({
      player: offer.studio || offer.competitor_id || "Competitor",
      offerType: offer.offer_type || "-",
      classType: offer.class_type || "-",
      length: offer.class_length_min ? `${offer.class_length_min}m` : "-",
      heat: offer.heat || "-",
      selected: selectedPrice,
      median,
      delta: selectedPrice - median,
    });
  });

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const delta = row.delta;
    const deltaLabel = `${delta >= 0 ? "+" : ""}EUR ${Math.abs(delta).toFixed(2)}`;
    tr.innerHTML = `
      <td>${row.player}</td>
      <td>${row.offerType}</td>
      <td>${row.classType}</td>
      <td>${row.length}</td>
      <td>${row.heat}</td>
      <td>EUR ${row.selected.toFixed(2)}</td>
      <td>EUR ${row.median.toFixed(2)}</td>
      <td>${deltaLabel}</td>
    `;
    competitorBenchmarkBody.appendChild(tr);
  });
}

function showCompetitorDetail(row) {
  const name = row.name || row.brand || "Studio";
  window._selectedCompetitorName = name.toLowerCase();
  window._selectedCompetitorId = row.competitor_id || "";
  const website = row.website ? row.website.trim() : "";
  const websiteLine = website ? `<a href="${website}" target="_blank" rel="noopener">Website</a><br>` : "";
  const offers = window._offers || [];
  const filtered = offers.filter(
    (offer) =>
      offer.competitor_id === row.competitor_id ||
      offer.studio === name
  );
  const sources = [];
  filtered.forEach((offer) => {
    if (offer.source_url && !sources.includes(offer.source_url)) {
      sources.push(offer.source_url);
    }
  });
  const sourceLinks = sources.slice(0, 2).map(
    (url) => `<a href="${url}" target="_blank" rel="noopener">Pricing page</a>`
  );
  const highlightItems = filtered
    .slice(0, 5)
    .map((offer) => {
      const label = formatOfferLabel(offer);
      const price = offer.price || (offer.price_eur ? `EUR ${offer.price_eur}` : "");
      return `<li>${label}${price ? ` - ${price}` : ""}</li>`;
    })
    .join("");
  const highlightsHtml = highlightItems ? `<ul class="pricing">${highlightItems}</ul>` : "";
  const sourcesHtml = sourceLinks.length ? `Sources: ${sourceLinks.join(" | ")}<br>` : "";
  competitorDetail.innerHTML = `
    <strong>${name}</strong><br>
    ${row.segment || ""} - ${row.tier || ""}<br>
    ${websiteLine}
    ${sourcesHtml}
    ${row.address || ""} ${row.postcode || ""} ${row.city || ""}
    ${highlightsHtml}
    <div style="margin-top:6px;">
      <button id="detail-pin-button" class="pin-button">Pin</button>
    </div>
  `;
  competitorOffersBody.innerHTML = "";
  if (!filtered.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='10'>No offers available yet.</td>";
    competitorOffersBody.appendChild(tr);
    return;
  }
  filtered.forEach((offer) => {
    const packMetrics = computePackMetrics(offer);
    const visitsWeek = packMetrics.visitsWeek;
    const visitsMonth = packMetrics.visitsMonth;
    const perVisit = packMetrics.pricePerVisit;
    const sessionsLabel = offer.sessions_included || (offer.offer_type === "membership" ? "unlimited" : "");
    const periodLabel = formatPeriodLabel(offer);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${offer.offer || offer.offer_name || ""}</td>
      <td>${offer.offer_type || ""}</td>
      <td>${offer.class_type || ""}</td>
      <td>${offer.class_length_min ? `${offer.class_length_min}m` : ""}</td>
      <td>${sessionsLabel}</td>
      <td>${periodLabel}</td>
      <td>${visitsWeek}</td>
      <td>${visitsMonth}</td>
      <td>${offer.price || (offer.price_eur ? `EUR ${offer.price_eur}` : "")}</td>
      <td>${perVisit}</td>
    `;
    competitorOffersBody.appendChild(tr);
  });

  renderCompetitorBenchmark(offers, row.competitor_id);
  highlightCompetitorMarker(row.competitor_id);
  highlightCompetitorRow(row.competitor_id);
  updateCompetitorDetailPinButton(row);
}

function computePackMetrics(offer) {
  const offerType = (offer.offer_type || "").toLowerCase();
  const sessions = Number(offer.sessions_included);
  const duration = Number(offer.duration_days);
  const price = Number(offer.price_eur || offer.price_per_class);

  if (offerType !== "pack" && offerType !== "bundle" && offerType !== "membership") {
    return {
      visitsWeek: "",
      visitsMonth: "",
      pricePerVisit: offer.price_per_class ? `EUR ${offer.price_per_class}` : "",
    };
  }

  let visitsWeek = "";
  let visitsMonth = "";
  if (offerType === "membership" && (!Number.isFinite(sessions) || sessions <= 0)) {
    visitsWeek = "unlimited";
    visitsMonth = "unlimited";
  } else if (Number.isFinite(sessions) && sessions > 0) {
    if (Number.isFinite(duration) && duration > 0) {
      visitsWeek = (sessions / (duration / 7)).toFixed(2);
      visitsMonth = (sessions / (duration / 30)).toFixed(2);
    } else {
      visitsWeek = "indef";
      visitsMonth = "indef";
    }
  }

  let pricePerVisit = "";
  if (Number.isFinite(sessions) && sessions > 0 && Number.isFinite(price)) {
    pricePerVisit = `EUR ${(price / sessions).toFixed(2)}`;
  } else if (offer.price_per_class) {
    pricePerVisit = `EUR ${offer.price_per_class}`;
  }

  return { visitsWeek, visitsMonth, pricePerVisit };
}

function formatOfferLabel(offer) {
  if (offer.offer && offer.offer.length <= 80) {
    return offer.offer;
  }
  const offerType = (offer.offer_type || "").toLowerCase();
  const sessions = offer.sessions_included ? `${offer.sessions_included}-class` : "";
  if (offerType === "drop_in") {
    return "Drop-in class";
  }
  if (offerType === "intro") {
    return "Intro offer";
  }
  if (offerType === "membership") {
    const unit = formatPeriodLabel(offer);
    return unit ? `Membership (${unit})` : "Membership";
  }
  if (offerType === "pack" && sessions) {
    const period = formatPeriodLabel(offer);
    return period ? `${sessions} pack (${period})` : `${sessions} pack`;
  }
  return offer.offer || offer.offer_name || "Offer";
}

function formatPeriodLabel(offer) {
  if (offer.duration_days) {
    const days = Number(offer.duration_days);
    if (days === 7) {
      return "1w";
    }
    if (days === 28) {
      return "4w";
    }
    if (days === 30) {
      return "1mo";
    }
    if (days === 90) {
      return "3mo";
    }
    if (days === 180) {
      return "6mo";
    }
    if (days === 365) {
      return "12mo";
    }
    return `${offer.duration_days}d`;
  }
  const unit = (offer.price_unit || "").toLowerCase();
  if (unit === "week") {
    return "per week";
  }
  if (unit === "month") {
    return "per month";
  }
  if (unit === "4_weeks") {
    return "per 4 weeks";
  }
  if (unit === "6_months") {
    return "per 6 months";
  }
  if (unit === "year") {
    return "per year";
  }
  return "";
}

function highlightCompetitorMarker(competitorId) {
  const mapState = window._mapState;
  if (!mapState || !competitorId) {
    return;
  }
  mapState.markers.forEach((marker, id) => {
    const isPinned = pinnedCompetitors.has(id);
    marker.setIcon(isPinned ? mapState.greenIcon : mapState.blueIcon);
    marker.setZIndexOffset(0);
  });
  let selectedMarker = mapState.markers.get(competitorId);
  if (!selectedMarker && window._selectedCompetitorName) {
    selectedMarker = mapState.markersByName.get(window._selectedCompetitorName);
  }
  if (selectedMarker) {
    selectedMarker.setIcon(mapState.greenIcon);
    selectedMarker.setZIndexOffset(1000);
    selectedMarker.openPopup();
    mapState.map.panTo(selectedMarker.getLatLng(), { animate: true });
  }
}

function highlightCompetitorRow(competitorId) {
  if (!window._rowIndex) {
    return;
  }
  window._rowIndex.forEach((row) => {
    row.classList.remove("selected-row");
  });
  const row = window._rowIndex.get(competitorId);
  if (row) {
    row.classList.add("selected-row");
  }
}

fetch("/api/offers")
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((rows) => {
    window._offers = rows;
    renderOfferRows(rows);
    renderBenchmark(rows);
    renderCompetitorBenchmark(rows, null);
    generatePricingInsights(rows);
    setStatus(`Status: JS loaded | Offers: ${rows.length}`);
  })
  .catch(() => {
    window._offers = fallbackOffers;
    renderOfferRows(fallbackOffers);
    renderBenchmark(fallbackOffers);
    renderCompetitorBenchmark(fallbackOffers, null);
    generatePricingInsights(fallbackOffers);
    setStatus("Status: JS loaded | Offers: fallback");
  });

fetch("/api/competitors")
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((rows) => {
    window._competitors = rows;
    const filtered = applyFilters(rows, window._offers || []);
    renderCompetitorRows(filtered);
    if (typeof L === "undefined") {
      setStatus("Status: JS loaded | Map error: Leaflet not loaded");
    } else {
      buildMap(rows);
    }
    const base = statusLine ? statusLine.textContent : "Status: JS loaded";
    setStatus(`${base} | Competitors: ${rows.length}`);
  })
  .catch(() => {
    window._competitors = fallbackCompetitors;
    const filtered = applyFilters(fallbackCompetitors, window._offers || []);
    renderCompetitorRows(filtered);
    if (typeof L === "undefined") {
      setStatus("Status: JS loaded | Map error: Leaflet not loaded");
    } else {
      buildMap(fallbackCompetitors);
    }
    const base = statusLine ? statusLine.textContent : "Status: JS loaded";
    setStatus(`${base} | Competitors: fallback`);
  });

loadPinnedCompetitors().then(() => {
  if (window._competitors) {
    const filtered = applyFilters(window._competitors, window._offers || []);
    renderCompetitorRows(filtered);
    updatePinnedMarkers();
  }
  if (window._offers) {
    generatePricingInsights(window._offers);
    generateTopCompetitors(window._competitors || [], window._offers);
  }
  loadRefreshStatus();
  setupFilters();

  // Wire up pin top competitors button
  const pinTopBtn = document.getElementById("pin-top-competitors");
  if (pinTopBtn) {
    pinTopBtn.addEventListener("click", pinTopCompetitors);
  }
});

let refreshPoll = null;

function loadRefreshStatus() {
  fetch("/api/refresh-status")
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then((data) => {
      if (!data) {
        return;
      }
      const message = data.message || "Pricing refresh idle";
      setRefreshStatus(message);
      if (refreshButton) {
        refreshButton.disabled = Boolean(data.in_progress);
      }
      if (data.in_progress && !refreshPoll) {
        refreshPoll = setInterval(loadRefreshStatus, 5000);
      }
      if (!data.in_progress && refreshPoll) {
        clearInterval(refreshPoll);
        refreshPoll = null;
      }
    })
    .catch(() => { });
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    const limit = pinnedCompetitors.size ? pinnedCompetitors.size : 10;
    setRefreshStatus("Pricing refresh: starting...");
    refreshButton.disabled = true;
    fetch("/api/refresh-pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const message = data.message || "Pricing refresh running";
        setRefreshStatus(message);
        if (!refreshPoll) {
          refreshPoll = setInterval(loadRefreshStatus, 5000);
        }
      })
      .catch(() => {
        setRefreshStatus("Pricing refresh failed to start");
        refreshButton.disabled = false;
      });
  });
}

function updateCompetitorDetailPinButton(row) {
  if (!row || !row.competitor_id) {
    return;
  }
  const button = document.getElementById("detail-pin-button");
  if (!button) {
    return;
  }
  button.textContent = pinnedCompetitors.has(row.competitor_id) ? "Pinned" : "Pin";
  button.className = `pin-button ${pinnedCompetitors.has(row.competitor_id) ? "pinned" : ""}`;
  button.onclick = () => togglePin(row);
}

fetch("/api/own-studio")
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((data) => {
    if (!data || !data.name) {
      return;
    }
    const nameEl = document.getElementById("own-name");
    const metaEl = document.getElementById("own-meta");
    const propositionEl = document.getElementById("own-proposition");
    const packagesEl = document.getElementById("own-packages");
    const sourceEl = document.getElementById("own-source");

    if (nameEl) {
      nameEl.textContent = data.name;
    }
    if (metaEl && Array.isArray(data.locations)) {
      metaEl.textContent = `Studios - ${data.locations.join(", ")}`;
    }
    if (propositionEl && Array.isArray(data.proposition)) {
      propositionEl.textContent = data.proposition.join(" ");
    }
    if (packagesEl && Array.isArray(data.packages)) {
      packagesEl.innerHTML = "";
      data.packages.slice(0, 6).forEach((pkg) => {
        const li = document.createElement("li");
        li.textContent = `${pkg.name}: EUR ${pkg.price_eur}${pkg.notes ? ` (${pkg.notes})` : ""}`;
        packagesEl.appendChild(li);
      });
    }
    if (Array.isArray(data.packages)) {
      window._ownStudioOffers = data.packages.map((pkg) => {
        const offerType = pkg.name.toLowerCase().includes("membership")
          ? "membership"
          : pkg.name.toLowerCase().includes("trial")
            ? "intro"
            : pkg.name.toLowerCase().includes("class")
              ? "pack"
              : "unknown";
        return {
          competitor_id: "our-studio",
          studio: data.name,
          offer_type: offerType,
          offer_name: pkg.name,
          class_type: "",
          heat: "",
          class_length_min: "",
          sessions_included: "",
          duration_days: "",
          price_eur: pkg.price_eur,
        };
      });
      if (window._offers && window._offers.length) {
        const merged = [...window._offers, ...window._ownStudioOffers];
        renderCompetitorBenchmark(merged, window._selectedCompetitorId || "");
      }
    }
    if (sourceEl && data.source_url) {
      sourceEl.innerHTML = `Source: <a href="${data.source_url}" target="_blank" rel="noopener">Pricing page</a>`;
    }
  })
  .catch(() => { });

window.addEventListener("error", (event) => {
  setStatus(`Error: ${event.message}`);
});
