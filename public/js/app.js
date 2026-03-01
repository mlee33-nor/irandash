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
        break;

      case 'aircraft':
        MapModule.updateAircraft(data);
        SidebarModule.updateAircraftStats(data);
        break;

      case 'ships':
        MapModule.updateShips(data);
        SidebarModule.updateShipStats(data);
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
        break;
    }
  }

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
      'france24': 'https://www.youtube.com/embed/Ap-UM1O9RBk?autoplay=1&mute=1',
      'dw': 'https://www.youtube.com/embed/V5N1IVlnIpE?autoplay=1&mute=1',
      'sky': 'https://www.youtube.com/embed/9Auq9mYxFEE?autoplay=1&mute=1',
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
