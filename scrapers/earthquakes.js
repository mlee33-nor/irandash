// USGS Earthquake scraper - Middle East region
const https = require('https');

// Middle East bounding box
const MIN_LAT = 24, MAX_LAT = 40, MIN_LNG = 33, MAX_LNG = 64;

// Nuclear sites for proximity alerts
const NUCLEAR_SITES = [
  { name: 'NATANZ', lat: 33.51, lng: 51.73 },
  { name: 'FORDOW', lat: 34.88, lng: 51.59 },
  { name: 'BUSHEHR', lat: 28.83, lng: 50.89 },
  { name: 'ARAK', lat: 34.05, lng: 49.25 },
  { name: 'ISFAHAN UCF', lat: 32.60, lng: 51.72 },
  { name: 'PARCHIN', lat: 35.52, lng: 51.77 },
  { name: 'DIMONA', lat: 31.00, lng: 35.14 },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function scrapeEarthquakes() {
  // Past 24 hours, magnitude 2.5+
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=2.5&minlatitude=${MIN_LAT}&maxlatitude=${MAX_LAT}&minlongitude=${MIN_LNG}&maxlongitude=${MAX_LNG}&orderby=time&limit=50`;

  const json = await fetchJSON(url);
  if (!json.features) return [];

  return json.features.map(f => {
    const [lng, lat, depth] = f.geometry.coordinates;
    const mag = f.properties.mag;
    const place = f.properties.place || 'Unknown';
    const time = new Date(f.properties.time).toISOString();

    // Check proximity to nuclear sites
    let nearestSite = null;
    let nearestDist = Infinity;
    for (const site of NUCLEAR_SITES) {
      const dist = haversineKm(lat, lng, site.lat, site.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestSite = site;
      }
    }

    return {
      id: f.id,
      lat,
      lng,
      magnitude: mag,
      depth: depth,
      place,
      time,
      url: f.properties.url,
      nearNuclear: nearestDist <= 100 ? { site: nearestSite.name, distKm: Math.round(nearestDist) } : null
    };
  });
}

module.exports = scrapeEarthquakes;
