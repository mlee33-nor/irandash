const fetch = require('node-fetch');

module.exports = async function scrapeShips() {
  // Digitraffic AIS - real vessel data only
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
            type: 'Unknown',
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
    console.log(`[ships] Digitraffic returned no data`);
  } catch (e) {
    console.error('[ships] Digitraffic error:', e.message);
  }

  // No real data - return empty
  return [];
};

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

function getArea(lat, lng) {
  if (!lat || !lng) return 'Unknown';
  if (lat > 26 && lat < 27 && lng > 55.5 && lng < 57) return 'Strait of Hormuz';
  if (lat > 24 && lat < 26.5 && lng > 56 && lng < 60) return 'Gulf of Oman';
  if (lat > 26 && lat < 30 && lng > 48 && lng < 56) return 'Persian Gulf';
  if (lat > 28 && lat < 31 && lng > 47 && lng < 50) return 'Northern Gulf';
  if (lat > 12 && lat < 20 && lng > 38 && lng < 50) return 'Red Sea / Gulf of Aden';
  return 'Regional Waters';
}
