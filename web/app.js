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
  }).catch(() => {});
}


function loadPinnedCompetitors() {
  const local = localStorage.getItem("pinnedCompetitors");
  if (local) {
    try {
      pinnedCompetitors = new Set(JSON.parse(local));
    } catch {}
  }
  return fetch("/api/pins")
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then((data) => {
      if (data && Array.isArray(data.competitor_ids)) {
        pinnedCompetitors = new Set(data.competitor_ids);
        localStorage.setItem("pinnedCompetitors", JSON.stringify(data.competitor_ids));
      }
    })
    .catch(() => {});
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
    setStatus(`Status: JS loaded | Offers: ${rows.length}`);
  })
  .catch(() => {
    window._offers = fallbackOffers;
    renderOfferRows(fallbackOffers);
    renderBenchmark(fallbackOffers);
    renderCompetitorBenchmark(fallbackOffers, null);
    setStatus("Status: JS loaded | Offers: fallback");
  });

fetch("/api/competitors")
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((rows) => {
    window._competitors = rows;
    renderCompetitorRows(rows);
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
    renderCompetitorRows(fallbackCompetitors);
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
    renderCompetitorRows(window._competitors);
    updatePinnedMarkers();
  }
  loadRefreshStatus();
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
    .catch(() => {});
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

fetch("/api/own_studio")
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
  .catch(() => {});

window.addEventListener("error", (event) => {
  setStatus(`Error: ${event.message}`);
});
