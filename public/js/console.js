// Command Console module - press backtick to open
const ConsoleModule = (function () {
  let overlay = null;
  let input = null;
  let output = null;
  let isOpen = false;
  let history = [];
  let historyIndex = -1;

  const KNOWN_LOCATIONS = {
    'tehran': [35.69, 51.39],
    'isfahan': [32.65, 51.67],
    'natanz': [33.51, 51.73],
    'fordow': [34.88, 51.59],
    'bushehr': [28.97, 50.84],
    'shiraz': [29.59, 52.58],
    'tabriz': [38.08, 46.29],
    'bandar abbas': [27.19, 56.28],
    'tehran': [35.69, 51.39],
    'baghdad': [33.31, 44.37],
    'tel aviv': [32.09, 34.78],
    'jerusalem': [31.77, 35.21],
    'dimona': [31.00, 35.14],
    'haifa': [32.79, 34.99],
    'arak': [34.05, 49.25],
    'parchin': [35.52, 51.77],
    'shahroud': [36.42, 55.02],
    'hormuz': [26.4, 56.4],
    'bahrain': [26.24, 50.55],
    'doha': [25.12, 51.32],
    'riyadh': [24.71, 46.67],
    'damascus': [33.51, 36.29],
    'beirut': [33.89, 35.50],
    'gaza': [31.52, 34.44],
    'erbil': [36.19, 44.01],
    'mashhad': [36.30, 59.60],
    'ahvaz': [31.32, 48.67],
    'kermanshah': [34.31, 47.06],
    'incirlik': [37.00, 35.43],
  };

  const COMMANDS = ['goto', 'zoom', 'search', 'status', 'threats', 'distance', 'layers', 'help', 'clear'];

  function init() {
    overlay = document.getElementById('console-overlay');
    input = document.getElementById('console-input');
    output = document.getElementById('console-output');
    if (!overlay || !input) return;

    input.addEventListener('keydown', handleKey);
  }

  function toggle() {
    if (!overlay) return;
    isOpen = !isOpen;
    overlay.classList.toggle('visible', isOpen);
    if (isOpen) {
      input.focus();
      if (output.children.length === 0) {
        writeLine('WARROOM COMMAND CONSOLE v1.0', 'console-system');
        writeLine('Type "help" for available commands.', 'console-dim');
        writeLine('', '');
      }
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (cmd) {
        history.push(cmd);
        historyIndex = history.length;
        writeLine('> ' + cmd, 'console-input-echo');
        processCommand(cmd);
      }
      input.value = '';
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();
    } else if (e.key === 'Escape') {
      toggle();
    }
  }

  function tabComplete() {
    const val = input.value.toLowerCase();
    if (!val) return;

    // Try command completion
    const parts = val.split(/\s+/);
    if (parts.length === 1) {
      const matches = COMMANDS.filter(c => c.startsWith(parts[0]));
      if (matches.length === 1) input.value = matches[0] + ' ';
      else if (matches.length > 1) writeLine(matches.join('  '), 'console-dim');
    } else if (parts[0] === 'goto' || parts[0] === 'distance') {
      const loc = parts.slice(1).join(' ');
      const matches = Object.keys(KNOWN_LOCATIONS).filter(k => k.startsWith(loc));
      if (matches.length === 1) input.value = parts[0] + ' ' + matches[0];
      else if (matches.length > 1) writeLine(matches.join('  '), 'console-dim');
    }
  }

  function writeLine(text, cls) {
    const div = document.createElement('div');
    div.textContent = text;
    if (cls) div.className = cls;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function processCommand(raw) {
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        writeLine('AVAILABLE COMMANDS:', 'console-system');
        writeLine('  goto [place]       - Pan map to location', '');
        writeLine('  zoom [n]           - Set zoom level (1-18)', '');
        writeLine('  search [keyword]   - Search news feed', '');
        writeLine('  status             - System status overview', '');
        writeLine('  threats            - Current threat assessment', '');
        writeLine('  distance [a] [b]   - Distance between two places', '');
        writeLine('  layers on/off [n]  - Toggle map layer', '');
        writeLine('  clear              - Clear console', '');
        writeLine('  help               - Show this help', '');
        break;

      case 'goto': {
        const place = args.join(' ').toLowerCase();
        const coords = KNOWN_LOCATIONS[place];
        if (coords) {
          MapModule.panTo(coords[0], coords[1], 8);
          writeLine(`Panning to ${place.toUpperCase()} [${coords[0]}, ${coords[1]}]`, 'console-success');
        } else {
          writeLine(`Unknown location: "${place}". Known: ${Object.keys(KNOWN_LOCATIONS).join(', ')}`, 'console-error');
        }
        break;
      }

      case 'zoom': {
        const z = parseInt(args[0]);
        if (z >= 1 && z <= 18) {
          MapModule.setZoom(z);
          writeLine(`Zoom set to ${z}`, 'console-success');
        } else {
          writeLine('Usage: zoom [1-18]', 'console-error');
        }
        break;
      }

      case 'search': {
        const keyword = args.join(' ').toLowerCase();
        if (!keyword) { writeLine('Usage: search [keyword]', 'console-error'); break; }
        const items = document.querySelectorAll('.news-item');
        let found = 0;
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          if (text.includes(keyword)) {
            found++;
            if (found <= 5) writeLine('  ' + item.querySelector('.news-title')?.textContent?.slice(0, 100), '');
          }
        });
        writeLine(`Found ${found} results for "${keyword}"`, found > 0 ? 'console-success' : 'console-dim');
        break;
      }

      case 'status': {
        const wsEl = document.getElementById('ws-status');
        const wsState = wsEl ? wsEl.textContent.trim() : 'UNKNOWN';
        const strikeEl = document.getElementById('strike-count');
        const strikes = strikeEl ? strikeEl.textContent : '0';
        const threatEl = document.getElementById('threat-level');
        const threat = threatEl ? threatEl.textContent : 'UNKNOWN';
        writeLine('=== SYSTEM STATUS ===', 'console-system');
        writeLine(`  WebSocket: ${wsState}`, '');
        writeLine(`  Threat Level: ${threat}`, '');
        writeLine(`  Strikes Detected: ${strikes}`, '');
        writeLine(`  Active Layers: ${getActiveLayers().join(', ')}`, '');
        writeLine(`  Time: ${new Date().toUTCString()}`, '');
        break;
      }

      case 'threats': {
        const threatEl = document.getElementById('threat-level');
        const threat = threatEl ? threatEl.textContent : 'UNKNOWN';
        const strikeEl = document.getElementById('strike-count');
        const evEl = document.getElementById('events-count');
        const confEl = document.getElementById('conflicts-count');
        writeLine('=== THREAT ASSESSMENT ===', 'console-system');
        writeLine(`  Overall: ${threat}`, threat === 'CRITICAL' ? 'console-error' : '');
        writeLine(`  Active Strikes: ${strikeEl?.textContent || '0'}`, '');
        writeLine(`  Events Tracked: ${evEl?.textContent || '--'}`, '');
        writeLine(`  Active Conflicts: ${confEl?.textContent || '--'}`, '');
        break;
      }

      case 'distance': {
        const input = args.join(' ').toLowerCase();
        // Try to split on common separators
        let placeA, placeB;
        for (const sep of [' to ', ' - ', ', ']) {
          if (input.includes(sep)) {
            [placeA, placeB] = input.split(sep).map(s => s.trim());
            break;
          }
        }
        if (!placeA || !placeB) {
          writeLine('Usage: distance [place A] to [place B]', 'console-error');
          break;
        }
        const cA = KNOWN_LOCATIONS[placeA], cB = KNOWN_LOCATIONS[placeB];
        if (!cA) { writeLine(`Unknown: ${placeA}`, 'console-error'); break; }
        if (!cB) { writeLine(`Unknown: ${placeB}`, 'console-error'); break; }
        const R = 6371;
        const dLat = (cB[0] - cA[0]) * Math.PI / 180;
        const dLng = (cB[1] - cA[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(cA[0] * Math.PI / 180) * Math.cos(cB[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const nm = km * 0.539957;
        writeLine(`${placeA.toUpperCase()} → ${placeB.toUpperCase()}`, 'console-system');
        writeLine(`  Distance: ${Math.round(km)} km / ${Math.round(nm)} nm`, '');
        writeLine(`  Flight time @ Mach 0.85: ${(km / 1050).toFixed(1)}h`, '');
        writeLine(`  Flight time @ 900 km/h: ${(km / 900).toFixed(1)}h`, '');
        break;
      }

      case 'layers': {
        const action = args[0]?.toLowerCase();
        const layerName = args.slice(1).join(' ').toLowerCase();
        if (action === 'on' || action === 'off') {
          const btn = document.querySelector(`.ctrl-btn[data-layer="${layerName}"]`);
          if (btn) {
            const isActive = btn.classList.contains('active');
            if ((action === 'on' && !isActive) || (action === 'off' && isActive)) {
              btn.click();
            }
            writeLine(`Layer "${layerName}" ${action.toUpperCase()}`, 'console-success');
          } else {
            writeLine(`Unknown layer: ${layerName}. Available: ${getActiveLayers(true).join(', ')}`, 'console-error');
          }
        } else {
          writeLine('Usage: layers on/off [name]', 'console-error');
          writeLine('Available: ' + getActiveLayers(true).join(', '), 'console-dim');
        }
        break;
      }

      case 'clear':
        output.innerHTML = '';
        break;

      default:
        writeLine(`Unknown command: "${cmd}". Type "help" for available commands.`, 'console-error');
    }
  }

  function getActiveLayers(all) {
    const btns = document.querySelectorAll('.ctrl-btn[data-layer]');
    const result = [];
    btns.forEach(btn => {
      if (all || btn.classList.contains('active')) {
        result.push(btn.dataset.layer);
      }
    });
    return result;
  }

  return { init, toggle };
})();
