// SIM Module - War Scenario Simulator
const SimModule = (function () {
  let map = null;
  let simLayers = { strikes: null, movements: null, ranges: null };
  let currentScenario = null;
  let currentPhase = 0;
  let isPlaying = false;
  let playInterval = null;
  let speed = 1;
  let animTimers = [];

  // === SCENARIO DATA ===
  const SCENARIOS = [
    {
      id: 'iran-strikes-israel',
      name: 'Iran Strikes Israel',
      icon: '\uD83C\uDDEE\uD83C\uDDF7\u2192\uD83C\uDDEE\uD83C\uDDF1',
      desc: 'Iran launches ballistic missiles at Israeli bases & cities. Israel responds with air strikes on nuclear sites.',
      color: '#ef4444',
      center: [32.5, 45],
      zoom: 5,
      phases: [
        {
          name: 'PHASE 1: MISSILE LAUNCH',
          description: 'IRGC Aerospace Force launches 300+ ballistic missiles from western Iran. Shahab-3, Emad, and Kheibar Shekan MRBMs target Israeli air bases, intelligence facilities, and population centers. Cruise missiles and Shahed-136 drones launched in waves.',
          duration: 8000,
          stats: { missiles: 320, intercepted: '78%', casualties: '~120', assets: 'Nevatim AB damaged, 3 radar sites hit' },
          strikes: [
            { from: [34.31, 47.06], to: [31.21, 34.79], label: 'Shahab-3 \u2192 Nevatim AB', type: 'missile' },
            { from: [33.51, 51.73], to: [32.09, 34.78], label: 'Emad \u2192 Tel Aviv', type: 'missile' },
            { from: [32.65, 51.67], to: [31.77, 35.21], label: 'Kheibar \u2192 Jerusalem', type: 'missile' },
            { from: [34.64, 50.88], to: [32.79, 34.99], label: 'Cruise \u2192 Haifa', type: 'cruise' },
            { from: [35.69, 51.39], to: [30.85, 34.75], label: 'Shahab-3 \u2192 Negev', type: 'missile' },
            { from: [33.90, 48.75], to: [31.87, 35.00], label: 'Shahed-136 Wave', type: 'drone' },
          ],
          movements: [
            { points: [[27.18, 56.28], [26.50, 55.00], [25.00, 54.00]], label: 'IRIN sortie toward Strait', color: '#ff4444' },
          ]
        },
        {
          name: 'PHASE 2: IRON DOME RESPONSE',
          description: 'Israeli multi-layered missile defense engages. Arrow-3 intercepts exo-atmospheric threats, David\'s Sling handles medium range, Iron Dome catches short-range rockets. ~78% intercept rate. Some missiles penetrate - Nevatim AFB sustains damage. Civilian casualties in Tel Aviv suburbs.',
          duration: 6000,
          stats: { missiles: 0, intercepted: '249 of 320', casualties: '~85 civilian', assets: 'Arrow-3: 45/52, David\'s Sling: 89/110, Iron Dome: 115/158' },
          strikes: [
            { lat: 31.21, lng: 34.79, label: 'Nevatim AB Hit', type: 'impact' },
            { lat: 32.09, lng: 34.78, label: 'Tel Aviv suburb impact', type: 'impact' },
            { lat: 32.00, lng: 34.85, label: 'Iron Dome intercept', type: 'intercept' },
            { lat: 31.90, lng: 35.10, label: 'Arrow-3 intercept', type: 'intercept' },
            { lat: 32.79, lng: 34.99, label: 'Haifa intercept', type: 'intercept' },
          ],
          movements: []
        },
        {
          name: 'PHASE 3: IAF RETALIATORY STRIKE',
          description: 'Israel launches Operation Iron Sting. 100+ F-35I and F-15I sorties strike Iranian nuclear facilities at Natanz, Fordow, and Isfahan. B-2 Spirit bombers (US) deliver GBU-57 bunker busters on Fordow underground facility. Cyber attacks disable Iranian air defense networks.',
          duration: 8000,
          stats: { missiles: 85, intercepted: '12%', casualties: '~200 military', assets: 'Natanz 70% destroyed, Fordow entrance collapsed, Isfahan reactor damaged' },
          strikes: [
            { from: [31.21, 34.79], to: [33.51, 51.73], label: 'F-35I \u2192 Natanz', type: 'air_strike' },
            { from: [31.21, 34.79], to: [34.01, 51.26], label: 'F-35I \u2192 Fordow', type: 'air_strike' },
            { from: [31.21, 34.79], to: [32.65, 51.67], label: 'F-15I \u2192 Isfahan', type: 'air_strike' },
            { from: [32.09, 34.78], to: [34.04, 49.78], label: 'F-35I \u2192 Arak', type: 'air_strike' },
            { from: [29.00, 48.00], to: [34.01, 51.26], label: 'B-2 \u2192 Fordow (GBU-57)', type: 'air_strike' },
          ],
          movements: [
            { points: [[31.21, 34.79], [32.00, 40.00], [33.51, 51.73]], label: 'IAF strike package', color: '#3b82f6' },
            { points: [[29.00, 48.00], [31.00, 49.50], [34.01, 51.26]], label: 'B-2 route', color: '#ffffff' },
          ]
        },
        {
          name: 'PHASE 4: ESCALATION & PROXY RESPONSE',
          description: 'Hezbollah launches 5,000+ rockets from southern Lebanon. Houthis fire ASBMs at Israeli port of Eilat. Iraqi PMF drones target US bases at Al-Asad and Ain al-Assad. Region enters full multi-front conflict. UN Security Council emergency session called.',
          duration: 8000,
          stats: { missiles: 5200, intercepted: '65%', casualties: '~800 total', assets: '3 Israeli bases damaged, US Al-Asad hit, Eilat port fires' },
          strikes: [
            { from: [33.27, 35.20], to: [33.00, 35.50], label: 'Hezbollah rockets \u2192 N. Israel', type: 'rocket' },
            { from: [33.27, 35.20], to: [32.79, 34.99], label: 'Rockets \u2192 Haifa', type: 'rocket' },
            { from: [15.37, 44.19], to: [29.55, 34.95], label: 'Houthi ASBM \u2192 Eilat', type: 'missile' },
            { from: [33.80, 42.50], to: [33.80, 42.80], label: 'PMF drones \u2192 Al-Asad', type: 'drone' },
            { from: [33.27, 35.20], to: [32.09, 34.78], label: 'Precision missiles \u2192 Tel Aviv', type: 'missile' },
          ],
          movements: [
            { points: [[33.89, 35.50], [33.50, 35.30], [33.10, 35.10]], label: 'Hezbollah advance', color: '#ff4444' },
          ]
        }
      ]
    },
    {
      id: 'israel-strikes-iran-nukes',
      name: 'Israel Strikes Iran Nuclear Sites',
      icon: '\uD83C\uDDEE\uD83C\uDDF1\u2192\u2622\uFE0F',
      desc: 'Preemptive Israeli strike on Natanz, Fordow, Isfahan, Arak. Iran retaliates with missiles & proxy attacks.',
      color: '#3b82f6',
      center: [32, 48],
      zoom: 5,
      phases: [
        {
          name: 'PHASE 1: OPERATION IRON STING',
          description: 'Pre-dawn coordinated strike. Israeli F-35I Adir stealth fighters penetrate Iranian airspace via Saudi corridor. Electronic warfare aircraft jam S-300/Bavar-373 radars. First wave targets air defense networks. Cyber attack disables Iranian military communications.',
          duration: 7000,
          stats: { missiles: 0, intercepted: '0', casualties: '~30 IRGC', assets: '4 S-300 batteries destroyed, 2 Bavar-373 neutralized, radar network 60% degraded' },
          strikes: [
            { from: [31.21, 34.79], to: [32.80, 52.00], label: 'SEAD \u2192 S-300 Battery', type: 'air_strike' },
            { from: [31.21, 34.79], to: [35.40, 51.20], label: 'SEAD \u2192 Bavar-373', type: 'air_strike' },
            { from: [32.09, 34.78], to: [34.80, 48.50], label: 'EW jamming corridor', type: 'electronic' },
          ],
          movements: [
            { points: [[31.21, 34.79], [28.00, 42.00], [30.00, 48.00], [33.51, 51.73]], label: 'F-35I southern route', color: '#3b82f6' },
            { points: [[31.21, 34.79], [33.00, 40.00], [35.00, 48.00], [34.01, 51.26]], label: 'F-35I northern route', color: '#60a5fa' },
          ]
        },
        {
          name: 'PHASE 2: NUCLEAR FACILITY STRIKES',
          description: 'Second wave delivers GBU-28 and GBU-57 bunker busters on hardened nuclear facilities. Natanz underground centrifuge halls penetrated. Fordow mountain facility hit with repeated strikes. Isfahan uranium conversion facility destroyed. Arak heavy water reactor disabled.',
          duration: 8000,
          stats: { missiles: 120, intercepted: '8%', casualties: '~150', assets: 'Natanz: 80% destroyed, Fordow: 40% damaged, Isfahan: destroyed, Arak: disabled' },
          strikes: [
            { lat: 33.51, lng: 51.73, label: 'NATANZ - bunker busters', type: 'bunker_buster' },
            { lat: 34.01, lng: 51.26, label: 'FORDOW - GBU-57 MOP', type: 'bunker_buster' },
            { lat: 32.65, lng: 51.67, label: 'ISFAHAN UCF - destroyed', type: 'impact' },
            { lat: 34.04, lng: 49.78, label: 'ARAK reactor - disabled', type: 'impact' },
            { lat: 28.97, lng: 50.84, label: 'BUSHEHR - warning strikes', type: 'impact' },
          ],
          movements: []
        },
        {
          name: 'PHASE 3: IRANIAN RETALIATION',
          description: 'Iran responds within 4 hours. IRGC launches remaining ballistic missile inventory at Israeli cities. Shahab-3, Emad, and Fattah hypersonic missiles. Quds Force activates all proxy networks simultaneously. Strait of Hormuz partially mined.',
          duration: 8000,
          stats: { missiles: 250, intercepted: '72%', casualties: '~300', assets: '2 Israeli bases hit, Strait of Hormuz 30% mined' },
          strikes: [
            { from: [34.31, 47.06], to: [32.09, 34.78], label: 'Fattah hypersonic \u2192 Tel Aviv', type: 'missile' },
            { from: [33.51, 51.73], to: [31.21, 34.79], label: 'Emad \u2192 Nevatim', type: 'missile' },
            { from: [35.69, 51.39], to: [31.77, 35.21], label: 'Shahab \u2192 Jerusalem', type: 'missile' },
            { from: [27.18, 56.28], to: [26.50, 56.00], label: 'Mine laying ops', type: 'naval' },
          ],
          movements: [
            { points: [[27.18, 56.28], [26.60, 56.40], [26.20, 56.50]], label: 'IRIN mine layers', color: '#ef4444' },
          ]
        },
        {
          name: 'PHASE 4: US INTERVENTION',
          description: 'USS Eisenhower CSG launches Tomahawk strikes on remaining IRGC missile sites. US Air Force B-2 bombers hit Fordow with additional MOP bombs. THAAD and Patriot batteries deployed to protect Gulf allies. Oil prices spike to $180/barrel.',
          duration: 7000,
          stats: { missiles: 200, intercepted: '5%', casualties: '~100 IRGC', assets: 'IRGC missile capacity reduced 70%, Oil at $180/bbl' },
          strikes: [
            { from: [25.00, 55.00], to: [34.31, 47.06], label: 'Tomahawk \u2192 Kermanshah', type: 'cruise' },
            { from: [25.00, 55.00], to: [33.90, 48.75], label: 'Tomahawk \u2192 Khorramabad', type: 'cruise' },
            { from: [25.00, 55.00], to: [34.01, 51.26], label: 'Tomahawk \u2192 Fordow', type: 'cruise' },
            { from: [29.00, 48.00], to: [35.69, 51.39], label: 'B-2 \u2192 Tehran SAM sites', type: 'air_strike' },
          ],
          movements: [
            { points: [[25.00, 55.00], [26.00, 54.00], [27.00, 52.00]], label: 'CSG Eisenhower', color: '#ffffff' },
          ]
        }
      ]
    },
    {
      id: 'full-regional-war',
      name: 'Full Regional War',
      icon: '\uD83D\uDD25\uD83C\uDF0D',
      desc: 'Multi-front escalation: Iran, Hezbollah, Houthis, PMF all engage. US enters with carrier strikes.',
      color: '#f59e0b',
      center: [28, 45],
      zoom: 4,
      phases: [
        {
          name: 'PHASE 1: SIMULTANEOUS OPENING',
          description: 'Coordinated attack on all fronts. Hezbollah fires 3,000 rockets into northern Israel. Hamas remnants attack from Gaza tunnels. Houthis launch anti-ship missiles at Red Sea shipping. IRGC fires ballistic missiles. Iraqi PMF attacks US bases.',
          duration: 8000,
          stats: { missiles: 3500, intercepted: '60%', casualties: '~500', assets: '5 bases hit, 2 ships damaged, Haifa port fires' },
          strikes: [
            { from: [33.27, 35.20], to: [32.79, 34.99], label: 'Hezbollah \u2192 Haifa', type: 'rocket' },
            { from: [33.27, 35.20], to: [33.00, 35.50], label: 'Hezbollah \u2192 N. Israel', type: 'rocket' },
            { from: [31.50, 34.47], to: [31.30, 34.50], label: 'Hamas tunnels \u2192 border', type: 'ground' },
            { from: [15.37, 44.19], to: [13.00, 43.00], label: 'Houthi ASBM \u2192 Red Sea', type: 'missile' },
            { from: [34.31, 47.06], to: [32.09, 34.78], label: 'IRGC \u2192 Tel Aviv', type: 'missile' },
            { from: [33.80, 42.50], to: [33.80, 42.80], label: 'PMF \u2192 Al-Asad', type: 'drone' },
          ],
          movements: [
            { points: [[33.89, 35.50], [33.50, 35.30], [33.10, 35.00]], label: 'Hezbollah push south', color: '#ef4444' },
          ]
        },
        {
          name: 'PHASE 2: US CARRIER RESPONSE',
          description: 'Two US CSGs launch massive air campaign. F/A-18s and F-35Cs strike Hezbollah positions in Lebanon. Tomahawks hit IRGC bases in western Iran. USAF B-1B Lancers from Diego Garcia hit Houthi launch sites. Special operations raids on key targets.',
          duration: 8000,
          stats: { missiles: 400, intercepted: '3%', casualties: '~600 enemy', assets: '14 Hezbollah positions destroyed, 8 IRGC sites hit, Houthi launch sites cratered' },
          strikes: [
            { from: [34.00, 34.00], to: [33.27, 35.20], label: 'F/A-18 \u2192 S. Lebanon', type: 'air_strike' },
            { from: [25.00, 55.00], to: [34.31, 47.06], label: 'Tomahawk \u2192 IRGC', type: 'cruise' },
            { from: [25.00, 55.00], to: [33.90, 48.75], label: 'Tomahawk \u2192 Khorramabad', type: 'cruise' },
            { from: [20.00, 60.00], to: [15.37, 44.19], label: 'B-1B \u2192 Houthi sites', type: 'air_strike' },
          ],
          movements: [
            { points: [[34.50, 33.00], [34.00, 34.00], [33.50, 35.00]], label: 'CSG Ford', color: '#3b82f6' },
            { points: [[25.00, 55.00], [26.00, 53.00], [27.00, 51.00]], label: 'CSG Eisenhower', color: '#3b82f6' },
          ]
        },
        {
          name: 'PHASE 3: GROUND OFFENSIVE',
          description: 'IDF launches ground incursion into southern Lebanon to push Hezbollah beyond Litani River. 4 divisions committed. Iran threatens to close Strait of Hormuz completely. Turkey threatens intervention if Kurdish areas targeted. NATO Article 5 discussions begin.',
          duration: 8000,
          stats: { missiles: 800, intercepted: '55%', casualties: '~2,000', assets: 'IDF advances 15km into Lebanon, Hezbollah retreats to Litani' },
          strikes: [
            { from: [33.10, 35.10], to: [33.27, 35.20], label: 'IDF artillery \u2192 Hezbollah', type: 'artillery' },
            { from: [34.31, 47.06], to: [31.21, 34.79], label: 'IRGC salvo 2', type: 'missile' },
            { from: [15.37, 44.19], to: [29.55, 34.95], label: 'Houthi \u2192 Eilat', type: 'missile' },
          ],
          movements: [
            { points: [[33.10, 35.10], [33.20, 35.15], [33.35, 35.25]], label: 'IDF 36th Division', color: '#3b82f6' },
            { points: [[33.05, 35.30], [33.15, 35.35], [33.30, 35.40]], label: 'IDF 91st Division', color: '#60a5fa' },
            { points: [[27.18, 56.28], [26.80, 56.40], [26.40, 56.60]], label: 'IRIN blockade force', color: '#ef4444' },
          ]
        },
        {
          name: 'PHASE 4: CEASEFIRE PRESSURE',
          description: 'UN Security Council passes Resolution demanding immediate ceasefire. China and Russia threaten consequences for continued US involvement. Oil at $220/barrel. Global markets crash 15%. Diplomatic back-channels activate. 72-hour ceasefire proposed.',
          duration: 6000,
          stats: { missiles: 0, intercepted: 'N/A', casualties: '~4,500 total', assets: 'Oil $220/bbl, Markets -15%, Ceasefire negotiations begin' },
          strikes: [],
          movements: []
        }
      ]
    },
    {
      id: 'hormuz-closure',
      name: 'Strait of Hormuz Closure',
      icon: '\u2693\uD83D\uDEA2',
      desc: 'Iran mines the strait, naval confrontation, oil disruption, economic warfare.',
      color: '#06b6d4',
      center: [26.5, 56],
      zoom: 7,
      phases: [
        {
          name: 'PHASE 1: MINE LAYING',
          description: 'Under cover of naval exercises, IRGC Navy deploys 2,000+ sea mines across the Strait of Hormuz shipping lanes. Fast attack craft lay contact and influence mines. Submarine-launched mines placed in deep channels. Iran declares exclusion zone.',
          duration: 7000,
          stats: { missiles: 0, intercepted: 'N/A', casualties: '0', assets: '2,000+ mines deployed, shipping lane blocked' },
          strikes: [
            { lat: 26.57, lng: 56.25, label: 'Minefield Alpha', type: 'mine' },
            { lat: 26.50, lng: 56.15, label: 'Minefield Bravo', type: 'mine' },
            { lat: 26.43, lng: 56.30, label: 'Minefield Charlie', type: 'mine' },
            { lat: 26.35, lng: 56.45, label: 'Minefield Delta', type: 'mine' },
            { lat: 26.60, lng: 56.40, label: 'Minefield Echo', type: 'mine' },
          ],
          movements: [
            { points: [[27.18, 56.28], [26.80, 56.20], [26.50, 56.25]], label: 'IRGCN mine layers', color: '#ef4444' },
            { points: [[25.65, 57.77], [26.10, 57.00], [26.40, 56.30]], label: 'Jask FAC squadron', color: '#ef4444' },
          ]
        },
        {
          name: 'PHASE 2: FIRST TANKER HIT',
          description: 'VLCC "Pacific Voyager" (Liberian flag) strikes mine in main shipping channel. 300,000 DWT tanker disabled, massive oil spill. Second tanker "Arabian Sea" hit by IRGC anti-ship missile. Lloyd\'s suspends all Hormuz transit insurance. Oil jumps to $150/barrel instantly.',
          duration: 7000,
          stats: { missiles: 2, intercepted: '0%', casualties: '4 crew', assets: '2 tankers hit, Oil $150/bbl, Insurance suspended' },
          strikes: [
            { lat: 26.50, lng: 56.20, label: 'VLCC Pacific Voyager - mine strike', type: 'naval_hit' },
            { lat: 26.55, lng: 56.35, label: 'Arabian Sea - ASCM hit', type: 'naval_hit' },
          ],
          movements: [
            { points: [[25.65, 57.77], [26.20, 56.80], [26.55, 56.35]], label: 'IRGCN missile boat', color: '#ef4444' },
          ]
        },
        {
          name: 'PHASE 3: US NAVY MCM OPERATIONS',
          description: 'US 5th Fleet deploys mine countermeasures (MCM) force. MH-53E Sea Dragons sweep channels. USS Avenger-class MCM ships clear lanes. Iran warns any mine clearing is act of war. IRGC fast boats harass MCM vessels. US destroyers provide escort with live weapons free ROE.',
          duration: 8000,
          stats: { missiles: 0, intercepted: 'N/A', casualties: '2', assets: '200 mines cleared, 3 IRGC boats destroyed' },
          strikes: [
            { lat: 26.50, lng: 56.25, label: 'Mine sweep Alpha', type: 'mine_clear' },
            { lat: 26.45, lng: 56.20, label: 'Mine sweep Bravo', type: 'mine_clear' },
            { lat: 26.55, lng: 56.30, label: 'IRGC boat destroyed', type: 'impact' },
            { lat: 26.48, lng: 56.35, label: 'IRGC boat destroyed', type: 'impact' },
          ],
          movements: [
            { points: [[25.30, 56.20], [25.80, 56.00], [26.30, 56.10], [26.50, 56.25]], label: 'MCM Force Alpha', color: '#3b82f6' },
            { points: [[25.00, 55.00], [25.50, 55.50], [26.00, 55.80]], label: 'DDG escort', color: '#ffffff' },
          ]
        },
        {
          name: 'PHASE 4: ECONOMIC FALLOUT',
          description: '21% of global oil transit disrupted. Oil at $200/barrel. Gas prices triple worldwide. Global recession fears. China mediates. Iran demands sanctions relief in exchange for reopening strait. US threatens strikes on Iranian naval bases if mines not removed.',
          duration: 6000,
          stats: { missiles: 0, intercepted: 'N/A', casualties: '~50 total', assets: 'Oil $200/bbl, 21% global oil disrupted, Gas 3x, GDP -2.1% projected' },
          strikes: [],
          movements: []
        }
      ]
    }
  ];

  function init() {
    // Don't init until SIM page is visible
  }

  function ensureMap() {
    if (map) return;
    const container = document.getElementById('sim-map');
    if (!container) return;

    map = L.map('sim-map', {
      center: [32, 50],
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    simLayers.strikes = L.layerGroup().addTo(map);
    simLayers.movements = L.layerGroup().addTo(map);
    simLayers.ranges = L.layerGroup().addTo(map);
  }

  function selectScenario(id) {
    const scenario = SCENARIOS.find(s => s.id === id);
    if (!scenario) return;

    stopPlayback();
    currentScenario = scenario;
    currentPhase = 0;

    ensureMap();

    // Highlight selected card
    document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.scenario-card[data-scenario="${id}"]`);
    if (card) card.classList.add('active');

    // Show sim content
    const content = document.getElementById('sim-content');
    if (content) content.style.display = 'flex';

    // Center map
    map.setView(scenario.center, scenario.zoom, { animate: true });

    // Render phase list
    renderPhaseList();
    renderPhase(0);
    updateTimeline();
  }

  function renderPhaseList() {
    const panel = document.getElementById('sim-phase-list');
    if (!panel || !currentScenario) return;

    panel.innerHTML = currentScenario.phases.map((p, i) => `
      <div class="sim-phase-item ${i === currentPhase ? 'active' : ''}" data-phase="${i}">
        <div class="sim-phase-name">${p.name}</div>
        <div class="sim-phase-desc">${p.description.slice(0, 100)}...</div>
      </div>
    `).join('');

    panel.querySelectorAll('.sim-phase-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.phase);
        stopPlayback();
        renderPhase(idx);
      });
    });
  }

  function renderPhase(idx) {
    if (!currentScenario || idx < 0 || idx >= currentScenario.phases.length) return;
    currentPhase = idx;
    const phase = currentScenario.phases[idx];

    // Clear previous animations
    clearAnimations();
    simLayers.strikes.clearLayers();
    simLayers.movements.clearLayers();
    simLayers.ranges.clearLayers();

    // Update phase list highlight
    document.querySelectorAll('.sim-phase-item').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });

    // Update description
    const descEl = document.getElementById('sim-phase-desc');
    if (descEl) descEl.textContent = phase.description;

    // Update stats
    const statsEl = document.getElementById('sim-stats');
    if (statsEl && phase.stats) {
      statsEl.innerHTML = `
        <div class="sim-stat"><span class="sim-stat-label">MISSILES</span><span class="sim-stat-value">${phase.stats.missiles}</span></div>
        <div class="sim-stat"><span class="sim-stat-label">INTERCEPTED</span><span class="sim-stat-value">${phase.stats.intercepted}</span></div>
        <div class="sim-stat"><span class="sim-stat-label">CASUALTIES</span><span class="sim-stat-value">${phase.stats.casualties}</span></div>
        <div class="sim-stat"><span class="sim-stat-label">ASSETS</span><span class="sim-stat-value">${phase.stats.assets}</span></div>
      `;
    }

    updateTimeline();

    // Animate strikes with delays
    phase.strikes.forEach((s, i) => {
      const delay = i * 600;
      const timer = setTimeout(() => animateStrike(s), delay);
      animTimers.push(timer);
    });

    // Animate movements
    phase.movements.forEach((m, i) => {
      const delay = i * 400 + 800;
      const timer = setTimeout(() => animateMovement(m), delay);
      animTimers.push(timer);
    });
  }

  function animateStrike(s) {
    if (!map) return;

    if (s.from && s.to) {
      // Missile arc animation
      const line = L.polyline([s.from, s.to], {
        color: getStrikeColor(s.type),
        weight: 2,
        opacity: 0,
        dashArray: '8, 6',
        className: 'sim-missile-trail'
      }).addTo(simLayers.strikes);

      // Animate the line appearing
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.1;
        line.setStyle({ opacity: Math.min(opacity, 0.8) });
        if (opacity >= 0.8) clearInterval(fadeIn);
      }, 50);
      animTimers.push(fadeIn);

      // Impact marker at destination
      const impactTimer = setTimeout(() => {
        createImpactMarker(s.to[0], s.to[1], s.label, s.type);
      }, 800);
      animTimers.push(impactTimer);

      // Label at midpoint
      const mid = [(s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2];
      const labelIcon = L.divIcon({
        className: 'sim-label',
        html: `<div class="sim-strike-label">${s.label}</div>`,
        iconSize: [200, 20],
        iconAnchor: [100, 10]
      });
      L.marker(mid, { icon: labelIcon, interactive: false }).addTo(simLayers.strikes);

    } else if (s.lat !== undefined) {
      // Static strike/impact marker
      createImpactMarker(s.lat, s.lng, s.label, s.type);
    }
  }

  function createImpactMarker(lat, lng, label, type) {
    const color = getStrikeColor(type);
    const isIntercept = type === 'intercept' || type === 'mine_clear';
    const pulseSize = isIntercept ? 20 : 30;

    const icon = L.divIcon({
      className: 'sim-impact-icon',
      html: `<div class="sim-impact ${isIntercept ? 'sim-intercept' : 'sim-explosion'}" style="--color:${color};--size:${pulseSize}px">
        <div class="sim-impact-ring"></div>
        <div class="sim-impact-core"></div>
      </div>`,
      iconSize: [pulseSize, pulseSize],
      iconAnchor: [pulseSize / 2, pulseSize / 2]
    });

    const marker = L.marker([lat, lng], { icon }).addTo(simLayers.strikes);
    marker.bindTooltip(label, {
      permanent: false,
      direction: 'top',
      className: 'sim-tooltip'
    });
  }

  function animateMovement(m) {
    if (!map || !m.points || m.points.length < 2) return;

    // Animated polyline
    const line = L.polyline(m.points, {
      color: m.color || '#ffffff',
      weight: 3,
      opacity: 0.7,
      dashArray: '12, 8'
    }).addTo(simLayers.movements);

    // Arrow marker at the end
    const end = m.points[m.points.length - 1];
    const arrowIcon = L.divIcon({
      className: 'sim-arrow-icon',
      html: `<div class="sim-movement-arrow" style="color:${m.color || '#fff'}">\u25B6 ${m.label}</div>`,
      iconSize: [200, 20],
      iconAnchor: [0, 10]
    });
    L.marker(end, { icon: arrowIcon, interactive: false }).addTo(simLayers.movements);
  }

  function getStrikeColor(type) {
    const colors = {
      missile: '#ef4444',
      cruise: '#f97316',
      drone: '#eab308',
      air_strike: '#3b82f6',
      rocket: '#f43f5e',
      impact: '#ff0000',
      intercept: '#22c55e',
      bunker_buster: '#a855f7',
      electronic: '#06b6d4',
      naval: '#0ea5e9',
      naval_hit: '#ff4444',
      mine: '#f59e0b',
      mine_clear: '#10b981',
      ground: '#78716c',
      artillery: '#fb923c'
    };
    return colors[type] || '#ef4444';
  }

  function clearAnimations() {
    animTimers.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    animTimers = [];
  }

  function play() {
    if (!currentScenario) return;
    isPlaying = true;
    updatePlayButton();

    const phase = currentScenario.phases[currentPhase];
    const duration = (phase.duration || 6000) / speed;

    playInterval = setTimeout(() => {
      if (currentPhase < currentScenario.phases.length - 1) {
        currentPhase++;
        renderPhaseList();
        renderPhase(currentPhase);
        if (isPlaying) play();
      } else {
        stopPlayback();
      }
    }, duration);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playInterval) clearTimeout(playInterval);
    playInterval = null;
    updatePlayButton();
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlayback();
    } else {
      play();
    }
  }

  function stepForward() {
    stopPlayback();
    if (currentScenario && currentPhase < currentScenario.phases.length - 1) {
      currentPhase++;
      renderPhaseList();
      renderPhase(currentPhase);
    }
  }

  function stepBack() {
    stopPlayback();
    if (currentScenario && currentPhase > 0) {
      currentPhase--;
      renderPhaseList();
      renderPhase(currentPhase);
    }
  }

  function setSpeed(s) {
    speed = s;
    document.querySelectorAll('.sim-speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === s);
    });
  }

  function updatePlayButton() {
    const btn = document.getElementById('sim-play-btn');
    if (btn) btn.textContent = isPlaying ? '\u23F8' : '\u25B6';
  }

  function updateTimeline() {
    if (!currentScenario) return;
    const total = currentScenario.phases.length;
    const bar = document.getElementById('sim-progress-bar');
    if (bar) bar.style.width = ((currentPhase + 1) / total * 100) + '%';
    const label = document.getElementById('sim-phase-label');
    if (label) label.textContent = `Phase ${currentPhase + 1}/${total}`;
  }

  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  }

  // Public API
  return {
    init,
    selectScenario,
    togglePlay,
    stepForward,
    stepBack,
    setSpeed,
    invalidateSize
  };
})();
