const fetch = require('node-fetch');

const BOUNDS = {
  lamin: 24, lamax: 40, lomin: 33, lomax: 64
};

// Known military callsign prefixes
const MIL_PREFIXES = [
  'RCH', 'FORTE', 'DUKE', 'HOMER', 'LAGR', 'NCHO', 'VIPER', 'REACH',
  'ETHYL', 'IRON', 'HAVOC', 'TOPCT', 'SKULL', 'DECEE', 'DARK',
  'IAF', 'ISR',
  'TUAF', 'TRK', 'TURK',
  'RFF', 'RSF', 'RF',
  'IRI', 'IRIAF',
  'RAF', 'RRR', 'ASCOT',
  'FAF', 'CTM',
  'GAF',
  'QATAF', 'RSAF',
];

function isMilitary(callsign) {
  if (!callsign) return false;
  const cs = callsign.toUpperCase().trim();
  return MIL_PREFIXES.some(p => cs.startsWith(p));
}

module.exports = async function scrapeAircraft(conflicts, news) {
  // Try OpenSky API - real ADS-B data
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${BOUNDS.lamin}&lomin=${BOUNDS.lomin}&lamax=${BOUNDS.lamax}&lomax=${BOUNDS.lomax}`;
    const response = await fetch(url, { timeout: 15000 });
    if (response.ok) {
      const data = await response.json();
      if (data.states && data.states.length > 0) {
        const aircraft = data.states.map(s => ({
          icao24: s[0],
          callsign: (s[1] || '').trim(),
          country: s[2],
          lat: s[6],
          lng: s[5],
          altitude: s[7] || s[13],
          velocity: s[9],
          heading: s[10],
          verticalRate: s[11],
          onGround: s[8],
          lastUpdate: s[4],
          military: isMilitary(s[1])
        })).filter(a => a.lat && a.lng);

        console.log(`[aircraft] OpenSky: ${aircraft.length} real, ${aircraft.filter(a => a.military).length} mil`);
        return aircraft;
      }
    }
    console.log(`[aircraft] OpenSky ${response.status}, using conflict-based projection`);
  } catch (e) {
    console.error('[aircraft] OpenSky fail, using conflict-based projection');
  }

  // Project likely aircraft positions based on real conflict/news data
  return projectFromConflicts(conflicts, news);
};

// Generate realistic aircraft positions based on where bombs are actually falling
// If there are airstrikes in Gaza, there are fighter jets, tankers, and ISR above
function projectFromConflicts(conflicts, news) {
  const aircraft = [];
  const now = Math.floor(Date.now() / 1000);
  let idx = 0;

  // Get active conflict zones from real data
  const zones = getActiveZones(conflicts, news);

  for (const zone of zones) {
    // Strike aircraft - flying above the conflict zone at medium altitude
    if (zone.type === 'airstrike' || zone.type === 'bombing') {
      const strikeAlt = 6000 + Math.random() * 4000;
      aircraft.push(makeAircraft({
        idx: idx++, now,
        callsign: zone.country === 'Israel' ? 'IAF' : zone.country === 'United States' ? 'VIPER' : 'IRIAF',
        country: zone.actor || zone.country,
        lat: zone.lat + (Math.random() - 0.5) * 0.3,
        lng: zone.lng + (Math.random() - 0.5) * 0.3,
        alt: strikeAlt,
        heading: Math.random() * 360,
        speed: 250 + Math.random() * 100,
        military: true,
        role: 'Strike'
      }));
    }

    // ISR / surveillance orbiting above every active zone
    aircraft.push(makeAircraft({
      idx: idx++, now,
      callsign: 'FORTE',
      country: 'United States',
      lat: zone.lat + (Math.random() - 0.5) * 0.5,
      lng: zone.lng + (Math.random() - 0.5) * 0.5,
      alt: 15000 + Math.random() * 3000,
      heading: Math.random() * 360,
      speed: 150 + Math.random() * 50,
      military: true,
      role: 'ISR'
    }));

    // Tanker support loitering nearby at high altitude
    if (zone.intensity > 3) {
      aircraft.push(makeAircraft({
        idx: idx++, now,
        callsign: 'HOMER',
        country: 'United States',
        lat: zone.lat + (Math.random() - 0.5) * 1.5 + 1, // offset north from combat
        lng: zone.lng + (Math.random() - 0.5) * 1.5,
        alt: 8000 + Math.random() * 3000,
        heading: Math.random() * 360,
        speed: 200 + Math.random() * 40,
        military: true,
        role: 'Tanker'
      }));
    }
  }

  // Standing patrols regardless of conflict - these always exist
  const standingPatrols = [
    // US CENTCOM ISR orbits
    { callsign: 'FORTE', country: 'United States', lat: 27.0, lng: 55.0, alt: 16000, role: 'ISR (Gulf)' },
    { callsign: 'DUKE', country: 'United States', lat: 26.5, lng: 50.5, alt: 8500, role: 'SIGINT' },
    // US tanker tracks
    { callsign: 'LAGR', country: 'United States', lat: 28.0, lng: 49.0, alt: 9000, role: 'Tanker' },
    // Israeli CAP
    { callsign: 'IAF', country: 'Israel', lat: 31.8, lng: 34.6, alt: 7000, role: 'CAP' },
    { callsign: 'IAF', country: 'Israel', lat: 33.0, lng: 35.3, alt: 6500, role: 'CAP North' },
    // Russian in Syria
    { callsign: 'RSF', country: 'Russia', lat: 35.4, lng: 36.0, alt: 8000, role: 'Patrol' },
    // Iranian patrol
    { callsign: 'IRIAF', country: 'Iran', lat: 27.3, lng: 56.3, alt: 5000, role: 'Maritime Patrol' },
    { callsign: 'IRIAF', country: 'Iran', lat: 35.6, lng: 51.4, alt: 4000, role: 'Tehran CAP' },
    // Turkish ops
    { callsign: 'TUAF', country: 'Turkey', lat: 37.0, lng: 42.0, alt: 7500, role: 'N.Iraq Patrol' },
  ];

  for (const p of standingPatrols) {
    aircraft.push(makeAircraft({
      idx: idx++, now,
      callsign: p.callsign,
      country: p.country,
      lat: p.lat + (Math.random() - 0.5) * 0.4,
      lng: p.lng + (Math.random() - 0.5) * 0.4,
      alt: p.alt + (Math.random() - 0.5) * 1000,
      heading: Math.random() * 360,
      speed: 180 + Math.random() * 80,
      military: true,
      role: p.role
    }));
  }

  // Civilian airways still operate - major carriers in the region
  const civilianRoutes = [
    { callsign: 'UAE', country: 'United Arab Emirates', lat: 25.5, lng: 55.3 },
    { callsign: 'QTR', country: 'Qatar', lat: 25.8, lng: 51.5 },
    { callsign: 'THY', country: 'Turkey', lat: 37.5, lng: 39.0 },
    { callsign: 'IRA', country: 'Iran', lat: 35.7, lng: 51.4 },
    { callsign: 'IRA', country: 'Iran', lat: 29.6, lng: 52.5 },
    { callsign: 'SVA', country: 'Saudi Arabia', lat: 24.7, lng: 46.7 },
    { callsign: 'MEA', country: 'Lebanon', lat: 33.8, lng: 35.5 },
    { callsign: 'RJA', country: 'Jordan', lat: 31.7, lng: 36.0 },
    { callsign: 'KAC', country: 'Kuwait', lat: 29.2, lng: 47.9 },
  ];

  for (const r of civilianRoutes) {
    aircraft.push(makeAircraft({
      idx: idx++, now,
      callsign: r.callsign,
      country: r.country,
      lat: r.lat + (Math.random() - 0.5) * 1.5,
      lng: r.lng + (Math.random() - 0.5) * 1.5,
      alt: 10000 + Math.random() * 3000,
      heading: Math.random() * 360,
      speed: 230 + Math.random() * 40,
      military: false,
      role: 'Civilian'
    }));
  }

  console.log(`[aircraft] Projected ${aircraft.length} from ${zones.length} conflict zones`);
  return aircraft;
}

function getActiveZones(conflicts, news) {
  const zones = [];
  const seen = new Set();

  // Extract zones from real conflict data
  if (conflicts && conflicts.length > 0) {
    for (const c of conflicts) {
      const key = `${Math.round(c.lat * 5)}:${Math.round(c.lng * 5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const text = ((c.notes || '') + ' ' + (c.type || '')).toLowerCase();
      let type = 'general';
      if (/airstrike|air strike|bomb|missile|drone|shell/.test(text)) type = 'airstrike';
      else if (/attack|battle|clash|fight/.test(text)) type = 'bombing';

      // Who is likely doing the striking
      let actor = 'Unknown';
      if (c.country === 'Palestine' || c.country === 'Lebanon') actor = 'Israel';
      else if (c.country === 'Yemen') actor = 'United States';
      else if (c.country === 'Syria' && /russia|russian/.test(text)) actor = 'Russia';
      else if (c.country === 'Syria') actor = 'United States';
      else if (c.country === 'Iraq') actor = 'United States';
      else if (c.actor1) actor = c.actor1;

      zones.push({
        lat: c.lat,
        lng: c.lng,
        country: c.country,
        type,
        actor,
        intensity: c.fatalities || 1
      });
    }
  }

  // Also extract from news if it mentions strikes
  if (news && news.length > 0) {
    for (const n of news) {
      if (!n.location) continue;
      const text = ((n.title || '') + ' ' + (n.summary || '')).toLowerCase();
      if (!/strike|bomb|attack|shell|missile|raid/.test(text)) continue;

      const key = `${Math.round(n.location.lat * 5)}:${Math.round(n.location.lng * 5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      zones.push({
        lat: n.location.lat,
        lng: n.location.lng,
        country: '',
        type: 'airstrike',
        actor: 'Unknown',
        intensity: n.severity === 'critical' ? 10 : 3
      });
    }
  }

  return zones;
}

function makeAircraft({ idx, now, callsign, country, lat, lng, alt, heading, speed, military, role }) {
  const flightNum = Math.floor(Math.random() * 900) + 100;
  return {
    icao24: `proj-${String(idx).padStart(4, '0')}`,
    callsign: `${callsign}${flightNum}`,
    country,
    lat,
    lng,
    altitude: Math.round(alt),
    velocity: Math.round(speed),
    heading: Math.round(heading) % 360,
    verticalRate: Math.floor((Math.random() - 0.5) * 5),
    onGround: false,
    lastUpdate: now - Math.floor(Math.random() * 30),
    military,
    projected: true,
    role
  };
}
