// Open-Meteo weather scraper for key Middle East locations
const https = require('https');

const KEY_LOCATIONS = [
  { name: 'Tehran', lat: 35.69, lng: 51.39 },
  { name: 'Isfahan', lat: 32.65, lng: 51.67 },
  { name: 'Natanz', lat: 33.51, lng: 51.73 },
  { name: 'Bandar Abbas', lat: 27.19, lng: 56.28 },
  { name: 'Bushehr', lat: 28.97, lng: 50.84 },
  { name: 'Shiraz', lat: 29.59, lng: 52.58 },
  { name: 'Tabriz', lat: 38.08, lng: 46.29 },
  { name: 'Fordow', lat: 34.88, lng: 51.59 },
  { name: 'Tel Aviv', lat: 32.09, lng: 34.78 },
  { name: 'Baghdad', lat: 33.31, lng: 44.37 },
];

// Nuclear sites for downwind fallout vectors
const NUCLEAR_SITES = [
  { name: 'Natanz', lat: 33.51, lng: 51.73 },
  { name: 'Fordow', lat: 34.88, lng: 51.59 },
  { name: 'Bushehr', lat: 28.83, lng: 50.89 },
  { name: 'Arak', lat: 34.05, lng: 49.25 },
  { name: 'Isfahan UCF', lat: 32.60, lng: 51.72 },
  { name: 'Dimona', lat: 31.00, lng: 35.14 },
];

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

async function scrapeWeather() {
  const results = [];

  // Batch all locations in parallel
  const promises = KEY_LOCATIONS.map(async (loc) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code&timezone=auto`;
      const json = await fetchJSON(url);
      if (!json.current) return null;
      const c = json.current;
      return {
        id: `wx-${loc.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        windSpeed: c.wind_speed_10m,
        windDirection: c.wind_direction_10m,
        cloudCover: c.cloud_cover,
        weatherCode: c.weather_code,
        satObscured: c.cloud_cover > 80,
      };
    } catch (e) {
      return null;
    }
  });

  const fetched = await Promise.all(promises);
  for (const r of fetched) {
    if (r) results.push(r);
  }

  // Compute downwind vectors for nuclear sites using nearest weather station
  const downwindVectors = [];
  for (const site of NUCLEAR_SITES) {
    // Find nearest weather station
    let nearest = null;
    let minDist = Infinity;
    for (const wx of results) {
      const dist = Math.sqrt((wx.lat - site.lat) ** 2 + (wx.lng - site.lng) ** 2);
      if (dist < minDist) { minDist = dist; nearest = wx; }
    }
    if (nearest && nearest.windSpeed > 0) {
      // Wind direction is where wind comes FROM, downwind is opposite + 180
      const downwindDeg = (nearest.windDirection + 180) % 360;
      const downwindRad = downwindDeg * Math.PI / 180;
      // 200km endpoint
      const dLat = (200 / 111.32) * Math.cos(downwindRad);
      const dLng = (200 / (111.32 * Math.cos(site.lat * Math.PI / 180))) * Math.sin(downwindRad);
      downwindVectors.push({
        id: `dw-${site.name.toLowerCase().replace(/\s+/g, '-')}`,
        siteName: site.name,
        startLat: site.lat,
        startLng: site.lng,
        endLat: site.lat + dLat,
        endLng: site.lng + dLng,
        windSpeed: nearest.windSpeed,
        windDirection: nearest.windDirection,
      });
    }
  }

  return { stations: results, downwindVectors };
}

module.exports = scrapeWeather;
