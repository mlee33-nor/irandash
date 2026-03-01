const fetch = require('node-fetch');

module.exports = async function scrapeShips() {
  // Try free AIS endpoint (Finnish transport agency - global coverage)
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
            speed: (props.sog || props.speed || 0) / 10, // digitraffic reports in 1/10 knot
            area: getArea(coords[1], coords[0]),
            lastUpdate: new Date(props.timestampExternal || Date.now()).toISOString()
          };
        }).filter(s => s.lat !== 0 && s.lng !== 0);

        console.log(`[ships] Digitraffic: ${ships.length} real vessels`);
        return ships;
      }
    }
    console.log(`[ships] Digitraffic returned ${response.status}`);
  } catch (e) {
    console.error('[ships] Digitraffic error:', e.message);
  }

  // Try OpenSky AIS (experimental)
  try {
    const url = 'https://opensky-network.org/api/states/all?lamin=23&lomin=48&lamax=30&lomax=60';
    // This only returns aircraft not ships, but worth trying
  } catch (e) {}

  // No fake data - return empty if no real data
  console.log('[ships] No real data available');
  return [];
};

// MMSI MID codes map to country
function getFlagFromMMSI(mmsi) {
  if (!mmsi || mmsi.length < 3) return '';
  const mid = mmsi.slice(0, 3);
  const flags = {
    '422': 'IR', // Iran
    '403': 'SA', // Saudi Arabia
    '470': 'AE', // UAE
    '461': 'OM', // Oman
    '466': 'QA', // Qatar
    '447': 'KW', // Kuwait
    '408': 'BH', // Bahrain
    '419': 'IN', // India
    '412': 'CN', // China
    '351': 'PA', // Panama
    '636': 'LR', // Liberia
    '538': 'MH', // Marshall Islands
    '303': 'US', // USA
    '226': 'FR', // France
    '232': 'GB', // UK
    '273': 'RU', // Russia
    '241': 'GR', // Greece
    '240': 'GR',
    '249': 'MT', // Malta
    '256': 'MT',
    '209': 'BE', // Belgium
    '244': 'NL', // Netherlands
    '305': 'AG', // Antigua
    '319': 'KY', // Cayman
    '371': 'PA',
    '372': 'PA',
    '373': 'PA',
  };
  return flags[mid] || '';
}

// Rough vessel type classification from MMSI
function classifyByMMSI(mmsi) {
  if (!mmsi) return 'Unknown';
  // Naval vessels often have specific MMSI patterns
  // Military ships: some countries use 1-prefix MIDs
  const mid = mmsi.slice(0, 3);
  // Can't reliably determine type from MMSI alone
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
