const RSSParser = require('rss-parser');
const parser = new RSSParser();

// Known Iran locations for mapping strikes
const IRAN_LOCATIONS = {
  'tehran': { lat: 35.69, lng: 51.39 },
  'isfahan': { lat: 32.65, lng: 51.68 },
  'natanz': { lat: 33.51, lng: 51.73 },
  'fordow': { lat: 34.88, lng: 51.59 },
  'bushehr': { lat: 28.97, lng: 50.84 },
  'shiraz': { lat: 29.59, lng: 52.58 },
  'tabriz': { lat: 38.08, lng: 46.29 },
  'mashhad': { lat: 36.30, lng: 59.60 },
  'parchin': { lat: 35.52, lng: 51.77 },
  'khojir': { lat: 35.58, lng: 51.66 },
  'shahroud': { lat: 36.42, lng: 55.02 },
  'bandar abbas': { lat: 27.19, lng: 56.28 },
  'chabahar': { lat: 25.30, lng: 60.63 },
  'dezful': { lat: 32.43, lng: 48.38 },
  'ahvaz': { lat: 31.32, lng: 48.67 },
  'kermanshah': { lat: 34.31, lng: 47.06 },
  'qom': { lat: 34.64, lng: 50.88 },
  'arak': { lat: 34.09, lng: 49.69 },
  'semnan': { lat: 35.57, lng: 53.40 },
  'abadan': { lat: 30.34, lng: 48.30 },
  'iran': { lat: 32.43, lng: 53.69 },
  'khorramabad': { lat: 33.49, lng: 48.35 },
  'ilam': { lat: 33.64, lng: 46.42 },
  'hamadan': { lat: 34.80, lng: 48.51 },
  'zanjan': { lat: 36.67, lng: 48.48 },
  'rasht': { lat: 37.28, lng: 49.58 },
  'kerman': { lat: 30.28, lng: 57.08 },
  'yazd': { lat: 31.90, lng: 54.37 },
  'birjand': { lat: 32.87, lng: 59.22 },
  'zahedan': { lat: 29.50, lng: 60.86 },
  'sistan': { lat: 27.50, lng: 62.00 },
  'khuzestan': { lat: 31.32, lng: 48.67 },
};

const STRIKE_KEYWORDS = /\b(strike|struck|hit|bomb|attack|missile|drone|raid|target|destroy|blast|explosi)\w*\b/i;
const IRAN_KEYWORDS = /\b(iran|iranian|tehran|isfahan|natanz|fordow|bushehr|parchin|khojir|irgc|revolutionary guard)\b/i;
const CONFIRM_KEYWORDS = /\b(confirm|report|kill|dead|died|death|casualt|destroy|damage|struck|hit|target)\w*\b/i;

const FEEDS = [
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://feeds.washingtonpost.com/rss/world',
  'https://rss.app/feeds/v1.1/tFnGReFbiVMuYN3q.xml',
];

module.exports = async function scrapeStrikes() {
  const strikes = [];

  const results = await Promise.allSettled(
    FEEDS.map(url => parser.parseURL(url).catch(() => ({ items: [] })))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const items = result.value.items || [];

    for (const item of items.slice(0, 20)) {
      const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`;
      const lower = text.toLowerCase();

      // Must mention Iran AND a strike/attack AND confirmation
      if (!IRAN_KEYWORDS.test(lower)) continue;
      if (!STRIKE_KEYWORDS.test(lower)) continue;
      if (!CONFIRM_KEYWORDS.test(lower)) continue;

      // Find the most specific location mentioned
      let bestLoc = null;
      let bestName = '';
      for (const [place, coords] of Object.entries(IRAN_LOCATIONS)) {
        if (lower.includes(place) && place !== 'iran') {
          bestLoc = coords;
          bestName = place.charAt(0).toUpperCase() + place.slice(1);
          break;
        }
      }

      // Fallback to generic Iran if specific location not found
      if (!bestLoc && IRAN_KEYWORDS.test(lower)) {
        // Try to find any Iran city mentioned
        for (const [place, coords] of Object.entries(IRAN_LOCATIONS)) {
          if (lower.includes(place)) {
            bestLoc = coords;
            bestName = place.charAt(0).toUpperCase() + place.slice(1);
            break;
          }
        }
      }

      if (!bestLoc) continue;

      // Extract fatality count if mentioned
      let fatalities = 0;
      const fatMatch = lower.match(/(\d+)\s*(?:killed|dead|died|casualties)/);
      if (fatMatch) fatalities = parseInt(fatMatch[1]);

      strikes.push({
        id: `strike-${Buffer.from(item.link || item.title || '').toString('base64').slice(0, 16)}`,
        name: bestName,
        lat: bestLoc.lat + (Math.random() - 0.5) * 0.05,
        lng: bestLoc.lng + (Math.random() - 0.5) * 0.05,
        date: item.isoDate ? item.isoDate.split('T')[0] : new Date().toISOString().split('T')[0],
        desc: text.slice(0, 300),
        source: item.link || 'RSS',
        title: item.title || '',
        fatalities
      });
    }
  }

  // Also check GDELT for Iran strike reports
  try {
    const fetch = require('node-fetch');
    const query = encodeURIComponent('iran strike OR attack OR bomb OR missile OR killed OR destroyed');
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=7d&maxpoints=20`;
    const response = await fetch(url, { timeout: 15000 });
    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.features) {
          for (const f of data.features) {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const lat = coords[1];
            const lng = coords[0];
            const name = props.name || '';

            // Check if this is in Iran (rough bounding box)
            if (lat < 25 || lat > 40 || lng < 44 || lng > 63.5) continue;
            if (!/strike|attack|bomb|kill|destroy|missile|hit/i.test(name)) continue;

            strikes.push({
              id: `gdelt-strike-${props.urlpubtimeseq || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: findNearestCity(lat, lng),
              lat,
              lng,
              date: props.dateadded ? formatGdeltDate(props.dateadded) : new Date().toISOString().split('T')[0],
              desc: name.slice(0, 300),
              source: props.url || 'GDELT',
              title: name,
              fatalities: 0
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Deduplicate by proximity
  const deduped = [];
  const seen = new Set();
  for (const s of strikes) {
    const key = `${Math.round(s.lat * 5)}:${Math.round(s.lng * 5)}:${s.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }

  return deduped;
};

function findNearestCity(lat, lng) {
  let nearest = 'Iran';
  let minDist = Infinity;
  for (const [place, coords] of Object.entries(IRAN_LOCATIONS)) {
    if (place === 'iran') continue;
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = place.charAt(0).toUpperCase() + place.slice(1);
    }
  }
  return nearest;
}

function formatGdeltDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return new Date().toISOString().split('T')[0];
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
