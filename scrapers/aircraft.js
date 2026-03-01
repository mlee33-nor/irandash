const fetch = require('node-fetch');

// Bounding box: Iran + Persian Gulf + Israel + surrounding area
const BOUNDS = {
  lamin: 24,
  lamax: 40,
  lomin: 33,
  lomax: 64
};

// Known military callsign prefixes for identification
const MIL_CALLSIGNS = [
  'RCH', 'FORTE', 'DUKE', 'HOMER', 'LAGR', 'NCHO', 'VIPER',  // US
  'IAF', 'ISR',                                                  // Israel
  'TUAF', 'TRK',                                                 // Turkey
  'RFF', 'RSF', 'RF',                                            // Russia
  'IRI', 'IRIAF',                                                // Iran
  'RAF', 'RRR',                                                  // UK
  'FAF', 'CTM',                                                  // France
  'GAF',                                                          // Germany
  'QATAF',                                                        // Qatar
  'RSAF',                                                         // Saudi
];

function isMilitary(callsign, icao24) {
  if (!callsign) return false;
  const cs = callsign.toUpperCase().trim();
  return MIL_CALLSIGNS.some(prefix => cs.startsWith(prefix));
}

module.exports = async function scrapeAircraft() {
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
          military: isMilitary(s[1], s[0])
        })).filter(a => a.lat && a.lng);

        console.log(`[aircraft] OpenSky: ${aircraft.length} real aircraft, ${aircraft.filter(a => a.military).length} military`);
        return aircraft;
      }
    }
    console.log(`[aircraft] OpenSky returned ${response.status}`);
  } catch (e) {
    console.error('[aircraft] OpenSky error:', e.message);
  }

  // No fake data - return empty if API fails
  console.log('[aircraft] No real data available');
  return [];
};
