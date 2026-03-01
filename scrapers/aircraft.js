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

module.exports = async function scrapeAircraft() {
  // OpenSky API - real ADS-B data only
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
    console.log(`[aircraft] OpenSky returned ${response.status}`);
  } catch (e) {
    console.error('[aircraft] OpenSky error:', e.message);
  }

  // No real data available - return empty
  return [];
};
