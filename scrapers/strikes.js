const RSSParser = require('rss-parser');
const fetch = require('node-fetch');
const parser = new RSSParser();

// Comprehensive Iranian military/nuclear sites, cities, and strategic facilities
const IRAN_TARGETS = {
  // Nuclear facilities
  'natanz': { lat: 33.51, lng: 51.73, type: 'nuclear' },
  'fordow': { lat: 34.88, lng: 51.59, type: 'nuclear' },
  'bushehr nuclear': { lat: 28.83, lng: 50.89, type: 'nuclear' },
  'arak heavy water': { lat: 34.05, lng: 49.25, type: 'nuclear' },
  'isfahan nuclear': { lat: 32.60, lng: 51.72, type: 'nuclear' },
  'uranium conversion facility': { lat: 32.60, lng: 51.72, type: 'nuclear' },
  'enrichment facility': { lat: 33.51, lng: 51.73, type: 'nuclear' },

  // Military bases and complexes
  'parchin': { lat: 35.52, lng: 51.77, type: 'military' },
  'khojir': { lat: 35.58, lng: 51.66, type: 'military' },
  'imam ali base': { lat: 34.55, lng: 45.75, type: 'military' },
  'khatam al-anbiya': { lat: 35.70, lng: 51.35, type: 'military' },
  'shahid bakeri': { lat: 34.31, lng: 47.06, type: 'military' },
  'havadarya': { lat: 27.16, lng: 56.17, type: 'military' },
  'jask': { lat: 25.64, lng: 57.77, type: 'military' },
  'konarak': { lat: 25.35, lng: 60.38, type: 'military' },
  'mehrabad': { lat: 35.69, lng: 51.31, type: 'military' },
  'shahid nojeh': { lat: 34.87, lng: 48.65, type: 'military' },
  'isfahan air base': { lat: 32.75, lng: 51.86, type: 'military' },
  'tactical air base': { lat: 32.75, lng: 51.86, type: 'military' },
  'omidiyeh': { lat: 30.83, lng: 49.53, type: 'military' },
  'vahdati': { lat: 32.43, lng: 48.38, type: 'military' },
  'shahrokhi': { lat: 34.87, lng: 48.65, type: 'military' },

  // Missile sites
  'shahroud': { lat: 36.42, lng: 55.02, type: 'missile' },
  'semnan missile': { lat: 35.23, lng: 53.55, type: 'missile' },
  'shahrud missile': { lat: 36.42, lng: 55.02, type: 'missile' },
  'missile site': { lat: 35.52, lng: 51.77, type: 'missile' },
  'launch site': { lat: 35.23, lng: 53.55, type: 'missile' },
  'tabriz missile': { lat: 38.08, lng: 46.29, type: 'missile' },

  // IRGC and naval
  'bandar abbas': { lat: 27.19, lng: 56.28, type: 'naval' },
  'bandar-e jask': { lat: 25.64, lng: 57.77, type: 'naval' },
  'chahbahar': { lat: 25.30, lng: 60.63, type: 'naval' },
  'chabahar': { lat: 25.30, lng: 60.63, type: 'naval' },
  'strait of hormuz': { lat: 26.57, lng: 56.25, type: 'naval' },
  'hormuz': { lat: 26.57, lng: 56.25, type: 'naval' },
  'kharg island': { lat: 29.23, lng: 50.31, type: 'naval' },
  'larak island': { lat: 26.86, lng: 56.36, type: 'naval' },
  'abu musa': { lat: 25.87, lng: 55.03, type: 'naval' },
  'farsi island': { lat: 27.17, lng: 53.12, type: 'naval' },
  'qeshm': { lat: 26.95, lng: 56.27, type: 'naval' },

  // Major cities
  'tehran': { lat: 35.69, lng: 51.39, type: 'city' },
  'isfahan': { lat: 32.65, lng: 51.68, type: 'city' },
  'bushehr': { lat: 28.97, lng: 50.84, type: 'city' },
  'shiraz': { lat: 29.59, lng: 52.58, type: 'city' },
  'tabriz': { lat: 38.08, lng: 46.29, type: 'city' },
  'dezful': { lat: 32.43, lng: 48.38, type: 'city' },
  'ahvaz': { lat: 31.32, lng: 48.67, type: 'city' },
  'kermanshah': { lat: 34.31, lng: 47.06, type: 'city' },
  'ilam': { lat: 33.64, lng: 46.42, type: 'city' },
  'hamadan': { lat: 34.80, lng: 48.51, type: 'city' },
  'arak': { lat: 34.09, lng: 49.69, type: 'city' },
  'mashhad': { lat: 36.30, lng: 59.60, type: 'city' },
  'qom': { lat: 34.64, lng: 50.88, type: 'city' },
  'semnan': { lat: 35.57, lng: 53.40, type: 'city' },
  'abadan': { lat: 30.34, lng: 48.30, type: 'city' },
  'kerman': { lat: 30.28, lng: 57.08, type: 'city' },
  'karaj': { lat: 35.84, lng: 50.97, type: 'city' },
  'rasht': { lat: 37.28, lng: 49.58, type: 'city' },
  'yazd': { lat: 31.90, lng: 54.37, type: 'city' },
  'khorramabad': { lat: 33.49, lng: 48.35, type: 'city' },
  'sanandaj': { lat: 35.31, lng: 47.00, type: 'city' },
  'birjand': { lat: 32.87, lng: 59.22, type: 'city' },
  'zahedan': { lat: 29.50, lng: 60.86, type: 'city' },
  'gorgan': { lat: 36.84, lng: 54.44, type: 'city' },
  'sari': { lat: 36.56, lng: 53.06, type: 'city' },
  'urmia': { lat: 37.55, lng: 45.08, type: 'city' },
  'ardabil': { lat: 38.25, lng: 48.30, type: 'city' },
  'zanjan': { lat: 36.67, lng: 48.50, type: 'city' },
  'kish island': { lat: 26.54, lng: 53.98, type: 'city' },
  'mahshahr': { lat: 30.56, lng: 49.19, type: 'city' },
  'khuzestan': { lat: 31.32, lng: 48.67, type: 'city' },
};

