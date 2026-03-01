// Main app - WebSocket connection and data routing

(function () {
  // State
  let ws = null;
  let reconnectDelay = 1000;
  let eventsData = [];
  let conflictsData = [];
  let strikesData = [];
  let earthquakesData = [];
  let weatherData = {};
  let aircraftData = [];
  let shipsData = [];
  let newsData = [];
  let polymarketData = [];

  // Initialize
  startClock();
  MapModule.init();
  ConsoleModule.init();
  connectWebSocket();
  initKeyboardShortcuts();
  initSitrep();
  initAmbientAudio();
  initSigintFeed();
  initAlertSounds();

  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}`;

    setStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('connected');
      reconnectDelay = 1000;
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      console.log(`WebSocket closed, reconnecting in ${reconnectDelay / 1000}s...`);
      setTimeout(connectWebSocket, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function handleMessage(msg) {
    const { type, data } = msg;
    if (!data) return;
    if (type === 'polymarket') {
      polymarketData = Array.isArray(data) ? data : [];
      renderPolymarket(polymarketData);
      return;
    }
    if (!Array.isArray(data)) return;

    switch (type) {
      case 'news':
        newsData = data;
        NewsModule.update(data);
        MapModule.updateNewsMarkers(data);
        pulseIndicator('dp-news');
        if (data.some(a => a.source && a.source.startsWith('X/'))) pulseIndicator('dp-osint');
        updateTicker(data);
        updateThreatLevel(data);
        checkBreaking(data);
        bumpActivity();
        playDataBlip('news');
        break;

      case 'aircraft':
        aircraftData = data;
        MapModule.updateAircraft(data);
        SidebarModule.updateAircraftStats(data);
        MapModule.checkProximityAlerts(data);
        pulseIndicator('dp-air');
        bumpActivity();
        playDataBlip('aircraft');
        break;

      case 'ships':
        shipsData = data;
        MapModule.updateShips(data);
        SidebarModule.updateShipStats(data);
        pulseIndicator('dp-sea');
        bumpActivity();
        playDataBlip('ships');
        break;

      case 'events':
        eventsData = data;
        MapModule.updateEvents(data);
        SidebarModule.updateEventStats(eventsData, conflictsData);
        SidebarModule.updateTimeline(eventsData, conflictsData);
        MapModule.updateHeatmap(conflictsData, eventsData, strikesData);
        break;

      case 'conflicts':
        conflictsData = data;
        MapModule.updateConflicts(data);
        SidebarModule.updateEventStats(eventsData, conflictsData);
        SidebarModule.updateTimeline(eventsData, conflictsData);
        MapModule.updateHeatmap(conflictsData, eventsData, strikesData);
        break;

      case 'strikes':
        // Detect new strikes and animate missile arcs
        const newStrikes = data.filter(s => !strikesData.find(old => old.lat === s.lat && old.lng === s.lng));
        strikesData = data;
        MapModule.updateDynamicStrikes(data);
        pulseIndicator('dp-strikes');
        updateStrikeCount(data);
        MapModule.updateHeatmap(conflictsData, eventsData, strikesData);
        // Animate arcs for newly detected strikes
        newStrikes.forEach(s => {
          // Guess origin based on target country
          let originLat = 36.42, originLng = 55.02; // Default: Shahroud (Iran)
          if (s.name && /iran/i.test(s.name)) {
            originLat = 31.21; originLng = 34.93; // Nevatim (Israel)
          }
          MapModule.showMissileArc(originLat, originLng, s.lat, s.lng, s.name || 'STRIKE');
        });
        playEscalatedAlert('critical');
        break;

      case 'earthquakes':
        earthquakesData = data;
        MapModule.updateEarthquakes(data);
        // Check for nuclear proximity alerts
        data.forEach(q => {
          if (q.nearNuclear) {
            triggerSeismicAlert(q);
          }
        });
        bumpActivity();
        break;

      case 'weather':
        weatherData = data;
        MapModule.updateWeather(data);
        bumpActivity();
        break;

      case 'aircraftTrails':
        MapModule.updateTrails(data);
        break;
    }
  }

  // HUD: Pulse a data indicator dot
  function pulseIndicator(id) {
    const dot = document.getElementById(id);
    if (!dot) return;
    dot.classList.add('active');
    setTimeout(() => dot.classList.remove('active'), 3000);
  }

  // HUD: Update ticker with latest critical/high headlines
  function updateTicker(articles) {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const critical = articles.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 10);
    if (critical.length === 0) return;
    const items = critical.map(a => `\u26A0 ${(a.title || '').slice(0, 120).toUpperCase()}`);
    // Duplicate for seamless scroll
    const html = items.map(t => `<span>${t}</span><span class="ticker-sep">\u2502</span>`).join('');
    track.innerHTML = html + html;
  }

  // HUD: Update threat level based on severity distribution
  function updateThreatLevel(articles) {
    const el = document.getElementById('threat-level');
    if (!el) return;
    const critCount = articles.filter(a => a.severity === 'critical').length;
    const highCount = articles.filter(a => a.severity === 'high').length;
    if (critCount >= 3) {
      el.textContent = 'CRITICAL';
      el.className = 'threat-level-value critical';
    } else if (critCount >= 1 || highCount >= 3) {
      el.textContent = 'HIGH';
      el.className = 'threat-level-value high';
    } else {
      el.textContent = 'ELEVATED';
      el.className = 'threat-level-value high';
    }
  }

  // HUD: Update strike counter
  function updateStrikeCount(data) {
    const el = document.getElementById('strike-count');
    if (el) el.textContent = data.length;
  }

  // Breaking news banner
  let lastBreakingId = '';
  function checkBreaking(articles) {
    const breaking = articles.find(a =>
      a.severity === 'critical' &&
      a.id !== lastBreakingId &&
      (a.title || '').toLowerCase().match(/breaking|just in|confirmed|killed|dead|supreme leader/)
    );
    if (!breaking) return;
    lastBreakingId = breaking.id;
    const banner = document.getElementById('breaking-banner');
    const text = document.getElementById('breaking-text');
    if (!banner || !text) return;
    text.textContent = (breaking.title || '').toUpperCase();
    banner.classList.add('visible');
    // Play alert sound
    playAlertSound();
    // Auto-hide after 30s
    setTimeout(() => banner.classList.remove('visible'), 30000);
  }

  // Close breaking banner
  const breakingClose = document.getElementById('breaking-close');
  if (breakingClose) {
    breakingClose.addEventListener('click', () => {
      document.getElementById('breaking-banner')?.classList.remove('visible');
    });
  }

  // Sound alert system
  let soundEnabled = false;
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggle.classList.toggle('active', soundEnabled);
      soundToggle.innerHTML = soundEnabled ? '&#128264;' : '&#128263;';
    });
  }

  function playAlertSound() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Two-tone alert beep
      [800, 600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = 0.08;
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.12);
      });
    } catch (e) {}
  }

  // Activity sparkline - tracks updates per minute
  const sparkData = new Array(20).fill(0);
  let sparkCounter = 0;
  function bumpActivity() {
    sparkCounter++;
  }
  // Update sparkline every 3 seconds
  setInterval(() => {
    sparkData.push(sparkCounter);
    sparkData.shift();
    sparkCounter = 0;
    const sparkEl = document.getElementById('activity-spark');
    if (!sparkEl) return;
    const max = Math.max(...sparkData, 1);
    sparkEl.innerHTML = sparkData.map(v =>
      `<div class="spark-bar" style="height:${Math.max(1, (v / max) * 18)}px"></div>`
    ).join('');
  }, 3000);

  function setStatus(state) {
    const el = document.getElementById('ws-status');
    el.className = 'ws-status ' + state;
    switch (state) {
      case 'connected':
        el.innerHTML = '&#9679; LIVE';
        break;
      case 'disconnected':
        el.innerHTML = '&#9679; OFFLINE';
        break;
      case 'connecting':
        el.innerHTML = '&#9679; CONNECTING';
        break;
    }
  }

  // Seismic alert near nuclear facility
  function triggerSeismicAlert(quake) {
    const banner = document.getElementById('breaking-banner');
    const text = document.getElementById('breaking-text');
    if (!banner || !text) return;
    text.textContent = `SEISMIC EVENT NEAR ${quake.nearNuclear.site} - MAG ${quake.magnitude} - ${quake.nearNuclear.distKm}KM FROM FACILITY`;
    banner.classList.add('visible');
    playAlertSound();
    playCriticalAlert();
    setTimeout(() => banner.classList.remove('visible'), 30000);
  }

  // === KEYBOARD SHORTCUTS ===
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === '`') {
        e.preventDefault();
        ConsoleModule.toggle();
      } else if (e.key === 'm' || e.key === 'M') {
        const btn = document.getElementById('measure-btn');
        if (btn) btn.click();
      } else if (e.key === 'Escape') {
        // Close measure mode
        const btn = document.getElementById('measure-btn');
        if (btn && btn.classList.contains('active')) {
          btn.click();
        }
        // Close console
        const consoleEl = document.getElementById('console-overlay');
        if (consoleEl && consoleEl.classList.contains('visible')) {
          ConsoleModule.toggle();
        }
        // Clear measurement
        MapModule.clearMeasurement();
      }
    });
  }

  // === SITREP GENERATOR ===
  function initSitrep() {
    const btn = document.getElementById('sitrep-btn');
    const modal = document.getElementById('sitrep-modal');
    const closeBtn = document.getElementById('sitrep-close');
    const copyBtn = document.getElementById('sitrep-copy');
    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
      generateSitrep();
      modal.classList.add('visible');
    });

    closeBtn?.addEventListener('click', () => {
      modal.classList.remove('visible');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });

    copyBtn?.addEventListener('click', () => {
      const body = document.getElementById('sitrep-body');
      if (body) {
        navigator.clipboard.writeText(body.textContent).then(() => {
          copyBtn.textContent = 'COPIED';
          setTimeout(() => { copyBtn.textContent = 'COPY TO CLIPBOARD'; }, 2000);
        });
      }
    });
  }

  function generateSitrep() {
    const body = document.getElementById('sitrep-body');
    if (!body) return;

    const now = new Date();
    const threatEl = document.getElementById('threat-level');
    const threat = threatEl ? threatEl.textContent : 'UNKNOWN';
    const militaryAircraft = aircraftData.filter(a => a.military);
    const criticalNews = newsData.filter(a => a.severity === 'critical').slice(0, 5);
    const highNews = newsData.filter(a => a.severity === 'high').slice(0, 5);

    let report = '';
    report += `SITUATION REPORT (SITREP)\n`;
    report += `${'='.repeat(50)}\n`;
    report += `DTG: ${now.toUTCString()}\n`;
    report += `CLASSIFICATION: UNCLASSIFIED // FOUO\n`;
    report += `THEATER: IRAN / MIDDLE EAST\n\n`;

    report += `1. THREAT ASSESSMENT\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `   Overall Threat Level: ${threat}\n`;
    report += `   Strikes Detected: ${strikesData.length}\n`;
    report += `   Active Conflicts: ${conflictsData.length}\n`;
    report += `   Tracked Events: ${eventsData.length}\n\n`;

    report += `2. AIR PICTURE\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `   Total Aircraft Tracked: ${aircraftData.length}\n`;
    report += `   Military Aircraft: ${militaryAircraft.length}\n`;
    if (militaryAircraft.length > 0) {
      militaryAircraft.slice(0, 8).forEach(a => {
        report += `   - ${a.callsign || 'UNK'} (${a.country}) ALT:${a.altitude ? Math.round(a.altitude) + 'm' : 'N/A'} HDG:${a.heading ? Math.round(a.heading) + '\u00B0' : 'N/A'}\n`;
      });
    }
    report += '\n';

    report += `3. MARITIME PICTURE\n`;
    report += `${'─'.repeat(40)}\n`;
    report += `   Vessels Tracked: ${shipsData.length}\n`;
    if (shipsData.length > 0) {
      shipsData.slice(0, 5).forEach(s => {
        report += `   - ${s.name || 'UNK'} (${s.flag}) ${s.type} @ ${s.speed}kts\n`;
      });
    }
    report += `\n`;

    if (strikesData.length > 0) {
      report += `4. STRIKE ACTIVITY\n`;
      report += `${'─'.repeat(40)}\n`;
      strikesData.slice(0, 5).forEach(s => {
        report += `   - ${s.name}: ${(s.title || s.desc || '').slice(0, 80)}\n`;
      });
      report += `\n`;
    }

    if (earthquakesData.length > 0) {
      report += `5. SEISMIC ACTIVITY\n`;
      report += `${'─'.repeat(40)}\n`;
      earthquakesData.slice(0, 3).forEach(q => {
        report += `   - MAG ${q.magnitude} @ ${q.place}${q.nearNuclear ? ' [NEAR ' + q.nearNuclear.site + ']' : ''}\n`;
      });
      report += `\n`;
    }

    report += `6. KEY DEVELOPMENTS\n`;
    report += `${'─'.repeat(40)}\n`;
    if (criticalNews.length > 0) {
      report += `   CRITICAL:\n`;
      criticalNews.forEach(n => {
        report += `   - ${(n.title || '').slice(0, 90)}\n`;
      });
    }
    if (highNews.length > 0) {
      report += `   HIGH:\n`;
      highNews.forEach(n => {
        report += `   - ${(n.title || '').slice(0, 90)}\n`;
      });
    }
    report += `\n`;
    report += `${'='.repeat(50)}\n`;
    report += `END SITREP // ${now.toISOString()}\n`;

    // Typewriter effect
    body.textContent = '';
    let idx = 0;
    const typeSpeed = 2;
    function typeChar() {
      if (idx < report.length) {
        const chunk = report.slice(idx, idx + 3);
        body.textContent += chunk;
        idx += 3;
        body.scrollTop = body.scrollHeight;
        setTimeout(typeChar, typeSpeed);
      }
    }
    typeChar();
  }

  // === AUDIO AMBIANCE ===
  let ambientCtx = null;
  let ambientHum = null;
  let ambientGain = null;
  let ambientEnabled = false;

  function initAmbientAudio() {
    // Extend existing sound toggle to include ambient mode
    // Double-click sound toggle to enable ambient mode
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        ambientEnabled = !ambientEnabled;
        if (ambientEnabled) {
          startAmbientHum();
          soundToggle.style.borderColor = '#06b6d4';
        } else {
          stopAmbientHum();
          soundToggle.style.borderColor = '';
        }
      });
    }
  }

  function startAmbientHum() {
    try {
      if (!ambientCtx) ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
      ambientHum = ambientCtx.createOscillator();
      ambientGain = ambientCtx.createGain();
      ambientHum.connect(ambientGain);
      ambientGain.connect(ambientCtx.destination);
      ambientHum.frequency.value = 40;
      ambientHum.type = 'sine';
      ambientGain.gain.value = 0.015;
      ambientHum.start();
    } catch (e) {}
  }

  function stopAmbientHum() {
    try {
      if (ambientHum) { ambientHum.stop(); ambientHum = null; }
    } catch (e) {}
  }

  function playDataBlip(type) {
    if (!soundEnabled && !ambientEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.03;

      if (type === 'aircraft') {
        osc.frequency.value = 1200;
        osc.type = 'sine';
      } else if (type === 'ships') {
        osc.frequency.value = 200;
        osc.type = 'sine';
      } else {
        osc.frequency.value = 800;
        osc.type = 'square';
        gain.gain.value = 0.015;
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  function playCriticalAlert() {
    if (!soundEnabled && !ambientEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [600, 900, 1200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = 0.06;
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.15);
      });
    } catch (e) {}
  }

  // Live stream functionality removed - theater page handles streams directly

  // === POLYMARKET PANEL ===
  function renderPolymarket(markets) {
    const feed = document.getElementById('polymarket-feed');
    if (!feed) return;
    if (!markets || markets.length === 0) {
      feed.innerHTML = '<div class="poly-empty">Searching for Iran-related markets...</div>';
      return;
    }
    feed.innerHTML = markets.map(m => {
      const yesOutcome = m.outcomes.find(o => o.name === 'Yes');
      const noOutcome = m.outcomes.find(o => o.name === 'No');
      const yesPct = yesOutcome ? yesOutcome.pct : '--';
      const noPct = noOutcome ? noOutcome.pct : '--';
      const yesPrice = yesOutcome ? yesOutcome.price : 0;
      const barWidth = Math.round(yesPrice * 100);
      const vol = m.volume > 1000000 ? `$${(m.volume / 1000000).toFixed(1)}M` : m.volume > 1000 ? `$${(m.volume / 1000).toFixed(0)}K` : `$${Math.round(m.volume)}`;
      const endDate = m.endDate ? new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

      return `<div class="poly-market" onclick="window.open('${escapeHtml(m.url)}','_blank')">
        <div class="poly-title">${escapeHtml(m.title)}</div>
        <div class="poly-bar-wrap">
          <div class="poly-bar-yes" style="width:${barWidth}%"></div>
        </div>
        <div class="poly-odds">
          <span class="poly-yes">YES ${yesPct}</span>
          <span class="poly-no">NO ${noPct}</span>
        </div>
        <div class="poly-meta">
          <span class="poly-vol">VOL ${vol}</span>
          ${endDate ? `<span class="poly-end">ENDS ${endDate}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // === SIGINT COMMS INTERCEPT FEED ===
  function initSigintFeed() {
    const feed = document.getElementById('sigint-feed');
    if (!feed) return;

    const bands = ['HF 3.5MHz', 'VHF 118.0MHz', 'UHF 243.0MHz', 'UHF 340.2MHz', 'HF 6.7MHz', 'VHF 156.8MHz', 'UHF 225.0MHz', 'HF 8.9MHz'];
    const callsigns = ['DARKSTAR', 'VIPER-6', 'SABRE ACTUAL', 'EAGLE-3', 'OVERLORD', 'WARHOUND', 'SHADOW-9', 'THUNDER-1', 'GUARDIAN', 'RAPTOR-5', 'ANVIL', 'REAPER-2'];
    const prefixes = ['//FLASH//', '//ROUTINE//', '//PRIORITY//', '//IMMEDIATE//'];
    const contents = [
      'FREQ CHANGE AUTH... SWITCHING TO ALT COMMS',
      'CONTACT BEARING 045 RANGE 120NM ANGELS 35',
      'AUTHENTICATE ALPHA BRAVO... CONFIRMED',
      'RTB ORDERED... BINGO FUEL STATE',
      'EYES ON TARGET... AWAITING ROE CLEARANCE',
      'JAMMING DETECTED BAND 3... COUNTERMEASURES ACTIVE',
      'MOVEMENT GRID 38TQM... 3X VEHICLES SOUTHBOUND',
      'CROSSING ADIZ... SQUAWK CHANGE 7700',
      'PACKAGE INBOUND... ETA 15 MIKES',
      'SPLASH ONE... TARGET NEUTRALIZED',
      'COMMS CHECK... ALL STATIONS REPORT',
      'INTEL SUGGESTS ACTIVITY AT KNOWN SITE...',
      'SCRAMBLE ALERT... CONDITION RED',
      'MISSION ABORT CODE RECEIVED... RTB',
      'RADAR CONTACT LOST... LAST KNOWN POS...',
      'SAR ACTIVATED... SEARCH SECTOR DELTA',
      'HOSTILE EMITTERS DETECTED... BEARING 270',
      'CLASSIFIED TRAFFIC... ENCRYPTING...',
    ];

    function genHexBlock(len) {
      return Array.from({ length: len }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(' ');
    }

    function addIntercept() {
      const band = bands[Math.floor(Math.random() * bands.length)];
      const call = callsigns[Math.floor(Math.random() * callsigns.length)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const content = contents[Math.floor(Math.random() * contents.length)];
      const encrypted = Math.random() > 0.6;
      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });

      const div = document.createElement('div');
      div.className = 'sigint-entry' + (prefix === '//FLASH//' ? ' sigint-flash' : '');
      div.innerHTML = `<span class="sigint-ts">${ts}Z</span> <span class="sigint-band">[${band}]</span> <span class="sigint-call">${call}</span> ${prefix} ${encrypted ? `<span class="sigint-encrypted">[ENCRYPTED] ${genHexBlock(8)}</span>` : `<span class="sigint-clear">${content}</span>`}`;

      feed.insertBefore(div, feed.firstChild);
      if (feed.children.length > 50) feed.removeChild(feed.lastChild);
    }

    // Seed initial entries
    for (let i = 0; i < 8; i++) addIntercept();
    // Add new intercepts at random intervals
    setInterval(addIntercept, 4000 + Math.random() * 6000);
  }

  // === ALERT SOUND ESCALATION ===
  let alertSoundsReady = false;
  function initAlertSounds() {
    alertSoundsReady = true;
    // Listen for proximity alerts
    document.addEventListener('proximityAlert', (e) => {
      playEscalatedAlert('high');
    });
  }

  function playEscalatedAlert(level) {
    if (!soundEnabled && !ambientEnabled) return;
    if (!alertSoundsReady) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      if (level === 'critical') {
        // Klaxon: alternating high/low tones
        [880, 440, 880, 440].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sawtooth';
          gain.gain.value = 0.06;
          osc.start(ctx.currentTime + i * 0.2);
          osc.stop(ctx.currentTime + i * 0.2 + 0.18);
        });
      } else if (level === 'high') {
        // Two-tone warning
        [660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.value = 0.05;
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.12);
        });
      } else {
        // Subtle ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        osc.type = 'sine';
        gain.gain.value = 0.03;
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {}
  }
})();
