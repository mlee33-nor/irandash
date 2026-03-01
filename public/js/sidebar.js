// Sidebar stats and timeline module

const SidebarModule = (function () {

  function updateAircraftStats(data) {
    // Aircraft panel removed - no-op
  }

  function updateShipStats(data) {
    // Ship panel removed - no-op
  }

  function updateEventStats(eventsData, conflictsData) {
    const ec = document.getElementById('events-count');
    const cc = document.getElementById('conflicts-count');
    if (ec) ec.textContent = eventsData ? eventsData.length : '--';
    if (cc) cc.textContent = conflictsData ? conflictsData.length : '--';
  }

  function updateTimeline(events, conflicts) {
    const timelineEl = document.getElementById('event-timeline');
    if (!timelineEl) return;
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
