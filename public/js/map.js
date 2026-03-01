// Map module - Leaflet setup and marker management

const MapModule = (function () {
  let map;
  let layers = {
    aircraft: null,
    ships: null,
    events: null,
    conflicts: null,
    news: null,
    bases: null,
    strikes: null
  };

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

    // Dark map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Create layer groups
    for (const key of Object.keys(layers)) {
      layers[key] = L.layerGroup().addTo(map);
    }

    drawRegionOutlines();
    drawNavalBases();
    drawMissileRanges();
    drawStrategicZones();

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
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
          map.addLayer(layers[layer]);
        } else {
          map.removeLayer(layers[layer]);
        }
      });
    });
  }

  function drawNavalBases() {
    NAVAL_BASES.forEach(base => {
      let color, symbol, extraStyle = '';
      if (base.type === 'hq') {
        color = '#ffd700'; symbol = '\uD83C\uDF96\uFE0F'; // gold medal 🎖️
      } else if (base.type === 'naval') {
        color = '#3399ff'; symbol = '\u2693'; // anchor ⚓
      } else if (base.type === 'airbase') {
        color = '#ffaa00'; symbol = '\uD83D\uDEEC'; // landing strip 🛬
      } else if (base.type === 'nuclear') {
        color = '#a855f7'; symbol = '\u2622\uFE0F'; // radioactive ☢️
      } else {
        color = '#ef4444'; symbol = '\uD83E\uDE96'; // military helmet 🪖
      }

      const icon = L.divIcon({
        className: 'marker-base',
        html: `<div class="base-marker" style="color:${color};text-shadow:0 0 10px ${color};font-size:17px;${extraStyle}">${symbol}</div>`,
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
      weight: 1,
      opacity: 0.3,
      dashArray: '4 4'
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
      weight: 1,
      opacity: 0.3,
      dashArray: '4 4'
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

  return { init, updateAircraft, updateShips, updateEvents, updateConflicts, updateNewsMarkers, updateDynamicStrikes, panTo };
})();
