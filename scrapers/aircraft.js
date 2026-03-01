const fetch = require('node-fetch');

// Bounding box: Iran + Persian Gulf + Israel + surrounding area
const BOUNDS = {
  lamin: 24,
  lamax: 40,
  lomin: 33,
  lomax: 64
};

module.exports = async function scrapeAircraft() {
  const url = `https://opensky-network.org/api/states/all?lamin=${BOUNDS.lamin}&lomin=${BOUNDS.lomin}&lamax=${BOUNDS.lamax}&lomax=${BOUNDS.lomax}`;

  const response = await fetch(url, { timeout: 10000 });
  if (!response.ok) {
    throw new Error(`OpenSky returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.states || data.states.length === 0) return [];

  return data.states.map(s => ({
    icao24: s[0],
    callsign: (s[1] || '').trim(),
    country: s[2],
    lat: s[6],
    lng: s[5],
    altitude: s[7] || s[13], // baro or geo altitude
    velocity: s[9],
    heading: s[10],
    verticalRate: s[11],
    onGround: s[8],
    lastUpdate: s[4]
  })).filter(a => a.lat && a.lng);
};
