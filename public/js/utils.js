// Shared utilities

function formatTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  });
}

function timeAgo(isoString) {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// Update theater clocks
function startClock() {
  const zones = [
    { id: 'tc-utc', tz: 'UTC', showSec: true },
    { id: 'tc-dc', tz: 'America/New_York', showSec: false },
    { id: 'tc-tlv', tz: 'Asia/Jerusalem', showSec: false },
    { id: 'tc-thr', tz: 'Asia/Tehran', showSec: false },
  ];

  function update() {
    const now = new Date();
    zones.forEach(z => {
      const el = document.getElementById(z.id);
      if (!el) return;
      const opts = { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: z.tz };
      if (z.showSec) opts.second = '2-digit';
      el.textContent = now.toLocaleTimeString('en-US', opts);
    });
  }
  update();
  setInterval(update, 1000);
}
