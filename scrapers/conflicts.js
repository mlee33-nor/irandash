const fetch = require('node-fetch');

const COUNTRIES = ['Iran', 'Iraq', 'Syria', 'Yemen', 'Lebanon', 'Israel', 'Palestine'];

module.exports = async function scrapeConflicts() {
  const events = [];

  // Source 1: GDELT Event API for conflict/violence events
  try {
    const gdeltEvents = await fetchGdeltConflicts();
    events.push(...gdeltEvents);
  } catch (e) {
    console.error('[conflicts] GDELT error:', e.message);
  }

  // Source 2: ACLED (if available)
  try {
    const acledEvents = await fetchAcled();
    events.push(...acledEvents);
  } catch (e) {
    // ACLED needs API key, expected to fail
  }

  // Source 3: RSS-based conflict detection
  try {
    const rssEvents = await fetchConflictNews();
    events.push(...rssEvents);
  } catch (e) {
    console.error('[conflicts] RSS error:', e.message);
  }

  // Deduplicate by location proximity + similar time
  const deduped = deduplicateEvents(events);

  if (deduped.length > 0) {
    return deduped.slice(0, 60);
  }

  // Fallback only if everything fails
  return generateFallbackData();
};

async function fetchGdeltConflicts() {
  const queries = [
    'iran killed OR died OR death OR attack OR strike OR bomb',
    'israel gaza killed OR attack OR strike OR bomb OR casualties OR school',
    'yemen houthi attack OR strike OR killed',
    'syria iraq attack OR killed OR bomb OR explosion',
    'hezbollah lebanon attack OR strike OR killed',
    'iran leader OR khamenei OR death OR assassination',
    'middle east bomb OR airstrike OR shelling OR missile today',
    'gaza school OR hospital OR shelter OR refugee attack OR bomb'
  ];

  const allEvents = [];

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const query = encodeURIComponent(q);
      // Use 15min timespan first for freshest data, fall back to 1d
      const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=60min&maxpoints=40`;
      const response = await fetch(url, { timeout: 15000 });
      if (!response.ok) return [];
      const text = await response.text();
      if (!text || text.trim().length === 0) return [];
      try {
        const data = JSON.parse(text);
        return data.features || [];
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const f of result.value) {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      const name = props.name || '';
      const url = props.url || '';
      const combined = (name + ' ' + url).toLowerCase();

      // Filter for actual conflict/violence events
      const isConflict = /kill|dead|died|death|attack|strike|bomb|explos|casualt|wound|clash|fight|assault|shoot|shell|rocket|missile|assassinat|war|destroyed/.test(combined);
      if (!isConflict) continue;

      const country = detectCountry(name, coords[1], coords[0]);
      if (!country) continue;

      allEvents.push({
        id: props.urlpubtimeseq || `gdelt-c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: categorizeConflict(combined),
        subtype: extractSubtype(combined),
        country: country,
        location: extractLocation(name) || 'Unknown',
        lat: coords[1],
        lng: coords[0],
        date: props.dateadded ? formatGdeltDate(props.dateadded) : formatDate(new Date()),
        fatalities: estimateFatalities(combined),
        actor1: extractActor(combined, 1),
        actor2: extractActor(combined, 2),
        notes: name.slice(0, 250),
        source: 'GDELT',
        url: props.url || '',
        tone: parseFloat(props.tone) || 0
      });
    }
  }

  // If 60min window returned very few results, also try 1d window
  if (allEvents.length < 5) {
    const fallbackResults = await Promise.allSettled(
      queries.slice(0, 4).map(async (q) => {
        const query = encodeURIComponent(q);
        const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=1d&maxpoints=20`;
        const response = await fetch(url, { timeout: 15000 });
        if (!response.ok) return [];
        const text = await response.text();
        if (!text || text.trim().length === 0) return [];
        try {
          const data = JSON.parse(text);
          return data.features || [];
        } catch {
          return [];
        }
      })
    );

    for (const result of fallbackResults) {
      if (result.status !== 'fulfilled') continue;
      for (const f of result.value) {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const name = props.name || '';
        const url = props.url || '';
        const combined = (name + ' ' + url).toLowerCase();

        const isConflict = /kill|dead|died|death|attack|strike|bomb|explos|casualt|wound|clash|fight|assault|shoot|shell|rocket|missile|assassinat|war|destroyed|school|hospital/.test(combined);
        if (!isConflict) continue;

        const country = detectCountry(name, coords[1], coords[0]);
        if (!country) continue;

        allEvents.push({
          id: props.urlpubtimeseq || `gdelt-c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: categorizeConflict(combined),
          subtype: extractSubtype(combined),
          country: country,
          location: extractLocation(name) || 'Unknown',
          lat: coords[1],
          lng: coords[0],
          date: props.dateadded ? formatGdeltDate(props.dateadded) : formatDate(new Date()),
          fatalities: estimateFatalities(combined),
          actor1: extractActor(combined, 1),
          actor2: extractActor(combined, 2),
          notes: name.slice(0, 250),
          source: 'GDELT',
          url: props.url || '',
          tone: parseFloat(props.tone) || 0
        });
      }
    }
  }

  return allEvents;
}

