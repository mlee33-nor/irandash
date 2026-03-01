// Map module - Leaflet setup and marker management

const MapModule = (function () {
  let map;
  let darkTiles, satTiles;
  let isSatelliteView = false;
  let layers = {
    aircraft: null,
    ships: null,
    events: null,
    conflicts: null,
    news: null,
    bases: null,
    strikes: null,
    earthquakes: null,
    weather: null,
    heatmap: null,
    trails: null,
    measure: null
  };

  // Proximity alert tracking
  let lastProximityAlerts = {};
  let targetLockMarker = null;

  // Track markers by ID for smooth updates
  const markerCache = {
    aircraft: {},
    ships: {},
    events: {},
    conflicts: {},
    news: {}
  };

  // Known military/naval bases in the region
  const NAVAL_BASES = [
    { name: 'BANDAR ABBAS NAVAL BASE', lat: 27.18, lng: 56.28, country: 'Iran', type: 'naval', desc: 'IRIN HQ, Kilo-class subs, fast attack craft. Primary staging point for Strait of Hormuz ops.' },
    { name: 'BUSHEHR NAVAL BASE', lat: 28.97, lng: 50.84, country: 'Iran', type: 'naval', desc: 'IRGCN base, missile boats, mine warfare vessels. Near Bushehr nuclear plant.' },
    { name: 'CHABAHAR NAVAL BASE', lat: 25.30, lng: 60.63, country: 'Iran', type: 'naval', desc: 'Indian Ocean access, outside Strait of Hormuz. Velayat-class submarine ops.' },
    { name: 'JASK NAVAL BASE', lat: 25.65, lng: 57.77, country: 'Iran', type: 'naval', desc: 'IRGCN forward operating base. Drone/missile boat staging for Gulf of Oman.' },
    { name: 'KHARG ISLAND', lat: 29.23, lng: 50.32, country: 'Iran', type: 'naval', desc: 'Major oil export terminal. ~90% of Iran oil exports. IRGCN patrol craft stationed.' },
    { name: 'ABU MUSA ISLAND', lat: 25.87, lng: 55.03, country: 'Iran', type: 'naval', desc: 'Disputed island. IRGC garrison, anti-ship missiles, radar. Controls Gulf shipping lanes.' },
    { name: 'HAIFA NAVAL BASE', lat: 32.82, lng: 34.98, country: 'Israel', type: 'naval', desc: 'Israeli Navy HQ. Sa\'ar corvettes, Dolphin-class submarines (nuclear capable).' },
    { name: 'EILAT NAVAL BASE', lat: 29.55, lng: 34.95, country: 'Israel', type: 'naval', desc: 'Red Sea operations. Sa\'ar 4.5 missile boats. Houthi missile defense.' },
    { name: 'AL UDEID AIR BASE', lat: 25.12, lng: 51.32, country: 'Qatar', type: 'airbase', desc: 'CENTCOM forward HQ. USAF B-52s, KC-135s, ISR assets. ~10,000 US personnel.' },
    { name: 'AL DHAFRA AIR BASE', lat: 24.25, lng: 54.55, country: 'UAE', type: 'airbase', desc: 'USAF F-35s, F-22s, RQ-4 Global Hawks. French Rafale detachment.' },
    { name: 'NSA BAHRAIN / 5TH FLEET HQ', lat: 26.24, lng: 50.55, country: 'Bahrain', type: 'hq', desc: 'US 5th Fleet HQ. CTF-150/151/152/153. ~9,000 US personnel.' },
    { name: 'CAMP ARIFJAN', lat: 29.17, lng: 48.10, country: 'Kuwait', type: 'airbase', desc: 'US Army Central forward HQ. Logistics hub for CENTCOM operations.' },
    { name: 'INCIRLIK AIR BASE', lat: 37.00, lng: 35.43, country: 'Turkey', type: 'airbase', desc: 'NATO/USAF base. B61 nuclear weapons storage. ISR and strike ops.' },
    { name: 'HMEIMIM AIR BASE', lat: 35.41, lng: 35.95, country: 'Syria', type: 'airbase', desc: 'Russian VKS base. Su-35, Su-34, S-400. Primary Russian power projection in ME.' },
    { name: 'TARTUS NAVAL BASE', lat: 34.89, lng: 35.87, country: 'Syria', type: 'naval', desc: 'Russian Navy logistics facility. Only Mediterranean base outside former USSR.' },
    { name: 'NEVATIM AIR BASE', lat: 31.21, lng: 34.93, country: 'Israel', type: 'airbase', desc: 'IAF F-35I Adir squadron. Primary stealth strike base. Targeted by Iran Oct 2024.' },
    { name: 'RAMAT DAVID AB', lat: 32.67, lng: 35.18, country: 'Israel', type: 'airbase', desc: 'IAF F-16I Sufa, helicopter wing. Northern front operations.' },
    { name: 'HATZERIM AIR BASE', lat: 31.23, lng: 34.66, country: 'Israel', type: 'airbase', desc: 'IAF flight academy. F-16C/D squadrons. Negev desert operations.' },
    { name: 'ISFAHAN AFB', lat: 32.75, lng: 51.86, country: 'Iran', type: 'airbase', desc: 'IRIAF F-14A Tomcat, Su-24 base. 8th TFS. Near nuclear facilities.' },
    { name: 'MEHRABAD AFB', lat: 35.69, lng: 51.31, country: 'Iran', type: 'airbase', desc: 'IRIAF transport wing. C-130, Il-76. Tehran air defense sector.' },
    { name: 'TACTICAL AB DEZFUL', lat: 32.43, lng: 48.38, country: 'Iran', type: 'airbase', desc: 'IRIAF F-4E, Su-22. Western front. Iraq border operations.' },
    { name: 'ADEN PORT', lat: 12.80, lng: 45.02, country: 'Yemen', type: 'naval', desc: 'Coalition naval ops. UAE-aligned forces. Red Sea chokepoint control.' },
    // Military ground bases
    { name: 'PARCHIN MILITARY COMPLEX', lat: 35.52, lng: 51.77, country: 'Iran', type: 'military', desc: 'IRGC weapons R&D. Suspected nuclear weapons testing. High-explosive test chambers.' },
    { name: 'NATANZ ENRICHMENT FACILITY', lat: 33.51, lng: 51.73, country: 'Iran', type: 'nuclear', desc: 'Primary uranium enrichment site. Underground centrifuge halls. Stuxnet target 2010.' },
    { name: 'FORDOW ENRICHMENT PLANT', lat: 34.88, lng: 51.59, country: 'Iran', type: 'nuclear', desc: 'Hardened underground enrichment. Built inside mountain near Qom. 60% enrichment.' },
    { name: 'IRGC HQ TEHRAN', lat: 35.70, lng: 51.42, country: 'Iran', type: 'hq', desc: 'Islamic Revolutionary Guard Corps headquarters. Command & control center.' },
    { name: 'SHAHROUD MISSILE BASE', lat: 36.42, lng: 55.02, country: 'Iran', type: 'military', desc: 'IRGC Aerospace Force. Shahab-3, Emad, Khorramshahr ballistic missiles. Space launch.' },
    { name: 'IMAM ALI BASE', lat: 34.55, lng: 45.75, country: 'Iraq', type: 'military', desc: 'IRGC-linked Iraqi PMF base. Iran weapons transfer hub near Syria border.' },
    { name: 'PALMYRA / T4 AIRBASE', lat: 34.52, lng: 37.63, country: 'Syria', type: 'military', desc: 'IRGC drone operations. Repeatedly struck by Israel. Iran forward staging.' },
    { name: 'DIMONA NUCLEAR CENTER', lat: 31.00, lng: 35.14, country: 'Israel', type: 'nuclear', desc: 'Negev Nuclear Research Center. Plutonium production reactor. Israel nuclear arsenal.' },
    { name: 'BUSHEHR NUCLEAR PLANT', lat: 28.83, lng: 50.89, country: 'Iran', type: 'nuclear', desc: 'Iran only operating nuclear power plant. Russian-built VVER-1000 reactor. IAEA monitored.' },
    { name: 'ISFAHAN UCF', lat: 32.60, lng: 51.72, country: 'Iran', type: 'nuclear', desc: 'Uranium Conversion Facility. Converts yellowcake to UF6 gas for enrichment. Key fuel cycle node.' },
    { name: 'ARAK IR-40 REACTOR', lat: 34.05, lng: 49.25, country: 'Iran', type: 'nuclear', desc: 'Heavy water research reactor. Redesigned under JCPOA. Plutonium pathway concern.' },
    { name: 'MOSSAD HQ', lat: 32.15, lng: 34.83, country: 'Israel', type: 'hq', desc: 'Institute for Intelligence and Special Operations. Glilot Junction, north Tel Aviv. Foreign intelligence, covert ops, assassinations program.' },
    { name: 'IDF NORTHERN COMMAND', lat: 32.79, lng: 35.53, country: 'Israel', type: 'hq', desc: 'IDF Northern Command HQ. Lebanon/Syria front. Galilee Div, 36th Div ops.' },
    { name: 'IDF SOUTHERN COMMAND', lat: 31.25, lng: 34.79, country: 'Israel', type: 'hq', desc: 'IDF Southern Command. Gaza operations. 162nd Div, 252nd Div. Rafah crossing ops.' },
    { name: 'KING ABDULAZIZ AB', lat: 26.27, lng: 50.15, country: 'Saudi Arabia', type: 'military', desc: 'RSAF F-15SA Eagles. Eastern Province air defense. Gulf coalition ops.' },
    { name: 'PRINCE SULTAN AB', lat: 24.06, lng: 47.58, country: 'Saudi Arabia', type: 'military', desc: 'CENTCOM combined air ops center. US Patriot batteries. THAAD deployment.' },
    { name: 'AL TANF GARRISON', lat: 33.51, lng: 38.97, country: 'Syria', type: 'military', desc: 'US SOF outpost. 55km deconfliction zone. Blocks Iran land bridge to Mediterranean.' },
    { name: 'ERBIL US CONSULATE BASE', lat: 36.19, lng: 44.01, country: 'Iraq', type: 'military', desc: 'US forces compound. C-RAM air defense. Targeted by Iran-backed drones/rockets.' },
    { name: 'AIN AL ASAD AB', lat: 33.80, lng: 42.44, country: 'Iraq', type: 'military', desc: 'US/Coalition air base. Struck by Iran IRGC ballistic missiles Jan 2020.' },
  ];


  function init() {
    map = L.map('map', {
      center: [31.5, 50.0],
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    // Tile layers - dark + satellite
    darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });
    satTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 19
    });
    darkTiles.addTo(map);

    // Create layer groups
    const inactiveLayers = new Set(['earthquakes', 'weather', 'heatmap', 'trails', 'measure']);
    for (const key of Object.keys(layers)) {
      layers[key] = L.layerGroup();
      if (!inactiveLayers.has(key)) {
        layers[key].addTo(map);
      }
    }

    drawRegionOutlines();
    drawNavalBases();
    drawMissileRanges();
    drawStrategicZones();
    drawRadarSweep();
    drawShippingLanes();
    drawDayNightTerminator();
    drawGridOverlay();
    initFogOfWar();

    // Target lock on base/strike marker click
    map.on('popupopen', (e) => {
      const latlng = e.popup.getLatLng();
      if (latlng) showTargetLock(latlng.lat, latlng.lng);
    });

    // Satellite toggle button
    const satBtn = document.getElementById('sat-toggle-btn');
    if (satBtn) satBtn.addEventListener('click', toggleSatellite);

    // HUD: Update coordinates readout on mouse move
    const coordsEl = document.getElementById('coords-readout');
    if (coordsEl) {
      map.on('mousemove', (e) => {
        coordsEl.textContent = `LAT ${e.latlng.lat.toFixed(4)} | LNG ${e.latlng.lng.toFixed(4)}`;
      });
    }

    // Layer toggle buttons
    document.querySelectorAll('.ctrl-btn[data-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        const layer = btn.dataset.layer;
        // Special handling for measure mode
        if (layer === 'measure') {
          btn.classList.toggle('active');
          toggleMeasureMode(btn.classList.contains('active'));
          return;
        }
        btn.classList.toggle('active');
        if (layer === 'heatmap') {
          // Heatmap uses a separate heat layer reference
          if (layers.heatmap._heatRef) {
            if (btn.classList.contains('active')) {
              layers.heatmap._heatRef.addTo(map);
            } else {
              map.removeLayer(layers.heatmap._heatRef);
            }
          }
          return;
        }
        if (layers[layer]) {
          if (btn.classList.contains('active')) {
            map.addLayer(layers[layer]);
          } else {
            map.removeLayer(layers[layer]);
          }
        }
      });
    });
  }

  function drawNavalBases() {
    NAVAL_BASES.forEach(base => {
      let color, symbol, extraStyle = '';
      const countryLower = (base.country || '').toLowerCase();
      // Detect US bases by description (hosted in other countries)
      const isUSBase = /\bus[\s\/]|usaf|centcom|us army|us forces|us sof|us personnel|coalition|5th fleet/i.test(base.desc) || /\bus\b/i.test(base.name);
      const isRussianBase = /russian|russia|vks/i.test(base.desc);

      // Country color mapping
      const countryColors = {
        'iran': '#00ff41',
        'israel': '#3399ff',
        'turkey': '#ef4444',
        'saudi arabia': '#10b981',
        'syria': '#ef4444',
        'iraq': '#ef4444',
        'yemen': '#ef4444',
        'qatar': '#8b1a1a',
        'uae': '#ef4444',
        'bahrain': '#ef4444',
        'kuwait': '#10b981',
      };

      // Country flag images (SVG from flagcdn for cross-platform support)
      const countryFlags = {
        'iran': 'https://flagcdn.com/w40/ir.png',
        'israel': 'https://flagcdn.com/w40/il.png',
        'us': 'https://flagcdn.com/w40/us.png',
        'russia': 'https://flagcdn.com/w40/ru.png',
        'turkey': 'https://flagcdn.com/w40/tr.png',
        'saudi arabia': 'https://flagcdn.com/w40/sa.png',
        'syria': 'https://flagcdn.com/w40/sy.png',
        'iraq': 'https://flagcdn.com/w40/iq.png',
        'yemen': 'https://flagcdn.com/w40/ye.png',
        'qatar': 'https://flagcdn.com/w40/qa.png',
        'uae': 'https://flagcdn.com/w40/ae.png',
        'bahrain': 'https://flagcdn.com/w40/bh.png',
        'kuwait': 'https://flagcdn.com/w40/kw.png',
      };

      // Determine which country flag to use
      let flagCountry = countryLower;
      if (isUSBase) flagCountry = 'us';
      else if (isRussianBase) flagCountry = 'russia';
      color = isUSBase ? '#ffffff' : isRussianBase ? '#ef4444' : (countryColors[countryLower] || '#ef4444');

      // Type-specific icons for naval, airbase, nuclear, hq
      // Country flags only for military/generic type
      if (base.type === 'nuclear') {
        symbol = '\u2622\uFE0F'; // ☢️
        color = '#a855f7';
      } else if (base.type === 'naval') {
        symbol = '\u2693'; // ⚓
      } else if (base.type === 'airbase') {
        symbol = '\uD83D\uDEEC'; // 🛬
      } else if (base.type === 'hq') {
        symbol = '\uD83C\uDF96\uFE0F'; // 🎖️
      } else {
        // Military/generic bases get country flag image
        symbol = null; // will use flag image instead
      }

      let iconHtml;
      if (symbol) {
        // Emoji icon for naval, airbase, nuclear, hq
        iconHtml = `<div class="base-marker" style="color:${color};text-shadow:0 0 10px ${color};font-size:17px;${extraStyle}">${symbol}</div>`;
      } else {
        // Flag image for military bases
        const flagUrl = countryFlags[flagCountry] || countryFlags[countryLower];
        if (flagUrl) {
          iconHtml = `<div class="base-marker" style="display:flex;align-items:center;justify-content:center;"><img src="${flagUrl}" style="width:22px;height:14px;border:1px solid rgba(255,255,255,0.3);border-radius:2px;box-shadow:0 0 6px ${color};" alt="${base.country}"></div>`;
        } else {
          iconHtml = `<div class="base-marker" style="color:${color};text-shadow:0 0 10px ${color};font-size:17px;">\uD83E\uDE96</div>`;
        }
      }
      const icon = L.divIcon({
        className: 'marker-base',
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([base.lat, base.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title" style="color:${color};font-size:13px">${escapeHtml(base.name)}</div>
            <div class="popup-tag">${escapeHtml(base.type.toUpperCase())} // ${escapeHtml(base.country)}</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-section">
              <span class="popup-label">INTEL SUMMARY</span>
              <div class="popup-detail">${escapeHtml(base.desc)}</div>
            </div>
            <div class="popup-section">
              <span class="popup-label">COORDINATES</span>
              <div class="popup-detail">${base.lat.toFixed(4)}°N, ${base.lng.toFixed(4)}°E</div>
            </div>
            <div class="popup-footer">
              <a href="https://www.google.com/maps/@${base.lat},${base.lng},14z/data=!3m1!1e1" target="_blank" style="color:#00ff41">SAT VIEW \u2192</a>
            </div>
          </div>
        `);
      marker.addTo(layers.bases);
    });
  }

  function drawRegionOutlines() {
    // Iran approximate border
    const iranBorder = [
      [39.78, 44.77], [39.38, 45.60], [38.79, 48.01], [38.44, 48.59],
      [38.84, 49.11], [37.90, 50.36], [37.39, 53.92], [37.33, 55.07],
      [37.11, 56.42], [36.66, 57.19], [35.94, 59.36], [35.64, 60.53],
      [34.52, 60.81], [33.68, 60.57], [31.28, 61.70], [27.22, 63.32],
      [26.63, 63.17], [25.67, 61.50], [25.40, 58.95], [26.07, 56.37],
      [27.14, 56.26], [27.19, 55.17], [26.57, 54.74], [26.24, 53.75],
      [25.93, 51.61], [28.96, 50.82], [29.32, 47.95], [30.10, 47.68],
      [31.00, 47.68], [32.01, 45.43], [33.17, 45.15], [34.31, 44.77],
      [36.41, 45.56], [37.00, 44.56], [38.27, 44.27], [39.36, 44.02],
      [39.78, 44.77]
    ];

    L.polyline(iranBorder, {
      color: '#00ff41',
      weight: 1.5,
      opacity: 0.4,
      dashArray: '4 4',
      className: 'border-pulse border-pulse-green'
    }).addTo(map);

    // Israel approximate border
    const israelBorder = [
      [33.29, 35.45], [33.05, 35.82], [32.74, 35.55], [32.32, 35.56],
      [31.50, 35.45], [31.35, 34.27], [31.22, 34.27], [30.83, 34.37],
      [29.50, 34.89], [29.49, 34.92], [31.22, 35.45], [31.77, 35.55],
      [32.32, 35.56], [32.74, 35.55], [33.05, 35.82], [33.29, 35.45]
    ];

    L.polyline(israelBorder, {
      color: '#3399ff',
      weight: 1.5,
      opacity: 0.4,
      dashArray: '4 4',
      className: 'border-pulse border-pulse-blue'
    }).addTo(map);

    // Key locations markers
    const keyLocations = [
      { name: 'TEHRAN', lat: 35.6892, lng: 51.3890, color: '#00ff41' },
      { name: 'ISFAHAN', lat: 32.6546, lng: 51.6680, color: '#00ff41' },
      { name: 'NATANZ \u2622', lat: 33.5114, lng: 51.7267, color: '#ff00ff' },
      { name: 'FORDOW \u2622', lat: 34.8800, lng: 51.5900, color: '#ff00ff' },
      { name: 'BUSHEHR \u2622', lat: 28.9684, lng: 50.8385, color: '#ff00ff' },
      { name: 'BANDAR ABBAS', lat: 27.1865, lng: 56.2808, color: '#ffaa00' },
      { name: 'TEL AVIV', lat: 32.0853, lng: 34.7818, color: '#3399ff' },
      { name: 'JERUSALEM', lat: 31.7683, lng: 35.2137, color: '#3399ff' },
      { name: 'DIMONA \u2622', lat: 31.0700, lng: 35.2100, color: '#ff00ff' },
      { name: 'HAIFA', lat: 32.7940, lng: 34.9896, color: '#3399ff' },
      { name: 'NEVATIM AB', lat: 31.2083, lng: 34.9333, color: '#ffaa00' },
      { name: 'RAMAT DAVID AB', lat: 32.6651, lng: 35.1796, color: '#ffaa00' },
    ];

    keyLocations.forEach(loc => {
      const icon = L.divIcon({
        className: 'key-location-marker',
        html: `<div style="color:${loc.color};font-size:9px;letter-spacing:1px;text-shadow:0 0 4px ${loc.color};white-space:nowrap">${loc.name}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      L.marker([loc.lat, loc.lng], { icon }).addTo(map);
    });
  }

  // Missile range rings - shows approximate reach from key sites
  function drawMissileRanges() {
    // Iran missile range from central Iran (Shahroud)
    L.circle([36.42, 55.02], {
      radius: 2000000, // ~2000km - Shahab-3/Emad range
      color: 'rgba(255, 50, 50, 0.12)',
      fillColor: 'rgba(255, 50, 50, 0.03)',
      fillOpacity: 1,
      weight: 1,
      dashArray: '8 6',
      interactive: false
    }).addTo(map);

    // Israel Iron Dome / Arrow coverage from central Israel
    L.circle([31.77, 35.22], {
      radius: 400000, // ~400km Arrow-3 range
      color: 'rgba(59, 130, 246, 0.12)',
      fillColor: 'rgba(59, 130, 246, 0.02)',
      fillOpacity: 1,
      weight: 1,
      dashArray: '6 4',
      interactive: false
    }).addTo(map);

    // US 5th Fleet range from Bahrain
    L.circle([26.23, 50.55], {
      radius: 800000,
      color: 'rgba(255, 255, 255, 0.06)',
      fillColor: 'rgba(255, 255, 255, 0.01)',
      fillOpacity: 1,
      weight: 1,
      dashArray: '4 8',
      interactive: false
    }).addTo(map);

    // Range labels
    const rangeLabelStyle = 'color:rgba(255,255,255,0.15);font-size:8px;letter-spacing:2px;font-family:Share Tech Mono,monospace;white-space:nowrap';
    [
      { lat: 38.5, lng: 45.5, text: 'SHAHAB-3 RANGE ~2000KM' },
      { lat: 30.0, lng: 36.8, text: 'ARROW-3 ~400KM' },
      { lat: 28.5, lng: 54.0, text: '5TH FLEET AOR' },
    ].forEach(r => {
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="${rangeLabelStyle}">${r.text}</div>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    });
  }

  // Strategic zone shading
  function drawStrategicZones() {
    // Strait of Hormuz chokepoint highlight
    L.polygon([
      [26.9, 56.0], [26.1, 56.5], [25.8, 56.8], [26.0, 57.2],
      [26.7, 56.8], [27.1, 56.3], [26.9, 56.0]
    ], {
      color: 'rgba(255, 170, 0, 0.25)',
      fillColor: 'rgba(255, 170, 0, 0.06)',
      fillOpacity: 1,
      weight: 1,
      dashArray: '3 3',
      interactive: false
    }).addTo(map);

    L.marker([26.4, 56.4], {
      icon: L.divIcon({
        className: '',
        html: '<div style="color:rgba(255,170,0,0.3);font-size:7px;letter-spacing:2px;font-family:Share Tech Mono,monospace;white-space:nowrap">HORMUZ CHOKEPOINT</div>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(map);

    // Persian Gulf zone
    L.marker([27.5, 51.5], {
      icon: L.divIcon({
        className: '',
        html: '<div style="color:rgba(59,130,246,0.15);font-size:9px;letter-spacing:4px;font-family:Share Tech Mono,monospace;white-space:nowrap">PERSIAN GULF</div>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(map);

    // Red Sea label
    L.marker([20.0, 38.5], {
      icon: L.divIcon({
        className: '',
        html: '<div style="color:rgba(239,68,68,0.15);font-size:9px;letter-spacing:4px;font-family:Share Tech Mono,monospace;white-space:nowrap">RED SEA</div>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(map);

    // Mediterranean label
    L.marker([34.0, 32.0], {
      icon: L.divIcon({
        className: '',
        html: '<div style="color:rgba(59,130,246,0.12);font-size:8px;letter-spacing:3px;font-family:Share Tech Mono,monospace;white-space:nowrap">MEDITERRANEAN</div>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(map);

    // Crosshair at map center (Tehran area)
    const crossStyle = 'rgba(0, 255, 65, 0.08)';
    L.polyline([[25, 51.39], [40, 51.39]], { color: crossStyle, weight: 1, dashArray: '2 6', interactive: false }).addTo(map);
    L.polyline([[35.69, 44], [35.69, 63]], { color: crossStyle, weight: 1, dashArray: '2 6', interactive: false }).addTo(map);
  }

  // === RADAR SWEEP ===
  function drawRadarSweep() {
    const center = [35.69, 51.39]; // Tehran
    const radarEl = document.createElement('div');
    radarEl.className = 'radar-sweep-container';
    radarEl.innerHTML = `
      <div class="radar-sweep-ring radar-ring-1"></div>
      <div class="radar-sweep-ring radar-ring-2"></div>
      <div class="radar-sweep-ring radar-ring-3"></div>
      <div class="radar-sweep-arm"></div>
      <div class="radar-center-dot"></div>
    `;

    const radarIcon = L.divIcon({
      className: 'radar-overlay',
      html: radarEl.outerHTML,
      iconSize: [300, 300],
      iconAnchor: [150, 150]
    });

    L.marker(center, { icon: radarIcon, interactive: false, zIndexOffset: -1000 }).addTo(map);
  }

  // === SHIPPING LANES ===
  function drawShippingLanes() {
    const laneStyle = {
      color: 'rgba(6, 182, 212, 0.12)',
      weight: 2,
      dashArray: '12 8',
      interactive: false,
      className: 'shipping-lane-path'
    };

    // Strait of Hormuz -> Persian Gulf main lane
    const hormuzLane = [
      [25.0, 56.5], [26.0, 56.4], [26.5, 55.5], [26.8, 54.0],
      [27.0, 52.0], [27.5, 51.0], [28.5, 50.0], [29.3, 48.5]
    ];

    // Gulf of Oman -> Arabian Sea
    const omanLane = [
      [25.0, 56.5], [24.5, 58.0], [23.5, 60.0], [22.0, 63.0]
    ];

    // Red Sea / Bab-el-Mandeb lane
    const redSeaLane = [
      [12.5, 43.3], [13.5, 42.8], [15.0, 42.0], [18.0, 39.5],
      [20.0, 38.5], [24.0, 36.5], [27.5, 34.0], [30.0, 32.5]
    ];

    // Suez Canal approach
    const suezLane = [
      [30.0, 32.5], [31.2, 32.3], [31.5, 32.3]
    ];

    [hormuzLane, omanLane, redSeaLane, suezLane].forEach(coords => {
      L.polyline(coords, laneStyle).addTo(map);
    });

    // Lane labels
    const laneLabelStyle = 'color:rgba(6,182,212,0.18);font-size:7px;letter-spacing:2px;font-family:Share Tech Mono,monospace;white-space:nowrap';
    [
      { lat: 26.5, lng: 55.0, text: 'HORMUZ SLOC' },
      { lat: 23.5, lng: 59.0, text: 'ARABIAN SEA SLOC' },
      { lat: 17.0, lng: 40.0, text: 'RED SEA SLOC' },
      { lat: 12.8, lng: 43.5, text: 'BAB-EL-MANDEB' },
      { lat: 31.3, lng: 32.5, text: 'SUEZ CANAL' },
    ].forEach(l => {
      L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="${laneLabelStyle}">${l.text}</div>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    });

    // Animated chevrons along Hormuz lane to show traffic flow
    for (let i = 0; i < hormuzLane.length - 1; i++) {
      const mid = [(hormuzLane[i][0] + hormuzLane[i + 1][0]) / 2, (hormuzLane[i][1] + hormuzLane[i + 1][1]) / 2];
      const dx = hormuzLane[i + 1][1] - hormuzLane[i][1];
      const dy = hormuzLane[i + 1][0] - hormuzLane[i][0];
      const angle = Math.atan2(dx, dy) * 180 / Math.PI;
      L.marker(mid, {
        icon: L.divIcon({
          className: '',
          html: `<div class="lane-chevron" style="transform:rotate(${angle + 180}deg)">\u276F</div>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    }
  }

  // === DAY/NIGHT TERMINATOR ===
  function drawDayNightTerminator() {
    let terminatorLayer = null;

    function calcTerminator() {
      const now = new Date();
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      const declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);

      // Solar hour angle
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
      const solarNoonLng = (12 - utcHours) * 15;

      const points = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        const hourAngle = (lng - solarNoonLng) * Math.PI / 180;
        const decRad = declination * Math.PI / 180;
        const lat = Math.atan(-Math.cos(hourAngle) / Math.tan(decRad)) * 180 / Math.PI;
        points.push([lat, lng]);
      }

      // Build the night polygon - shade from terminator to south pole (or north depending on season)
      const nightPoly = [];
      if (declination >= 0) {
        // Northern summer: night is south of terminator
        nightPoly.push([-90, -180]);
        points.forEach(p => nightPoly.push(p));
        nightPoly.push([-90, 180]);
      } else {
        // Northern winter: night is north of terminator
        nightPoly.push([90, -180]);
        points.forEach(p => nightPoly.push(p));
        nightPoly.push([90, 180]);
      }

      return nightPoly;
    }

    function updateTerminator() {
      if (terminatorLayer) map.removeLayer(terminatorLayer);
      const poly = calcTerminator();
      terminatorLayer = L.polygon(poly, {
        color: 'transparent',
        fillColor: '#000000',
        fillOpacity: 0.15,
        interactive: false,
        className: 'day-night-terminator'
      }).addTo(map);
    }

    updateTerminator();
    // Update every 5 minutes
    setInterval(updateTerminator, 300000);
  }

  // === GRID OVERLAY ===
  function drawGridOverlay() {
    const gridStyle = {
      color: 'rgba(255, 255, 255, 0.03)',
      weight: 1,
      interactive: false,
      dashArray: '2 8'
    };

    const labelStyle = 'color:rgba(255,255,255,0.08);font-size:8px;font-family:Share Tech Mono,monospace;white-space:nowrap';

    // Latitude lines every 5 degrees (visible region: ~10N to 42N)
    for (let lat = 10; lat <= 45; lat += 5) {
      L.polyline([[lat, 25], [lat, 70]], gridStyle).addTo(map);
      L.marker([lat, 25.5], {
        icon: L.divIcon({
          className: '',
          html: `<div style="${labelStyle}">${lat}\u00B0N</div>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    }

    // Longitude lines every 5 degrees (visible region: ~25E to 65E)
    for (let lng = 25; lng <= 70; lng += 5) {
      L.polyline([[10, lng], [45, lng]], gridStyle).addTo(map);
      L.marker([10.5, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="${labelStyle}">${lng}\u00B0E</div>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    }
  }

  function updateAircraft(data) {
    const seen = new Set();
    data.forEach(a => {
      const id = a.icao24;
      seen.add(id);

      if (markerCache.aircraft[id]) {
        markerCache.aircraft[id].setLatLng([a.lat, a.lng]);
        const el = markerCache.aircraft[id].getElement();
        if (el) el.style.transform += ` rotate(${a.heading || 0}deg)`;
      } else {
        const icon = L.divIcon({
          className: 'marker-aircraft',
          html: `<div style="transform:rotate(${a.heading || 0}deg)">&#9992;</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const marker = L.marker([a.lat, a.lng], { icon })
          .bindPopup(`
            <div class="popup-osint">
              <div class="popup-title">${escapeHtml(a.callsign) || 'UNKNOWN'}</div>
              <div class="popup-tag">AIRCRAFT TRACK</div>
              <hr style="border-color:#1a3a1a;margin:6px 0">
              <div class="popup-detail">
                ICAO: ${escapeHtml(a.icao24)}<br>
                Country: ${escapeHtml(a.country)}<br>
                Alt: ${a.altitude ? Math.round(a.altitude) + ' m' : 'N/A'}<br>
                Speed: ${a.velocity ? Math.round(a.velocity) + ' m/s' : 'N/A'}<br>
                Heading: ${a.heading ? Math.round(a.heading) + '\u00B0' : 'N/A'}
              </div>
            </div>
          `);
        marker.addTo(layers.aircraft);
        markerCache.aircraft[id] = marker;
      }
    });

    for (const id of Object.keys(markerCache.aircraft)) {
      if (!seen.has(id)) {
        layers.aircraft.removeLayer(markerCache.aircraft[id]);
        delete markerCache.aircraft[id];
      }
    }
  }

  function updateShips(data) {
    const seen = new Set();
    data.forEach(s => {
      const id = s.mmsi;
      seen.add(id);

      if (markerCache.ships[id]) {
        markerCache.ships[id].setLatLng([s.lat, s.lng]);
      } else {
        const color = s.type === 'Naval' ? '#ff3333' : s.type === 'Tanker' ? '#ffaa00' : '#3399ff';
        const icon = L.divIcon({
          className: 'marker-ship',
          html: `<div style="color:${color};font-size:14px;text-shadow:0 0 6px ${color}">&#9875;</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        const marker = L.marker([s.lat, s.lng], { icon })
          .bindPopup(`
            <div class="popup-osint">
              <div class="popup-title">${escapeHtml(s.name)}</div>
              <div class="popup-tag">${escapeHtml(s.type)} VESSEL</div>
              <hr style="border-color:#1a3a1a;margin:6px 0">
              <div class="popup-section">
                <span class="popup-label">VESSEL DATA</span>
                <div class="popup-detail">
                  MMSI: ${escapeHtml(s.mmsi)}<br>
                  Type: ${escapeHtml(s.type)}<br>
                  Flag: ${escapeHtml(s.flag)}<br>
                  Speed: ${s.speed} kts<br>
                  Heading: ${s.heading}\u00B0
                </div>
              </div>
              <div class="popup-section">
                <span class="popup-label">AREA</span>
                <div class="popup-detail">${escapeHtml(s.area)}</div>
              </div>
              <div class="popup-section">
                <span class="popup-label">COORDINATES</span>
                <div class="popup-detail">${s.lat.toFixed(4)}\u00B0N, ${s.lng.toFixed(4)}\u00B0E</div>
              </div>
            </div>
          `);
        marker.addTo(layers.ships);
        markerCache.ships[id] = marker;
      }
    });

    for (const id of Object.keys(markerCache.ships)) {
      if (!seen.has(id)) {
        layers.ships.removeLayer(markerCache.ships[id]);
        delete markerCache.ships[id];
      }
    }
  }

  function updateEvents(data) {
    layers.events.clearLayers();
    markerCache.events = {};

    data.forEach(e => {
      const icon = L.divIcon({
        className: 'marker-event',
        html: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      const marker = L.marker([e.lat, e.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title">${escapeHtml(truncate(e.name, 60))}</div>
            <div class="popup-tag">${escapeHtml(e.type ? e.type.toUpperCase() : 'EVENT')}</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-detail">
              Source: ${escapeHtml(e.source)}<br>
              Tone: ${e.tone?.toFixed(1) || 'N/A'}<br>
              Goldstein: ${e.goldstein?.toFixed(1) || 'N/A'}
            </div>
            <div class="popup-footer">
              <a href="${escapeHtml(e.url)}" target="_blank" style="color:#00ff41">SOURCE ARTICLE \u2192</a>
            </div>
          </div>
        `);
      marker.addTo(layers.events);
      markerCache.events[e.id] = marker;
    });
  }

  function updateConflicts(data) {
    layers.conflicts.clearLayers();
    markerCache.conflicts = {};

    data.forEach(c => {
      const color = c.fatalities > 10 ? '#ff0000' : c.fatalities > 5 ? '#ff3333' : c.fatalities > 0 ? '#ffaa00' : '#cc6600';
      const size = Math.max(10, Math.min(24, 10 + c.fatalities * 1.5));
      const pulseClass = c.fatalities > 5 ? 'conflict-pulse-heavy' : c.fatalities > 0 ? 'conflict-pulse' : '';

      const icon = L.divIcon({
        className: '',
        html: `<div class="conflict-marker ${pulseClass}" style="width:${size}px;height:${size}px;background:${color};border:1px solid rgba(255,255,255,0.3);border-radius:50%;box-shadow:0 0 10px ${color},0 0 20px ${color}44;cursor:pointer"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const severityLabel = c.fatalities > 10 ? 'MASS CASUALTY' : c.fatalities > 5 ? 'HIGH SEVERITY' : c.fatalities > 0 ? 'CONFIRMED CASUALTIES' : 'REPORTED INCIDENT';
      const severityColor = c.fatalities > 10 ? '#ff0000' : c.fatalities > 5 ? '#ff3333' : c.fatalities > 0 ? '#ffaa00' : '#cc6600';

      const marker = L.marker([c.lat, c.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title" style="color:${severityColor};font-size:13px">\u26A0 ${escapeHtml(c.type)}</div>
            <div class="popup-tag" style="color:${severityColor}">${severityLabel}</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-section">
              <span class="popup-label">LOCATION</span>
              <div class="popup-detail">${escapeHtml(c.location)}, ${escapeHtml(c.country)}</div>
            </div>
            <div class="popup-section">
              <span class="popup-label">DATE</span>
              <div class="popup-detail">${escapeHtml(c.date)}</div>
            </div>
            ${c.fatalities > 0 ? `
            <div class="popup-section">
              <span class="popup-label">FATALITIES</span>
              <div class="popup-detail" style="color:${severityColor};font-size:14px;font-weight:bold">${c.fatalities}</div>
            </div>
            ` : ''}
            ${c.actor1 && c.actor1 !== 'Unknown' ? `
            <div class="popup-section">
              <span class="popup-label">BELLIGERENTS</span>
              <div class="popup-detail">${escapeHtml(c.actor1)}${c.actor2 && c.actor2 !== 'Unknown' ? ' vs ' + escapeHtml(c.actor2) : ''}</div>
            </div>
            ` : ''}
            ${c.subtype ? `
            <div class="popup-section">
              <span class="popup-label">TYPE</span>
              <div class="popup-detail">${escapeHtml(c.subtype)}</div>
            </div>
            ` : ''}
            ${c.notes ? `
            <div class="popup-section">
              <span class="popup-label">OSINT NOTES</span>
              <div class="popup-detail">${escapeHtml(c.notes)}</div>
            </div>
            ` : ''}
            <div class="popup-section">
              <span class="popup-label">COORDINATES</span>
              <div class="popup-detail">${c.lat.toFixed(4)}\u00B0N, ${c.lng.toFixed(4)}\u00B0E</div>
            </div>
            <div class="popup-section">
              <span class="popup-label">SOURCE</span>
              <div class="popup-detail">${escapeHtml(c.source || 'OSINT')}</div>
            </div>
            ${c.url ? `
            <div class="popup-footer">
              <a href="${escapeHtml(c.url)}" target="_blank" style="color:#ff3333">SOURCE ARTICLE \u2192</a>
            </div>
            ` : ''}
            <div class="popup-footer">
              <a href="https://www.google.com/maps/@${c.lat},${c.lng},13z/data=!3m1!1e1" target="_blank" style="color:#00ff41">SAT VIEW \u2192</a>
            </div>
          </div>
        `);
      marker.addTo(layers.conflicts);
      markerCache.conflicts[c.id] = marker;
    });
  }

  function updateNewsMarkers(data) {
    layers.news.clearLayers();
    markerCache.news = {};

    data.filter(n => n.location).forEach(n => {
      const icon = L.divIcon({
        className: 'marker-news',
        html: '&#9432;',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      const marker = L.marker([n.location.lat, n.location.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title">${escapeHtml(truncate(n.title, 80))}</div>
            <div class="popup-tag">${escapeHtml(n.source)} // ${escapeHtml(n.severity ? n.severity.toUpperCase() : 'NEWS')}</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-detail">
              ${escapeHtml(n.summary)}
            </div>
            <div class="popup-footer">
              <a href="${escapeHtml(n.url)}" target="_blank" style="color:#00ff41">READ FULL \u2192</a>
            </div>
          </div>
        `);
      marker.addTo(layers.news);
      markerCache.news[n.id] = marker;
    });
  }

  function panTo(lat, lng, zoom) {
    map.flyTo([lat, lng], zoom || 8, { duration: 1 });
  }

  function updateDynamicStrikes(data) {
    if (!data || data.length === 0) return;

    // Clear previous dynamic strikes and re-draw all
    layers.strikes.clearLayers();

    data.forEach(s => {

      // Red pulsing circle for confirmed hit
      const circle = L.circle([s.lat, s.lng], {
        radius: 12000,
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.12,
        weight: 2,
        opacity: 0.5,
        className: 'strike-circle-pulse'
      });

      circle.bindPopup(`
        <div class="popup-osint">
          <div class="popup-title" style="color:#ff3333;font-size:13px">\u26A0 CONFIRMED STRIKE - ${escapeHtml(s.name)}</div>
          <div class="popup-tag" style="color:#ff3333">DYNAMIC OSINT DETECTION</div>
          <hr style="border-color:#1a3a1a;margin:6px 0">
          <div class="popup-section">
            <span class="popup-label">HEADLINE</span>
            <div class="popup-detail">${escapeHtml(s.title || s.desc)}</div>
          </div>
          <div class="popup-section">
            <span class="popup-label">DATE</span>
            <div class="popup-detail">${escapeHtml(s.date)}</div>
          </div>
          ${s.fatalities > 0 ? `
          <div class="popup-section">
            <span class="popup-label">REPORTED FATALITIES</span>
            <div class="popup-detail" style="color:#ff3333;font-size:14px">${s.fatalities}</div>
          </div>
          ` : ''}
          <div class="popup-section">
            <span class="popup-label">COORDINATES</span>
            <div class="popup-detail">${s.lat.toFixed(4)}\u00B0N, ${s.lng.toFixed(4)}\u00B0E</div>
          </div>
          ${s.source ? `
          <div class="popup-footer">
            <a href="${escapeHtml(s.source)}" target="_blank" style="color:#ff3333">SOURCE \u2192</a>
          </div>
          ` : ''}
          <div class="popup-footer">
            <a href="https://www.google.com/maps/@${s.lat},${s.lng},14z/data=!3m1!1e1" target="_blank" style="color:#00ff41">SAT VIEW \u2192</a>
          </div>
        </div>
      `);
      circle.addTo(layers.strikes);

      const dotIcon = L.divIcon({
        className: '',
        html: '<div class="strike-dot"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      const dotMarker = L.marker([s.lat, s.lng], { icon: dotIcon });
      dotMarker.bindPopup(circle.getPopup());
      dotMarker.addTo(layers.strikes);
    });
  }

  // === EARTHQUAKE OVERLAY ===
  function updateEarthquakes(data) {
    layers.earthquakes.clearLayers();
    data.forEach(q => {
      const size = Math.max(15, Math.min(60, q.magnitude * 12));
      // Concentric rings
      for (let i = 3; i >= 1; i--) {
        L.circle([q.lat, q.lng], {
          radius: size * 1000 * i,
          color: '#a855f7',
          fillColor: '#a855f7',
          fillOpacity: 0.04 / i,
          weight: 1,
          opacity: 0.3 / i,
          interactive: false
        }).addTo(layers.earthquakes);
      }
      // Center marker
      const icon = L.divIcon({
        className: '',
        html: `<div class="quake-marker" style="width:${Math.max(10, q.magnitude * 4)}px;height:${Math.max(10, q.magnitude * 4)}px"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      const marker = L.marker([q.lat, q.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title" style="color:#a855f7">SEISMIC EVENT</div>
            <div class="popup-tag">MAG ${q.magnitude} // DEPTH ${q.depth?.toFixed(1) || '?'} KM</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-detail">
              ${escapeHtml(q.place)}<br>
              Time: ${new Date(q.time).toUTCString()}<br>
              ${q.nearNuclear ? `<span style="color:#ff3333;font-weight:bold">NEAR ${q.nearNuclear.site} (${q.nearNuclear.distKm}km)</span>` : ''}
            </div>
            ${q.url ? `<div class="popup-footer"><a href="${escapeHtml(q.url)}" target="_blank" style="color:#a855f7">USGS DETAILS \u2192</a></div>` : ''}
          </div>
        `);
      marker.addTo(layers.earthquakes);
    });
  }

  // === WEATHER OVERLAY ===
  function updateWeather(data) {
    layers.weather.clearLayers();
    if (!data || !data.stations) return;

    // Wind direction arrows at each station
    data.stations.forEach(wx => {
      // Wind barb SVG arrow rotated to wind direction
      const windRad = (wx.windDirection || 0) * Math.PI / 180;
      const arrowLen = 25;
      const dx = Math.sin(windRad) * arrowLen;
      const dy = -Math.cos(windRad) * arrowLen;
      const satLabel = wx.satObscured ? '<div class="sat-obscured-label">SAT OBSCURED</div>' : '';

      const icon = L.divIcon({
        className: '',
        html: `<div class="wx-marker">
          <svg width="50" height="50" viewBox="0 0 50 50">
            <line x1="25" y1="25" x2="${25 + dx}" y2="${25 + dy}" stroke="#06b6d4" stroke-width="2" opacity="0.7"/>
            <polygon points="${25 + dx},${25 + dy} ${25 + dx - Math.sin(windRad - 0.4) * 8},${25 + dy + Math.cos(windRad - 0.4) * 8} ${25 + dx - Math.sin(windRad + 0.4) * 8},${25 + dy + Math.cos(windRad + 0.4) * 8}" fill="#06b6d4" opacity="0.7"/>
          </svg>
          <div class="wx-label">${wx.name}<br>${Math.round(wx.temperature)}\u00B0C ${Math.round(wx.windSpeed)}km/h</div>
          ${satLabel}
        </div>`,
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });

      const marker = L.marker([wx.lat, wx.lng], { icon })
        .bindPopup(`
          <div class="popup-osint">
            <div class="popup-title" style="color:#06b6d4">WX: ${escapeHtml(wx.name)}</div>
            <div class="popup-tag">WEATHER INTELLIGENCE</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-detail">
              Temp: ${wx.temperature}\u00B0C<br>
              Humidity: ${wx.humidity}%<br>
              Wind: ${wx.windSpeed} km/h @ ${wx.windDirection}\u00B0<br>
              Cloud Cover: ${wx.cloudCover}%<br>
              ${wx.satObscured ? '<span style="color:#f59e0b;font-weight:bold">SAT IMAGERY OBSCURED</span>' : 'SAT imagery: CLEAR'}
            </div>
          </div>
        `);
      marker.addTo(layers.weather);
    });

    // Downwind fallout vectors
    if (data.downwindVectors) {
      data.downwindVectors.forEach(v => {
        const line = L.polyline([[v.startLat, v.startLng], [v.endLat, v.endLng]], {
          color: '#ff00ff',
          weight: 2,
          opacity: 0.5,
          dashArray: '8 6'
        });
        line.bindPopup(`
          <div class="popup-osint">
            <div class="popup-title" style="color:#ff00ff">DOWNWIND VECTOR</div>
            <div class="popup-tag">${escapeHtml(v.siteName)} // 200KM</div>
            <hr style="border-color:#1a3a1a;margin:6px 0">
            <div class="popup-detail">Wind: ${v.windSpeed} km/h @ ${v.windDirection}\u00B0</div>
          </div>
        `);
        line.addTo(layers.weather);

        // Label at midpoint
        const midLat = (v.startLat + v.endLat) / 2;
        const midLng = (v.startLng + v.endLng) / 2;
        L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="color:#ff00ff;font-size:8px;letter-spacing:1px;font-family:Share Tech Mono,monospace;white-space:nowrap;text-shadow:0 0 4px #ff00ff">DOWNWIND VECTOR</div>',
            iconSize: [0, 0]
          }),
          interactive: false
        }).addTo(layers.weather);
      });
    }
  }

  // === CONFLICT HEATMAP ===
  let heatLayer = null;
  function updateHeatmap(conflictsData, eventsData, strikesData) {
    if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }
    const points = [];
    // Conflicts weighted by fatalities
    if (conflictsData) conflictsData.forEach(c => {
      points.push([c.lat, c.lng, Math.max(0.3, Math.min(1, (c.fatalities || 0) / 10 + 0.2))]);
    });
    // Events
    if (eventsData) eventsData.forEach(e => {
      points.push([e.lat, e.lng, 0.3]);
    });
    // Strikes - high weight
    if (strikesData) strikesData.forEach(s => {
      points.push([s.lat, s.lng, 0.9]);
    });
    if (points.length === 0) return;
    heatLayer = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 10,
      max: 1.0,
      gradient: { 0.2: '#3b82f6', 0.4: '#06b6d4', 0.6: '#f59e0b', 0.8: '#ef4444', 1.0: '#ff0000' }
    });
    // Only add if heatmap layer is active
    const heatBtn = document.querySelector('.ctrl-btn[data-layer="heatmap"]');
    if (heatBtn && heatBtn.classList.contains('active')) {
      heatLayer.addTo(map);
    }
    layers.heatmap._heatRef = heatLayer;
  }

  // === DISTANCE MEASUREMENT TOOL ===
  let measureActive = false;
  let measurePoints = [];
  let measureMarkers = [];
  let measureLine = null;
  let measureLabel = null;

  function toggleMeasureMode(active) {
    measureActive = active;
    if (active) {
      map.addLayer(layers.measure);
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', onMeasureClick);
      map.on('contextmenu', clearMeasurement);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', onMeasureClick);
      map.off('contextmenu', clearMeasurement);
      clearMeasurement();
      map.removeLayer(layers.measure);
    }
  }

  function onMeasureClick(e) {
    if (measurePoints.length >= 2) clearMeasurement();
    measurePoints.push(e.latlng);

    const dot = L.circleMarker(e.latlng, {
      radius: 5, color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 1, weight: 2
    }).addTo(layers.measure);
    measureMarkers.push(dot);

    if (measurePoints.length === 2) {
      const [a, b] = measurePoints;
      // Haversine
      const R = 6371;
      const dLat = (b.lat - a.lat) * Math.PI / 180;
      const dLng = (b.lng - a.lng) * Math.PI / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const km = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      const nm = km * 0.539957;
      // Bearing
      const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
      const x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) - Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lng - a.lng) * Math.PI / 180);
      const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
      const flightMach = (km / 1050).toFixed(1);
      const flight900 = (km / 900).toFixed(1);

      measureLine = L.polyline([a, b], {
        color: '#06b6d4', weight: 2, dashArray: '8 6', opacity: 0.8
      }).addTo(layers.measure);

      // Draw ballistic arc trajectory
      drawMeasureArc(a, b, km);

      const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
      measureLabel = L.marker(mid, {
        icon: L.divIcon({
          className: '',
          html: `<div class="measure-label">${Math.round(km)} km / ${Math.round(nm)} nm<br>BRG ${Math.round(bearing)}\u00B0<br>M0.85: ${flightMach}h / 900kph: ${flight900}h</div>`,
          iconSize: [0, 0]
        })
      }).addTo(layers.measure);
    }
  }

  function clearMeasurement(e) {
    if (e) e.originalEvent?.preventDefault();
    measurePoints = [];
    layers.measure.clearLayers();
    measureMarkers = [];
    measureLine = null;
    measureLabel = null;
  }

  // === AIRCRAFT TRAILS ===
  function updateTrails(trailData) {
    layers.trails.clearLayers();
    if (!trailData) return;

    trailData.forEach(trail => {
      if (!trail.positions || trail.positions.length < 2) return;
      const coords = trail.positions.map(p => [p.lat, p.lng]);
      const color = trail.military ? '#f59e0b' : '#06b6d4';

      // Draw trail with fading opacity segments
      for (let i = 1; i < coords.length; i++) {
        const opacity = 0.15 + (i / coords.length) * 0.6;
        L.polyline([coords[i - 1], coords[i]], {
          color: color,
          weight: 2,
          opacity: opacity,
          interactive: false
        }).addTo(layers.trails);
      }

      // Loiter detection: if 6+ positions within 50km radius
      if (trail.positions.length >= 6) {
        const lats = trail.positions.map(p => p.lat);
        const lngs = trail.positions.map(p => p.lng);
        const cLat = lats.reduce((a, b) => a + b) / lats.length;
        const cLng = lngs.reduce((a, b) => a + b) / lngs.length;
        const allWithin = trail.positions.every(p => {
          const dLat = (p.lat - cLat) * 111.32;
          const dLng = (p.lng - cLng) * 111.32 * Math.cos(cLat * Math.PI / 180);
          return Math.sqrt(dLat * dLat + dLng * dLng) < 50;
        });
        if (allWithin) {
          L.marker([cLat, cLng], {
            icon: L.divIcon({
              className: '',
              html: `<div class="loiter-alert">POSSIBLE ISR ORBIT<br>DETECTED</div>`,
              iconSize: [0, 0]
            })
          }).addTo(layers.trails);
          // Orbit circle
          L.circle([cLat, cLng], {
            radius: 30000,
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.05,
            weight: 1,
            dashArray: '4 4',
            opacity: 0.4,
            interactive: false
          }).addTo(layers.trails);
        }
      }
    });
  }

  // === SATELLITE TOGGLE ===
  function toggleSatellite() {
    if (isSatelliteView) {
      map.removeLayer(satTiles);
      darkTiles.addTo(map);
    } else {
      map.removeLayer(darkTiles);
      satTiles.addTo(map);
    }
    isSatelliteView = !isSatelliteView;
    const btn = document.getElementById('sat-toggle-btn');
    if (btn) btn.classList.toggle('active', isSatelliteView);
  }

  // === PROXIMITY ALERTS ===
  function checkProximityAlerts(aircraftData) {
    const ALERT_RADIUS_KM = 80;
    const sensitiveSites = NAVAL_BASES.filter(b => b.type === 'nuclear' || b.type === 'hq' || b.type === 'airbase');
    const alerts = [];

    aircraftData.forEach(ac => {
      if (!ac.military) return;
      sensitiveSites.forEach(site => {
        const dLat = (ac.lat - site.lat) * 111.32;
        const dLng = (ac.lng - site.lng) * 111.32 * Math.cos(site.lat * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < ALERT_RADIUS_KM) {
          const key = `${ac.icao24}-${site.name}`;
          if (!lastProximityAlerts[key] || Date.now() - lastProximityAlerts[key] > 300000) {
            lastProximityAlerts[key] = Date.now();
            alerts.push({ aircraft: ac, site, distance: Math.round(dist) });
          }
        }
      });
    });

    if (alerts.length > 0) {
      alerts.forEach(a => {
        // Flash a proximity ring on map
        const ring = L.circle([a.site.lat, a.site.lng], {
          radius: ALERT_RADIUS_KM * 1000,
          color: '#ff3333',
          fillColor: '#ff3333',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 4',
          className: 'proximity-ring-pulse'
        }).addTo(map);
        setTimeout(() => map.removeLayer(ring), 8000);

        // Show proximity alert label
        const label = L.marker([a.site.lat + 0.3, a.site.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="proximity-alert-label">PROXIMITY ALERT<br>${escapeHtml(a.aircraft.callsign || 'MIL')} @ ${a.distance}KM<br>NEAR ${escapeHtml(a.site.name)}</div>`,
            iconSize: [0, 0]
          })
        }).addTo(map);
        setTimeout(() => map.removeLayer(label), 8000);
      });

      // Dispatch event for app.js to handle sound
      document.dispatchEvent(new CustomEvent('proximityAlert', { detail: alerts }));
    }
  }

  // === TARGET LOCK ANIMATION ===
  function showTargetLock(lat, lng) {
    if (targetLockMarker) map.removeLayer(targetLockMarker);
    targetLockMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="target-reticle">
          <div class="reticle-ring reticle-ring-outer"></div>
          <div class="reticle-ring reticle-ring-inner"></div>
          <div class="reticle-crosshair-h"></div>
          <div class="reticle-crosshair-v"></div>
          <div class="reticle-corner reticle-tl"></div>
          <div class="reticle-corner reticle-tr"></div>
          <div class="reticle-corner reticle-bl"></div>
          <div class="reticle-corner reticle-br"></div>
          <div class="reticle-label">TGT LOCK<br>${lat.toFixed(4)}N ${lng.toFixed(4)}E</div>
        </div>`,
        iconSize: [120, 120],
        iconAnchor: [60, 60]
      }),
      interactive: false,
      zIndexOffset: 5000
    }).addTo(map);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      if (targetLockMarker) { map.removeLayer(targetLockMarker); targetLockMarker = null; }
    }, 6000);
  }

  // === ANIMATED MISSILE ARCS ===
  function showMissileArc(fromLat, fromLng, toLat, toLng, label) {
    const points = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = fromLat + (toLat - fromLat) * t;
      const lng = fromLng + (toLng - fromLng) * t;
      // Parabolic arc height
      const arcHeight = Math.sin(t * Math.PI) * Math.min(8, Math.abs(toLat - fromLat) + Math.abs(toLng - fromLng)) * 0.3;
      points.push([lat + arcHeight, lng]);
    }

    // Animate: draw segments progressively
    let drawn = 0;
    const arcSegments = [];
    const arcInterval = setInterval(() => {
      if (drawn >= points.length - 1) {
        clearInterval(arcInterval);
        // Flash impact
        showTargetLock(toLat, toLng);
        // Cleanup arc after 10s
        setTimeout(() => arcSegments.forEach(s => map.removeLayer(s)), 10000);
        return;
      }
      const seg = L.polyline([points[drawn], points[drawn + 1]], {
        color: '#ff3333',
        weight: 2,
        opacity: 0.8,
        dashArray: drawn % 3 === 0 ? '4 2' : null
      }).addTo(map);
      arcSegments.push(seg);
      drawn++;
    }, 40);

    // Origin marker
    const originDot = L.marker([fromLat, fromLng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="missile-origin-dot"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      })
    }).addTo(map);
    arcSegments.push(originDot);

    // Arc label at peak
    const peakIdx = Math.floor(steps / 2);
    const peakLabel = L.marker(points[peakIdx], {
      icon: L.divIcon({
        className: '',
        html: `<div class="missile-arc-label">${escapeHtml(label || 'BALLISTIC TRACK')}</div>`,
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(map);
    arcSegments.push(peakLabel);
  }

  // === FOG OF WAR ===
  function initFogOfWar() {
    // Create a dark overlay with "holes" punched at data feed locations
    const fogLayer = L.layerGroup();
    const coveragePoints = [
      // Iran theater main coverage
      { lat: 35.69, lng: 51.39, radius: 400000 }, // Tehran
      { lat: 32.08, lng: 34.78, radius: 200000 }, // Tel Aviv
      { lat: 26.23, lng: 50.55, radius: 300000 }, // Bahrain / 5th Fleet
      { lat: 27.18, lng: 56.28, radius: 200000 }, // Bandar Abbas
      { lat: 33.51, lng: 51.73, radius: 150000 }, // Natanz
      { lat: 36.42, lng: 55.02, radius: 150000 }, // Shahroud
      { lat: 31.77, lng: 35.22, radius: 150000 }, // Jerusalem
      { lat: 25.12, lng: 51.32, radius: 150000 }, // Al Udeid
    ];

    // Dim border regions
    const dimZones = [
      [[8, 20], [8, 75], [22, 75], [22, 20]], // South
      [[42, 20], [42, 75], [48, 75], [48, 20]], // North
      [[8, 20], [48, 20], [48, 25], [8, 25]],  // West edge
      [[8, 68], [48, 68], [48, 75], [8, 75]],  // East edge
    ];

    dimZones.forEach(zone => {
      L.polygon(zone, {
        color: 'transparent',
        fillColor: '#000',
        fillOpacity: 0.25,
        interactive: false
      }).addTo(fogLayer);
    });

    // Intel coverage glow circles
    coveragePoints.forEach(p => {
      L.circle([p.lat, p.lng], {
        radius: p.radius,
        color: 'rgba(0, 255, 65, 0.04)',
        fillColor: 'rgba(0, 255, 65, 0.02)',
        fillOpacity: 1,
        weight: 1,
        dashArray: '3 6',
        interactive: false,
        className: 'intel-coverage-ring'
      }).addTo(fogLayer);
    });

    fogLayer.addTo(map);
    // Move to back
    fogLayer.eachLayer(l => { if (l.setStyle) l.bringToBack(); });
  }

  // Enhance measure tool with arc trajectory
  function drawMeasureArc(a, b, km) {
    const points = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lng = a.lng + (b.lng - a.lng) * t;
      const arcH = Math.sin(t * Math.PI) * Math.min(5, km / 500) * 0.5;
      points.push([lat + arcH, lng]);
    }
    L.polyline(points, {
      color: '#f59e0b',
      weight: 1.5,
      opacity: 0.5,
      dashArray: '4 4',
      interactive: false
    }).addTo(layers.measure);

    // Flight time labels at peak
    const peak = points[Math.floor(steps / 2)];
    const shahab3Time = (km / 4000 * 60).toFixed(0); // ~4000 km/h for ballistic
    const cruiseTime = (km / 900 * 60).toFixed(0);
    const f15Time = (km / 2650 * 60).toFixed(0);
    L.marker(peak, {
      icon: L.divIcon({
        className: '',
        html: `<div class="measure-arc-label">BALLISTIC: ~${shahab3Time}min<br>CRUISE: ~${cruiseTime}min<br>F-15E: ~${f15Time}min</div>`,
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(layers.measure);
  }

  function setZoom(z) {
    map.setZoom(z);
  }

  function getMap() {
    return map;
  }

  return {
    init, updateAircraft, updateShips, updateEvents, updateConflicts,
    updateNewsMarkers, updateDynamicStrikes, updateEarthquakes, updateWeather,
    updateHeatmap, updateTrails, panTo, setZoom, getMap, clearMeasurement,
    toggleSatellite, checkProximityAlerts, showTargetLock, showMissileArc,
    getNAVAL_BASES: () => NAVAL_BASES,
    invalidateSize: () => { if (map) map.invalidateSize(); }
  };
})();
