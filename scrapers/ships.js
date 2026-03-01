const fetch = require('node-fetch');

module.exports = async function scrapeShips(conflicts, news) {
  // Try real AIS data first
  try {
    const url = 'https://meri.digitraffic.fi/api/ais/v1/locations?latitude=26.5&longitude=56.0&radius=500&from=0';
    const response = await fetch(url, { timeout: 10000 });
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const ships = data.features.slice(0, 50).map(f => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const mmsi = String(props.mmsi || f.mmsi || '');
          return {
            mmsi,
            name: props.name || `VESSEL-${mmsi}`,
            type: classifyByMMSI(mmsi),
            flag: getFlagFromMMSI(mmsi),
            lat: coords[1] || 0,
            lng: coords[0] || 0,
            heading: props.heading || props.cog || 0,
            speed: (props.sog || props.speed || 0) / 10,
            area: getArea(coords[1], coords[0]),
            lastUpdate: new Date(props.timestampExternal || Date.now()).toISOString()
          };
        }).filter(s => s.lat !== 0 && s.lng !== 0);

        if (ships.length > 0) {
          console.log(`[ships] Digitraffic: ${ships.length} real vessels`);
          return ships;
        }
      }
    }
  } catch (e) {
    console.error('[ships] Digitraffic error:', e.message);
  }

  // Project naval positions based on real conflict data
  return projectNavalFromConflicts(conflicts, news);
};