async function fetchAcled() {
  const country = COUNTRIES.join('|');
  const url = `https://api.acleddata.com/acled/read?terms=accept&limit=50&country=${encodeURIComponent(country)}&event_date=${getDateRange()}&event_date_where=BETWEEN`;

  const response = await fetch(url, { timeout: 15000 });
  if (!response.ok) return [];
  const data = await response.json();
  if (!data.data || data.data.length === 0) return [];

  return data.data.map(e => ({
    id: e.data_id || `acled-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: e.event_type || 'Unknown',
    subtype: e.sub_event_type || '',
    country: e.country || '',
    location: e.location || '',
    lat: parseFloat(e.latitude) || 0,
    lng: parseFloat(e.longitude) || 0,
    date: e.event_date || '',
    fatalities: parseInt(e.fatalities) || 0,
    actor1: e.actor1 || '',
    actor2: e.actor2 || '',
    notes: (e.notes || '').slice(0, 250),
    source: 'ACLED'
  })).filter(e => e.lat !== 0 && e.lng !== 0);
}

async function fetchConflictNews() {
  const RSSParser = require('rss-parser');
  const parser = new RSSParser();
  const events = [];

  const feeds = [
    'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://feeds.washingtonpost.com/rss/world',
    'https://rss.app/feeds/v1.1/tFnGReFbiVMuYN3q.xml',
    'https://news.google.com/rss/search?q=iran+OR+gaza+OR+israel+attack+OR+bomb+OR+killed&hl=en-US&gl=US&ceid=US:en',
  ];

  const conflictKeywords = /kill|dead|died|death|attack|strike|bomb|explos|casualt|wound|clash|shoot|shell|rocket|missile|assassinat|war\b|offensive|raid|school|hospital|shelter|massacre/i;

  const results = await Promise.allSettled(
    feeds.map(url => parser.parseURL(url).catch(() => ({ items: [] })))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const items = result.value.items || [];

    for (const item of items.slice(0, 25)) {
      // Only include articles from the last 24 hours
      const articleDate = item.isoDate ? new Date(item.isoDate) : null;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      if (articleDate && articleDate.getTime() < cutoff) continue;

      const text = `${item.title || ''} ${item.contentSnippet || ''}`;
      if (!conflictKeywords.test(text)) continue;

      const loc = findLocationInText(text.toLowerCase());
      if (!loc) continue;

      events.push({
        id: `rss-c-${Buffer.from(item.link || item.title || '').toString('base64').slice(0, 16)}`,
        type: categorizeConflict(text.toLowerCase()),
        subtype: extractSubtype(text.toLowerCase()),
        country: loc.country,
        location: loc.name,
        lat: loc.lat + (Math.random() - 0.5) * 0.05,
        lng: loc.lng + (Math.random() - 0.5) * 0.05,
        date: item.isoDate ? item.isoDate.split('T')[0] : formatDate(new Date()),
        fatalities: estimateFatalities(text.toLowerCase()),
        actor1: extractActor(text.toLowerCase(), 1),
        actor2: extractActor(text.toLowerCase(), 2),
        notes: text.slice(0, 250),
        source: 'News/RSS',
        url: item.link || ''
      });
    }
  }

  return events;
}

// --- Helper functions ---

const LOCATION_MAP = {
  'tehran': { lat: 35.69, lng: 51.39, country: 'Iran' },
  'isfahan': { lat: 32.65, lng: 51.67, country: 'Iran' },
  'tabriz': { lat: 38.08, lng: 46.29, country: 'Iran' },
  'shiraz': { lat: 29.59, lng: 52.58, country: 'Iran' },
  'mashhad': { lat: 36.30, lng: 59.60, country: 'Iran' },
  'natanz': { lat: 33.51, lng: 51.73, country: 'Iran' },
  'bushehr': { lat: 28.97, lng: 50.84, country: 'Iran' },
  'bandar abbas': { lat: 27.19, lng: 56.28, country: 'Iran' },
  'sistan': { lat: 27.50, lng: 62.00, country: 'Iran' },
  'khuzestan': { lat: 31.32, lng: 48.67, country: 'Iran' },
  'kermanshah': { lat: 34.31, lng: 47.06, country: 'Iran' },
  'qom': { lat: 34.64, lng: 50.88, country: 'Iran' },
  'baghdad': { lat: 33.32, lng: 44.37, country: 'Iraq' },
  'basra': { lat: 30.51, lng: 47.78, country: 'Iraq' },
  'mosul': { lat: 36.34, lng: 43.12, country: 'Iraq' },
  'kirkuk': { lat: 35.47, lng: 44.39, country: 'Iraq' },
  'erbil': { lat: 36.19, lng: 44.01, country: 'Iraq' },
  'damascus': { lat: 33.51, lng: 36.28, country: 'Syria' },
  'aleppo': { lat: 36.20, lng: 37.13, country: 'Syria' },
  'idlib': { lat: 35.93, lng: 36.63, country: 'Syria' },
  'deir ez-zor': { lat: 35.33, lng: 40.14, country: 'Syria' },
  'daraa': { lat: 32.63, lng: 36.10, country: 'Syria' },
  'raqqa': { lat: 35.95, lng: 39.01, country: 'Syria' },
  'homs': { lat: 34.73, lng: 36.71, country: 'Syria' },
  'sanaa': { lat: 15.37, lng: 44.19, country: 'Yemen' },
  'aden': { lat: 12.79, lng: 45.02, country: 'Yemen' },
  'hodeidah': { lat: 14.80, lng: 42.95, country: 'Yemen' },
  'marib': { lat: 15.47, lng: 45.33, country: 'Yemen' },
  'taiz': { lat: 13.58, lng: 44.02, country: 'Yemen' },
  'beirut': { lat: 33.89, lng: 35.50, country: 'Lebanon' },
  'south lebanon': { lat: 33.27, lng: 35.20, country: 'Lebanon' },
  'tyre': { lat: 33.27, lng: 35.20, country: 'Lebanon' },
  'nabatieh': { lat: 33.38, lng: 35.48, country: 'Lebanon' },
  'gaza': { lat: 31.50, lng: 34.47, country: 'Palestine' },
  'rafah': { lat: 31.30, lng: 34.25, country: 'Palestine' },
  'khan younis': { lat: 31.35, lng: 34.30, country: 'Palestine' },
  'jenin': { lat: 32.46, lng: 35.30, country: 'Palestine' },
  'nablus': { lat: 32.22, lng: 35.25, country: 'Palestine' },
  'west bank': { lat: 31.95, lng: 35.23, country: 'Palestine' },
  'tel aviv': { lat: 32.09, lng: 34.78, country: 'Israel' },
  'jerusalem': { lat: 31.77, lng: 35.21, country: 'Israel' },
  'haifa': { lat: 32.79, lng: 34.99, country: 'Israel' },
  'golan': { lat: 33.00, lng: 35.75, country: 'Israel' },
  'negev': { lat: 30.85, lng: 34.75, country: 'Israel' },
};

function findLocationInText(text) {
  for (const [place, info] of Object.entries(LOCATION_MAP)) {
    if (text.includes(place)) {
      return { name: place.charAt(0).toUpperCase() + place.slice(1), ...info };
    }
  }
  return null;
}

function detectCountry(text, lat, lng) {
  const lower = (text || '').toLowerCase();

  // Try text-based detection first
  for (const [place, info] of Object.entries(LOCATION_MAP)) {
    if (lower.includes(place)) return info.country;
  }

  // Country name detection
  const countryPatterns = {
    'Iran': /\biran\b/,
    'Iraq': /\biraq\b/,
    'Syria': /\bsyria\b/,
    'Yemen': /\byemen\b/,
    'Lebanon': /\blebanon\b/,
    'Israel': /\bisrael\b/,
    'Palestine': /\bpalestine\b|\bgaza\b|\bwest bank\b/
  };

  for (const [country, pattern] of Object.entries(countryPatterns)) {
    if (pattern.test(lower)) return country;
  }

  // Geo-based fallback using bounding boxes
  if (lat && lng) {
    if (lat > 25 && lat < 40 && lng > 44 && lng < 63) return 'Iran';
    if (lat > 29 && lat < 37.5 && lng > 38.8 && lng < 48.5) return 'Iraq';
    if (lat > 32 && lat < 37.5 && lng > 35.5 && lng < 42.5) return 'Syria';
    if (lat > 12 && lat < 19 && lng > 42 && lng < 54) return 'Yemen';
    if (lat > 33 && lat < 34.7 && lng > 35 && lng < 36.7) return 'Lebanon';
    if (lat > 29.5 && lat < 33.3 && lng > 34 && lng < 35.9) return 'Israel';
    if (lat > 31 && lat < 32.6 && lng > 34 && lng < 35.6) return 'Palestine';
  }

  return null;
}

function categorizeConflict(text) {
  if (/airstrike|bomb|shell|rocket|missile|drone strike|explos/.test(text)) return 'Explosions/Remote violence';
  if (/battle|fight|clash|offensive|combat|firefight/.test(text)) return 'Battles';
  if (/assassinat|execution|civilian|massacre|terror/.test(text)) return 'Violence against civilians';
  if (/protest|demonstrat|riot|unrest/.test(text)) return 'Protests';
  if (/deal|agreement|ceasefire|withdraw|deploy/.test(text)) return 'Strategic developments';
  if (/kill|dead|died|death|attack|strike|shoot|raid/.test(text)) return 'Battles';
  return 'Violence against civilians';
}

function extractSubtype(text) {
  if (/airstrike|air strike/.test(text)) return 'Air/drone strike';
  if (/rocket|missile/.test(text)) return 'Shelling/artillery/missile';
  if (/bomb|explos|ied/.test(text)) return 'Bombing/IED';
  if (/shoot|gun|snip/.test(text)) return 'Armed clash';
  if (/assassin/.test(text)) return 'Assassination';
  if (/raid/.test(text)) return 'Raid';
  return '';
}

function estimateFatalities(text) {
  // Try to extract actual numbers from text
  const patterns = [
    /(\d+)\s*(?:people\s+)?(?:killed|dead|died|death)/,
    /(?:killed|dead|died)\s*(\d+)/,
    /(\d+)\s*(?:casualties|fatalities)/,
    /at least\s+(\d+)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return Math.min(parseInt(m[1]), 9999);
  }
  // If text mentions death but no number
  if (/killed|dead|died|death|casualties/.test(text)) return 1;
  return 0;
}

function extractActor(text, side) {
  const actors = {
    1: [
      [/\bidf\b|israel\w* (?:military|force|army)/, 'Israeli Forces (IDF)'],
      [/\birgc\b|revolutionary guard/, 'IRGC'],
      [/\bhamas\b/, 'Hamas'],
      [/\bhezbollah\b/, 'Hezbollah'],
      [/\bhouthi\b|ansar allah/, 'Houthi Forces'],
      [/\bisis\b|\bisil\b|islamic state/, 'ISIS'],
      [/\bpkk\b|kurdish militant/, 'PKK'],
      [/\bsdf\b|syrian democratic/, 'SDF'],
      [/\bsaa\b|syrian army|assad/, 'Syrian Armed Forces'],
      [/\bus military\b|pentagon|centcom|american force/, 'US Military'],
      [/\brussian\b|russia/, 'Russian Forces'],
      [/\bturkish\b|turkey|ankara/, 'Turkish Forces'],
      [/iran\w* (?:military|force|army|navy)/, 'Iranian Armed Forces'],
    ],
    2: []
  };

  // For actor1, find first match
  if (side === 1) {
    for (const [pattern, name] of actors[1]) {
      if (pattern.test(text)) return name;
    }
    return 'Unknown';
  }

  // For actor2, find second different match
  let first = null;
  for (const [pattern, name] of actors[1]) {
    if (pattern.test(text)) {
      if (!first) { first = name; continue; }
      if (name !== first) return name;
    }
  }
  return first ? 'Unknown' : '';
}

function extractLocation(name) {
  const loc = findLocationInText((name || '').toLowerCase());
  return loc ? loc.name : null;
}

function formatGdeltDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return formatDate(new Date());
  // GDELT dates: YYYYMMDDHHmmSS
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${y}-${m}-${d}`;
}

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return `${formatDate(start)}|${formatDate(end)}`;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function deduplicateEvents(events) {
  const seen = new Map();
  const result = [];

  for (const e of events) {
    // Key by rough location (rounded to ~10km) + date
    const key = `${Math.round(e.lat * 10)}:${Math.round(e.lng * 10)}:${e.date}:${e.type}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(e);
    }
  }

  // Sort by date descending
  result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return result;
}

function generateFallbackData() {
  const zones = [
    { location: 'Gaza City', country: 'Palestine', lat: 31.50, lng: 34.47, type: 'Explosions/Remote violence' },
    { location: 'Rafah', country: 'Palestine', lat: 31.30, lng: 34.25, type: 'Battles' },
    { location: 'Khan Younis', country: 'Palestine', lat: 31.35, lng: 34.30, type: 'Explosions/Remote violence' },
    { location: 'South Lebanon', country: 'Lebanon', lat: 33.27, lng: 35.20, type: 'Explosions/Remote violence' },
    { location: 'Hodeidah', country: 'Yemen', lat: 14.80, lng: 42.95, type: 'Explosions/Remote violence' },
    { location: 'Idlib', country: 'Syria', lat: 35.93, lng: 36.63, type: 'Battles' },
    { location: 'Deir ez-Zor', country: 'Syria', lat: 35.33, lng: 40.14, type: 'Battles' },
  ];

  const now = new Date();
  return zones.map((z, i) => {
    const date = new Date(now - Math.random() * 3 * 86400000);
    return {
      id: `fallback-${i}`,
      type: z.type,
      subtype: '',
      country: z.country,
      location: z.location,
      lat: z.lat + (Math.random() - 0.5) * 0.1,
      lng: z.lng + (Math.random() - 0.5) * 0.1,
      date: formatDate(date),
      fatalities: 0,
      actor1: 'Unknown',
      actor2: 'Unknown',
      notes: `Ongoing conflict reported in ${z.location}, ${z.country}`,
      source: 'Fallback'
    };
  });
}
