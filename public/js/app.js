// Main app - WebSocket connection and data routing

(function () {
  // State
  let ws = null;
  let reconnectDelay = 1000;
  let eventsData = [];
  let conflictsData = [];

  // Initialize
  startClock();
  MapModule.init();
  connectWebSocket();
  initLiveStream();

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
    if (!data || !Array.isArray(data)) return;

    switch (type) {
      case 'news':
        NewsModule.update(data);
        MapModule.updateNewsMarkers(data);
        pulseIndicator('dp-news');
        if (data.some(a => a.source && a.source.startsWith('X/'))) pulseIndicator('dp-osint');
        updateTicker(data);
        updateThreatLevel(data);
        checkBreaking(data);
        bumpActivity();
        break;

      case 'aircraft':
        MapModule.updateAircraft(data);
        SidebarModule.updateAircraftStats(data);
        pulseIndicator('dp-air');
        bumpActivity();
        break;

      case 'ships':
        MapModule.updateShips(data);
        SidebarModule.updateShipStats(data);
        pulseIndicator('dp-sea');
        bumpActivity();
        break;

      case 'events':
        eventsData = data;
        MapModule.updateEvents(data);
        SidebarModule.updateEventStats(eventsData, conflictsData);
        SidebarModule.updateTimeline(eventsData, conflictsData);
        break;

      case 'conflicts':
        conflictsData = data;
        MapModule.updateConflicts(data);
        SidebarModule.updateEventStats(eventsData, conflictsData);
        SidebarModule.updateTimeline(eventsData, conflictsData);
        break;

      case 'strikes':
        MapModule.updateDynamicStrikes(data);
        pulseIndicator('dp-strikes');
        updateStrikeCount(data);
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

  // Live stream functionality
  function initLiveStream() {
    const streamToggle = document.getElementById('stream-toggle');
    const streamPanel = document.getElementById('stream-panel');
    const streamClose = document.getElementById('stream-close');
    const streamSelect = document.getElementById('stream-select');
    const streamFrame = document.getElementById('stream-frame');

    if (!streamToggle) return;

    const streams = {
      'aljazeera': 'https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1',
      'france24': 'https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1',
      'dw': 'https://www.youtube.com/embed/LuKwFajn37U?autoplay=1&mute=1',
      'sky': 'https://www.youtube.com/embed/YDvsBbKfLPA?autoplay=1&mute=1',
    };

    streamToggle.addEventListener('click', () => {
      streamPanel.classList.toggle('visible');
      if (streamPanel.classList.contains('visible') && !streamFrame.src) {
        streamFrame.src = streams[streamSelect.value] || streams['aljazeera'];
      }
    });

    streamClose.addEventListener('click', () => {
      streamPanel.classList.remove('visible');
      streamFrame.src = '';
    });

    streamSelect.addEventListener('change', () => {
      streamFrame.src = streams[streamSelect.value] || streams['aljazeera'];
    });

    // Make stream panel draggable
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    const streamHeader = document.getElementById('stream-header');

    streamHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - streamPanel.offsetLeft;
      dragOffsetY = e.clientY - streamPanel.offsetTop;
      streamPanel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      streamPanel.style.left = (e.clientX - dragOffsetX) + 'px';
      streamPanel.style.top = (e.clientY - dragOffsetY) + 'px';
      streamPanel.style.right = 'auto';
      streamPanel.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobile
    streamHeader.addEventListener('touchstart', (e) => {
      isDragging = true;
      const touch = e.touches[0];
      dragOffsetX = touch.clientX - streamPanel.offsetLeft;
      dragOffsetY = touch.clientY - streamPanel.offsetTop;
      streamPanel.style.transition = 'none';
    });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      streamPanel.style.left = (touch.clientX - dragOffsetX) + 'px';
      streamPanel.style.top = (touch.clientY - dragOffsetY) + 'px';
      streamPanel.style.right = 'auto';
      streamPanel.style.bottom = 'auto';
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
  }
})();