// Based on where bombs are falling, project where naval assets likely are
// Carrier strike groups, destroyers launching Tomahawks, coastal patrol, etc
function projectNavalFromConflicts(conflicts, news) {
  const ships = [];
  let idx = 0;

  // Standing naval deployments that are always there regardless of conflict
  const standingDeployments = [
    // US 5th Fleet - always in Bahrain/Gulf
    { name: 'USS CARRIER', type: 'Naval', flag: 'US', lat: 26.2, lng: 50.6, speed: 5, area: 'NSA Bahrain', role: 'CVN' },
    { name: 'USS ESCORT-1', type: 'Naval', flag: 'US', lat: 26.3, lng: 50.5, speed: 12, area: 'Persian Gulf', role: 'DDG' },
    { name: 'USS ESCORT-2', type: 'Naval', flag: 'US', lat: 25.8, lng: 56.5, speed: 15, area: 'Gulf of Oman', role: 'CG' },
    // Strait of Hormuz patrol
    { name: 'USS PATROL', type: 'Naval', flag: 'US', lat: 26.5, lng: 56.2, speed: 10, area: 'Strait of Hormuz', role: 'PC' },
    // Iranian Navy
    { name: 'IRIN FRIGATE', type: 'Naval', flag: 'IR', lat: 27.2, lng: 56.3, speed: 8, area: 'Bandar Abbas', role: 'FFG' },
    { name: 'IRGCN FAC', type: 'Naval', flag: 'IR', lat: 26.6, lng: 55.8, speed: 25, area: 'Strait of Hormuz', role: 'Fast Attack' },
    { name: 'IRGCN FAC-2', type: 'Naval', flag: 'IR', lat: 25.9, lng: 55.0, speed: 22, area: 'Abu Musa', role: 'Fast Attack' },
    { name: 'IRIN SUB', type: 'Naval', flag: 'IR', lat: 25.4, lng: 57.5, speed: 6, area: 'Gulf of Oman', role: 'SSK' },
    // Israeli Navy
    { name: 'INS CORVETTE', type: 'Naval', flag: 'IL', lat: 32.8, lng: 34.9, speed: 12, area: 'Haifa', role: 'Sa\'ar 6' },
    { name: 'INS PATROL', type: 'Naval', flag: 'IL', lat: 29.6, lng: 34.9, speed: 14, area: 'Eilat', role: 'Sa\'ar 4.5' },
    // French/UK
    { name: 'FS FRIGATE', type: 'Naval', flag: 'FR', lat: 25.0, lng: 57.0, speed: 14, area: 'Gulf of Oman', role: 'FREMM' },
  ];

  for (const d of standingDeployments) {
    ships.push({
      mmsi: `NAV${String(idx).padStart(5, '0')}`,
      name: d.name,
      type: d.type,
      flag: d.flag,
      lat: d.lat + (Math.random() - 0.5) * 0.3,
      lng: d.lng + (Math.random() - 0.5) * 0.3,
      heading: Math.floor(Math.random() * 360),
      speed: d.speed + (Math.random() - 0.5) * 4,
      area: d.area,
      role: d.role,
      lastUpdate: new Date().toISOString(),
      projected: true
    });
    idx++;
  }

  // Add ships based on active conflicts
  if (conflicts && conflicts.length > 0) {
    const coastalZones = new Set();

    for (const c of conflicts) {
      // If strikes near coast, there are likely ships offshore launching
      const text = ((c.notes || '') + ' ' + (c.type || '')).toLowerCase();
      const isNavalRelevant = /missile|naval|ship|coast|sea|port|houthi|hormuz|maritime/.test(text);

      // Yemen/Houthi = Red Sea naval ops
      if (c.country === 'Yemen') {
        const key = 'red-sea';
        if (!coastalZones.has(key)) {
          coastalZones.add(key);
          // US/coalition ships in Red Sea responding to Houthis
          ships.push(makeShip(idx++, 'USS DESTROYER', 'Naval', 'US', 14.5 + Math.random() * 2, 42.0 + Math.random(), 18, 'Red Sea', 'DDG'));
          ships.push(makeShip(idx++, 'USS CRUISER', 'Naval', 'US', 13.5 + Math.random(), 43.0 + Math.random(), 15, 'Bab el-Mandeb', 'CG'));
        }
      }

      // Gaza/Palestine = Israeli navy + US carrier group in E. Med
      if (c.country === 'Palestine' || c.country === 'Israel') {
        const key = 'e-med';
        if (!coastalZones.has(key)) {
          coastalZones.add(key);
          ships.push(makeShip(idx++, 'USS CVN GROUP', 'Naval', 'US', 33.5 + Math.random(), 33.0 + Math.random(), 8, 'E. Mediterranean', 'CVN'));
          ships.push(makeShip(idx++, 'USS AEGIS', 'Naval', 'US', 33.0 + Math.random() * 0.5, 33.5 + Math.random(), 12, 'E. Mediterranean', 'DDG'));
          ships.push(makeShip(idx++, 'INS OFFSHORE', 'Naval', 'IL', 31.8 + Math.random() * 0.3, 34.0 + Math.random() * 0.3, 10, 'Gaza Coast', 'OPV'));
        }
      }

      // Lebanon = Israeli naval blockade
      if (c.country === 'Lebanon') {
        const key = 'lebanon-coast';
        if (!coastalZones.has(key)) {
          coastalZones.add(key);
          ships.push(makeShip(idx++, 'INS SA\'AR', 'Naval', 'IL', 33.5 + Math.random() * 0.5, 34.5 + Math.random() * 0.3, 14, 'Lebanon Coast', 'Sa\'ar 5'));
        }
      }

      // Iran = submarine patrols intensify
      if (c.country === 'Iran' && !coastalZones.has('iran-sub')) {
        coastalZones.add('iran-sub');
        ships.push(makeShip(idx++, 'USS SSN', 'Naval', 'US', 25.0 + Math.random(), 58.0 + Math.random() * 2, 8, 'Arabian Sea', 'SSN'));
      }
    }
  }

  // Hormuz is CLOSED - tankers stuck/rerouted, not transiting
  // Tankers backed up outside the strait or anchored
  const stuckTankers = [
    { lat: 25.0, lng: 57.5, area: 'Gulf of Oman (Waiting)', speed: 0 },
    { lat: 24.8, lng: 58.0, area: 'Gulf of Oman (Anchored)', speed: 0 },
    { lat: 25.2, lng: 57.8, area: 'Gulf of Oman (Holding)', speed: 0 },
    { lat: 28.5, lng: 50.5, area: 'Persian Gulf (Trapped)', speed: 0 },
    { lat: 29.0, lng: 49.7, area: 'Kharg Island (Loading Halted)', speed: 0 },
    { lat: 27.0, lng: 52.0, area: 'Central Gulf (Anchored)', speed: 0 },
  ];

  for (const t of stuckTankers) {
    const flags = ['PA', 'LR', 'MH', 'SA', 'AE', 'IN', 'CN', 'GR'];
    ships.push(makeShip(
      idx++,
      `TANKER-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      'Tanker',
      flags[Math.floor(Math.random() * flags.length)],
      t.lat + (Math.random() - 0.5) * 0.3,
      t.lng + (Math.random() - 0.5) * 0.3,
      t.speed,
      t.area,
      'VLCC'
    ));
  }

  console.log(`[ships] Projected ${ships.length} vessels from conflict data`);
  return ships;
}

function makeShip(idx, name, type, flag, lat, lng, speed, area, role) {
  return {
    mmsi: `PRJ${String(idx).padStart(6, '0')}`,
    name,
    type,
    flag,
    lat,
    lng,
    heading: Math.floor(Math.random() * 360),
    speed: parseFloat(speed.toFixed(1)),
    area,
    role,
    lastUpdate: new Date().toISOString(),
    projected: true
  };
}

function getFlagFromMMSI(mmsi) {
  if (!mmsi || mmsi.length < 3) return '';
  const mid = mmsi.slice(0, 3);
  const flags = {
    '422': 'IR', '403': 'SA', '470': 'AE', '461': 'OM', '466': 'QA',
    '447': 'KW', '408': 'BH', '419': 'IN', '412': 'CN', '351': 'PA',
    '636': 'LR', '538': 'MH', '303': 'US', '226': 'FR', '232': 'GB',
    '273': 'RU', '241': 'GR', '249': 'MT', '244': 'NL',
  };
  return flags[mid] || '';
}

function classifyByMMSI(mmsi) {
  return 'Unknown';
}

function getArea(lat, lng) {
  if (!lat || !lng) return 'Unknown';
  if (lat > 26 && lat < 27 && lng > 55.5 && lng < 57) return 'Strait of Hormuz';
  if (lat > 24 && lat < 26.5 && lng > 56 && lng < 60) return 'Gulf of Oman';
  if (lat > 26 && lat < 30 && lng > 48 && lng < 56) return 'Persian Gulf';
  if (lat > 28 && lat < 31 && lng > 47 && lng < 50) return 'Northern Gulf';
  if (lat > 12 && lat < 20 && lng > 38 && lng < 50) return 'Red Sea / Gulf of Aden';
  return 'Regional Waters';
}
