const RSSParser = require('rss-parser');
const fetch = require('node-fetch');
const parser = new RSSParser();

// Only specific Iranian military/nuclear sites and cities - NO generic "iran" entry
const IRAN_TARGETS = {
  'tehran': { lat: 35.69, lng: 51.39 },
  'isfahan': { lat: 32.65, lng: 51.68 },
  'natanz': { lat: 33.51, lng: 51.73 },
  'fordow': { lat: 34.88, lng: 51.59 },
  'bushehr': { lat: 28.97, lng: 50.84 },
  'shiraz': { lat: 29.59, lng: 52.58 },
  'tabriz': { lat: 38.08, lng: 46.29 },
  'parchin': { lat: 35.52, lng: 51.77 },
  'khojir': { lat: 35.58, lng: 51.66 },
  'shahroud': { lat: 36.42, lng: 55.02 },
  'bandar abbas': { lat: 27.19, lng: 56.28 },
  'dezful': { lat: 32.43, lng: 48.38 },
  'ahvaz': { lat: 31.32, lng: 48.67 },
  'kermanshah': { lat: 34.31, lng: 47.06 },
  'ilam': { lat: 33.64, lng: 46.42 },
  'hamadan': { lat: 34.80, lng: 48.51 },
  'arak': { lat: 34.09, lng: 49.69 },
  'mashhad': { lat: 36.30, lng: 59.60 },
  'qom': { lat: 34.64, lng: 50.88 },
  'chabahar': { lat: 25.30, lng: 60.63 },
  'semnan': { lat: 35.57, lng: 53.40 },
  'abadan': { lat: 30.34, lng: 48.30 },
  'kerman': { lat: 30.28, lng: 57.08 },
};

// These phrases indicate an actual strike ON Iran, not Iran doing something
const STRIKE_ON_IRAN_PATTERNS = [
  /(?:strike|struck|hit|bomb|attack|target|raid)\w*\s+(?:on|in|inside|within|against|near)\s+iran/i,
  /iran\w*\s+(?:struck|hit|bombed|attacked|targeted|raided)/i,
  /(?:israel|idf|us|american|coalition)\s+(?:strike|attack|bomb|hit|raid)\w*\s+(?:iran|tehran|isfahan|natanz|parchin|fordow)/i,
  /(?:explosion|blast|damage)\w*\s+(?:in|at|near)\s+(?:iran|tehran|isfahan|natanz|parchin|fordow|bushehr|tabriz)/i,
  /(?:strike|attack|bomb)\w*\s+(?:iran\w*\s+)?(?:military|nuclear|missile|air defense|radar|base|facility|site)/i,
  /(?:iran|iranian)\s+(?:site|base|facility|installation)\s+(?:struck|hit|destroyed|damaged|targeted)/i,
];

// These phrases mean Iran is the ACTOR not the TARGET - reject these
const IRAN_AS_ACTOR_PATTERNS = [
  /iran\w*\s+(?:attack|strike|bomb|launch|fire|hit)\w*\s+(?:israel|us|base|ship|force)/i,
  /iran\w*\s+(?:threat|warn|vow|promise|retaliat)/i,
  /iran\w*\s+(?:sanction|nuclear deal|negotiat|diplomac)/i,
  /iran\w*\s+(?:proxy|militia|support|fund|back)/i,
  /(?:houthi|hezbollah|hamas)\s+(?:attack|strike|launch)/i,
];

const FEEDS = [
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://feeds.washingtonpost.com/rss/world',
  'https://rss.app/feeds/v1.1/tFnGReFbiVMuYN3q.xml',
  'https://news.google.com/rss/search?q=%22strike+on+iran%22+OR+%22attacked+iran%22+OR+%22bombed+iran%22&hl=en-US&gl=US&ceid=US:en',
];