// These phrases indicate an actual strike ON Iran, not Iran doing something
const STRIKE_ON_IRAN_PATTERNS = [
  /(?:strike|struck|hit|bomb|attack|target|raid)\w*\s+(?:on|in|inside|within|against|near)\s+iran/i,
  /iran\w*\s+(?:struck|hit|bombed|attacked|targeted|raided)/i,
  /(?:israel|idf|us|u\.s\.|american|coalition|military)\s+(?:strike|attack|bomb|hit|raid|launch)\w*\s+(?:iran|tehran|isfahan|natanz|parchin|fordow|tabriz|shiraz|bushehr|mashhad|ahvaz|bandar abbas|qom|arak|kerman)/i,
  /(?:explosion|blast|damage|destroyed|crater)\w*\s+(?:in|at|near|reported)\s+(?:iran|tehran|isfahan|natanz|parchin|fordow|bushehr|tabriz|shiraz|mashhad|ahvaz|bandar abbas|qom|arak|kerman|dezful|hamadan|karaj|semnan|khuzestan)/i,
  /(?:strike|attack|bomb|airstrike|missile)\w*\s+(?:iran\w*\s+)?(?:military|nuclear|missile|air defense|radar|base|facility|site|installation|command|center|bunker|port)/i,
  /(?:iran|iranian)\s+(?:site|base|facility|installation|target|position|command)\s+(?:struck|hit|destroyed|damaged|targeted|neutralized)/i,
  /(?:bomb|airstrike|missile|cruise missile|bunker buster|sortie)\w*\s+(?:hit|struck|landed|impacted|destroyed)\s+(?:in|near|at)\s+(?:iran|tehran|isfahan)/i,
  /(?:preemptive|retaliatory|massive|precision)\s+(?:strike|attack|bombing|operation)\s+(?:on|against|in|inside)\s+iran/i,
  /iran\w*\s+(?:under\s+(?:attack|fire|bombardment)|being\s+(?:bombed|struck|attacked))/i,
  /(?:military\s+strikes|airstrikes|bombing\s+campaign|operations)\s+(?:on|in|against|inside|targeting)\s+iran/i,
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
  'https://news.google.com/rss/search?q=iran+bomb+OR+airstrike+OR+missile+OR+explosion+location&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22iran+strike%22+city+OR+site+OR+facility+OR+base&hl=en-US&gl=US&ceid=US:en',
  'https://abcnews.go.com/abcnews/internationalheadlines',
  'https://moxie.foxnews.com/google-publisher/world.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml',
  'https://feeds.nbcnews.com/nbcnews/public/world',
  'https://www.middleeasteye.net/rss',
  'https://www.timesofisrael.com/feed/',
  'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
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

      // Must match strike ON Iran pattern OR contain military strike word + Iranian location
      const isStrikeOnIran = STRIKE_ON_IRAN_PATTERNS.some(p => p.test(text));
      const hasStrikeWord = /strike|struck|hit|bomb|airstrike|missile|explosion|blast|destroyed|raid/i.test(text);
      const hasIranRef = /iran|tehran|isfahan|natanz|fordow|parchin|tabriz|shiraz|bushehr|mashhad|ahvaz|bandar abbas|qom|arak|kerman|dezful|hamadan|karaj|semnan|khuzestan/i.test(lower);
      if (!isStrikeOnIran && !(hasStrikeWord && hasIranRef)) continue;

      // Reject if Iran is the one doing the attacking (only if not explicit strike-on-iran pattern)
      const iranIsActor = IRAN_AS_ACTOR_PATTERNS.some(p => p.test(text));
      if (iranIsActor && !isStrikeOnIran) continue;

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

  // Source 3: Direct news page scraping for live updates with location mentions
  const LIVE_PAGES = [
    'https://news.google.com/rss/search?q=iran+strike+location+city+site&hl=en-US&gl=US&ceid=US:en&num=20',
    'https://news.google.com/rss/search?q=%22iran%22+%22struck%22+OR+%22bombed%22+OR+%22hit%22+OR+%22explosion%22&hl=en-US&gl=US&ceid=US:en&num=20',
  ];

  try {
    const liveResults = await Promise.allSettled(
      LIVE_PAGES.map(url => parser.parseURL(url).catch(() => ({ items: [] })))
    );
    for (const result of liveResults) {
      if (result.status !== 'fulfilled') continue;
      const items = result.value.items || [];
      for (const item of items.slice(0, 30)) {
        if (item.isoDate) {
          const age = Date.now() - new Date(item.isoDate).getTime();
          if (age > 24 * 60 * 60 * 1000) continue;
        }
        const title = item.title || '';
        const snippet = item.contentSnippet || item.content || '';
        const text = `${title} ${snippet}`;
        const lower = text.toLowerCase();

        // Look for ANY Iranian city/site mentioned alongside strike language
        const hasStrikeWord = /strike|struck|hit|bomb|attack|airstrike|missile|explosion|blast|destroyed|damaged|target/i.test(text);
        if (!hasStrikeWord) continue;

        // Find all matching locations in this article
        for (const [place, coords] of Object.entries(IRAN_TARGETS)) {
          if (lower.includes(place)) {
            // Reject Iran-as-actor
            if (IRAN_AS_ACTOR_PATTERNS.some(p => p.test(text))) break;

            let fatalities = 0;
            const fatMatch = lower.match(/(\d+)\s*(?:killed|dead|died|casualties)/);
            if (fatMatch) fatalities = Math.min(parseInt(fatMatch[1]), 9999);

            strikes.push({
              id: `live-${Buffer.from(item.link || title).toString('base64').slice(0, 16)}-${place}`,
              name: place.charAt(0).toUpperCase() + place.slice(1),
              lat: coords.lat + (Math.random() - 0.5) * 0.02,
              lng: coords.lng + (Math.random() - 0.5) * 0.02,
              date: item.isoDate ? item.isoDate.split('T')[0] : new Date().toISOString().split('T')[0],
              desc: title.slice(0, 300),
              source: item.link || 'Live Updates',
              title: title,
              fatalities,
              targetType: coords.type || 'unknown'
            });
          }
        }
      }
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
