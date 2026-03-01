// Sidebar stats and timeline module

const SidebarModule = (function () {

  function updateAircraftStats(data) {
    document.getElementById('aircraft-count').textContent = data.length;

    // Count aircraft flagged as military by callsign detection
    const military = data.filter(a => a.military);
    document.getElementById('aircraft-military').textContent = military.length;

    document.getElementById('aircraft-time').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Update aircraft list
    const listEl = document.getElementById('aircraft-list');
    listEl.innerHTML = '';
    data.slice(0, 12).forEach(a => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const milTag = a.military ? ' [MIL]' : '';
      div.innerHTML = `
        <span class="callsign">${escapeHtml(a.callsign) || a.icao24}${milTag}</span>
        <span class="detail">${escapeHtml(a.country)} | ${a.altitude ? Math.round(a.altitude / 100) + '00ft' : 'GND'}${a.role ? ' | ' + escapeHtml(a.role) : ''}</span>
      `;
      listEl.appendChild(div);
    });
  }

  function updateShipStats(data) {
    document.getElementById('ship-count').textContent = data.length;

    const tankers = data.filter(s => s.type === 'Tanker');
    document.getElementById('ship-tankers').textContent = tankers.length;

    document.getElementById('ship-time').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Update ship list
    const listEl = document.getElementById('ship-list');
    listEl.innerHTML = '';
    data.slice(0, 10).forEach(s => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <span class="callsign">${escapeHtml(s.name)}${s.flag ? ' [' + escapeHtml(s.flag) + ']' : ''}</span>
        <span class="detail">${escapeHtml(s.type)} | ${s.speed}kts${s.role ? ' | ' + escapeHtml(s.role) : ''}</span>
      `;
      listEl.appendChild(div);
    });
  }

  function updateEventStats(eventsData, conflictsData) {
    document.getElementById('events-count').textContent = eventsData ? eventsData.length : '--';
    document.getElementById('conflicts-count').textContent = conflictsData ? conflictsData.length : '--';
  }

  function updateTimeline(events, conflicts) {
    const timelineEl = document.getElementById('event-timeline');
    const items = [];

    // Add GDELT events
    if (events) {
      events.slice(0, 10).forEach(e => {
        items.push({
          type: e.type || 'general',
          text: truncate(e.name, 50),
          time: e.timestamp,
          sortTime: new Date(e.timestamp).getTime() || 0
        });
      });
    }

    // Add conflicts
    if (conflicts) {
      conflicts.slice(0, 10).forEach(c => {
        items.push({
          type: 'conflict',
          text: `${c.type}: ${c.location}, ${c.country}${c.fatalities > 0 ? ` (${c.fatalities} killed)` : ''}`,
          time: c.date,
          sortTime: new Date(c.date).getTime() || 0
        });
      });
    }

    // Sort by time descending
    items.sort((a, b) => b.sortTime - a.sortTime);

    timelineEl.innerHTML = '';
    items.slice(0, 15).forEach(item => {
      const div = document.createElement('div');
      div.className = 'timeline-item';
      div.innerHTML = `
        <div class="timeline-dot ${item.type}"></div>
        <div class="timeline-text">${escapeHtml(item.text)}</div>
        <div class="timeline-time">${timeAgo(item.time)}</div>
      `;
      timelineEl.appendChild(div);
    });
  }

  return { updateAircraftStats, updateShipStats, updateEventStats, updateTimeline };
})();