module.exports = async function scrapeStrikes() {
  const strikes = [];

  // Source 1: RSS feeds with tight filtering
  const results = await Promise.allSettled(
    FEEDS.map(url => parser.parseURL(url).catch(() => ({ items: [] })))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const items = result.value.items || [];

    for (const item of items.slice(0, 25)) {
      // Only last 24 hours
      if (item.isoDate) {
        const age = Date.now() - new Date(item.isoDate).getTime();
        if (age > 24 * 60 * 60 * 1000) continue;
      }

      const title = item.title || '';
      const snippet = item.contentSnippet || item.content || '';
      const text = `${title} ${snippet}`;
      const lower = text.toLowerCase();

      // Must match at least one "strike ON Iran" pattern
      const isStrikeOnIran = STRIKE_ON_IRAN_PATTERNS.some(p => p.test(text));
      if (!isStrikeOnIran) continue;

      // Reject if Iran is the one doing the attacking
      const iranIsActor = IRAN_AS_ACTOR_PATTERNS.some(p => p.test(text));
      if (iranIsActor) continue;

      // Find specific location - must be a real Iranian site, not generic
      let bestLoc = null;
      let bestName = '';
      for (const [place, coords] of Object.entries(IRAN_TARGETS)) {
        if (lower.includes(place)) {
          bestLoc = coords;
          bestName = place.charAt(0).toUpperCase() + place.slice(1);
          break; // take first (most specific) match
        }
      }

      // If no specific location found but article clearly says "strike on Iran"
      // skip it - we don't want a random dot in the middle of the country
      if (!bestLoc) continue;

      let fatalities = 0;
      const fatMatch = lower.match(/(\d+)\s*(?:killed|dead|died|casualties)/);
      if (fatMatch) fatalities = Math.min(parseInt(fatMatch[1]), 9999);

      strikes.push({
        id: `strike-${Buffer.from(item.link || title).toString('base64').slice(0, 16)}`,
        name: bestName,
        lat: bestLoc.lat + (Math.random() - 0.5) * 0.03,
        lng: bestLoc.lng + (Math.random() - 0.5) * 0.03,
        date: item.isoDate ? item.isoDate.split('T')[0] : new Date().toISOString().split('T')[0],
        desc: title.slice(0, 300),
        source: item.link || 'RSS',
        title: title,
        fatalities
      });
    }
  }

  // Source 2: GDELT - also with tight Iran bounding box + strike-on-Iran language
  try {
    const query = encodeURIComponent('"strike on iran" OR "attacked iran" OR "bombed iran" OR "hit iran" OR "struck iran"');
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=1d&maxpoints=15`;
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
            const name = (props.name || '').toLowerCase();

            // Must be inside Iran bounding box
            if (lat < 25 || lat > 40 || lng < 44 || lng > 63.5) continue;

            // Must contain actual strike language directed at Iran
            const isStrike = STRIKE_ON_IRAN_PATTERNS.some(p => p.test(props.name || ''));
            const hasStrikeWords = /struck|bombed|hit|destroyed|damaged|targeted/.test(name);
            if (!isStrike && !hasStrikeWords) continue;

            // Reject Iran-as-actor
            if (IRAN_AS_ACTOR_PATTERNS.some(p => p.test(props.name || ''))) continue;

            const cityName = findNearestCity(lat, lng);

            strikes.push({
              id: `gdelt-strike-${props.urlpubtimeseq || Date.now()}`,
              name: cityName,
              lat,
              lng,
              date: props.dateadded ? formatGdeltDate(props.dateadded) : new Date().toISOString().split('T')[0],
              desc: (props.name || '').slice(0, 300),
              source: props.url || 'GDELT',
              title: (props.name || '').slice(0, 200),
              fatalities: 0
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Deduplicate by proximity + date
  const deduped = [];
  const seen = new Set();
  for (const s of strikes) {
    const key = `${Math.round(s.lat * 5)}:${Math.round(s.lng * 5)}:${s.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }

  console.log(`[strikes] ${deduped.length} confirmed strikes on Iran detected`);
  return deduped;
};

function findNearestCity(lat, lng) {
  let nearest = 'Unknown Site';
  let minDist = Infinity;
  for (const [place, coords] of Object.entries(IRAN_TARGETS)) {
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
