const RSSParser = require('rss-parser');
const fetch = require('node-fetch');
const parser = new RSSParser();

// Full theater targets: Iran + Israel + Lebanon + Syria + Iraq + Yemen
const IRAN_TARGETS = {
  // === IRAN - Nuclear facilities ===
  'natanz': { lat: 33.51, lng: 51.73, type: 'nuclear' },
  'fordow': { lat: 34.88, lng: 51.59, type: 'nuclear' },
  'bushehr nuclear': { lat: 28.83, lng: 50.89, type: 'nuclear' },
  'arak heavy water': { lat: 34.05, lng: 49.25, type: 'nuclear' },
  'isfahan nuclear': { lat: 32.60, lng: 51.72, type: 'nuclear' },
  'uranium conversion facility': { lat: 32.60, lng: 51.72, type: 'nuclear' },
  'enrichment facility': { lat: 33.51, lng: 51.73, type: 'nuclear' },

  // Iran - Military bases
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

  // Iran - Missile sites
  'shahroud': { lat: 36.42, lng: 55.02, type: 'missile' },
  'semnan missile': { lat: 35.23, lng: 53.55, type: 'missile' },
  'shahrud missile': { lat: 36.42, lng: 55.02, type: 'missile' },
  'tabriz missile': { lat: 38.08, lng: 46.29, type: 'missile' },

  // Iran - Naval
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

  // Iran - Cities
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

  // === ISRAEL - Cities ===
  'tel aviv': { lat: 32.08, lng: 34.78, type: 'city' },
  'jerusalem': { lat: 31.77, lng: 35.23, type: 'city' },
  'haifa': { lat: 32.79, lng: 34.99, type: 'city' },
  'beer sheva': { lat: 31.25, lng: 34.79, type: 'city' },
  'be\'er sheva': { lat: 31.25, lng: 34.79, type: 'city' },
  'beersheba': { lat: 31.25, lng: 34.79, type: 'city' },
  'ashkelon': { lat: 31.67, lng: 34.57, type: 'city' },
  'ashdod': { lat: 31.80, lng: 34.65, type: 'city' },
  'netanya': { lat: 32.33, lng: 34.86, type: 'city' },
  'herzliya': { lat: 32.16, lng: 34.78, type: 'city' },
  'eilat': { lat: 29.56, lng: 34.95, type: 'city' },
  'sderot': { lat: 31.52, lng: 34.60, type: 'city' },
  'kiryat shmona': { lat: 33.21, lng: 35.57, type: 'city' },
  'nahariya': { lat: 33.01, lng: 35.10, type: 'city' },
  'dimona': { lat: 31.07, lng: 35.03, type: 'nuclear' },
  'rishon lezion': { lat: 31.97, lng: 34.77, type: 'city' },
  'petah tikva': { lat: 32.09, lng: 34.89, type: 'city' },
  'rehovot': { lat: 31.89, lng: 34.81, type: 'city' },
  'modiin': { lat: 31.90, lng: 35.01, type: 'city' },
  'tiberias': { lat: 32.79, lng: 35.53, type: 'city' },
  'nazareth': { lat: 32.70, lng: 35.30, type: 'city' },
  'acre': { lat: 32.93, lng: 35.08, type: 'city' },

  // Israel - Military / Strategic
  'nevatim': { lat: 31.21, lng: 34.93, type: 'military' },
  'ramon airbase': { lat: 30.78, lng: 34.67, type: 'military' },
  'ramat david': { lat: 32.67, lng: 35.18, type: 'military' },
  'hatzerim': { lat: 31.23, lng: 34.66, type: 'military' },
  'palmachim': { lat: 31.90, lng: 34.69, type: 'military' },
  'tel nof': { lat: 31.84, lng: 34.82, type: 'military' },
  'negev': { lat: 30.85, lng: 34.78, type: 'military' },
  'golan heights': { lat: 33.00, lng: 35.75, type: 'military' },
  'golan': { lat: 33.00, lng: 35.75, type: 'military' },
  'west bank': { lat: 31.95, lng: 35.25, type: 'city' },
  'gaza': { lat: 31.50, lng: 34.47, type: 'city' },

  // === LEBANON ===
  'beirut': { lat: 33.89, lng: 35.50, type: 'city' },
  'dahiyeh': { lat: 33.85, lng: 35.49, type: 'military' },
  'baalbek': { lat: 34.01, lng: 36.21, type: 'military' },
  'sidon': { lat: 33.56, lng: 35.37, type: 'city' },
  'tyre': { lat: 33.27, lng: 35.20, type: 'city' },
  'nabatieh': { lat: 33.38, lng: 35.48, type: 'city' },
  'bekaa': { lat: 33.85, lng: 35.90, type: 'military' },
  'south lebanon': { lat: 33.30, lng: 35.40, type: 'military' },

  // === SYRIA ===
  'damascus': { lat: 33.51, lng: 36.29, type: 'city' },
  'aleppo': { lat: 36.20, lng: 37.17, type: 'city' },
  'homs': { lat: 34.73, lng: 36.71, type: 'city' },
  'latakia': { lat: 35.52, lng: 35.79, type: 'city' },
  'deir ez-zor': { lat: 35.34, lng: 40.14, type: 'city' },
  'palmyra': { lat: 34.56, lng: 38.28, type: 'city' },
  't4 airbase': { lat: 34.52, lng: 37.63, type: 'military' },

  // === IRAQ ===
  'baghdad': { lat: 33.31, lng: 44.37, type: 'city' },
  'erbil': { lat: 36.19, lng: 44.01, type: 'city' },
  'al asad': { lat: 33.79, lng: 42.44, type: 'military' },
  'ain al-asad': { lat: 33.79, lng: 42.44, type: 'military' },
  'basra': { lat: 30.51, lng: 47.81, type: 'city' },

  // === YEMEN ===
  'sanaa': { lat: 15.37, lng: 44.19, type: 'city' },
  'hodeidah': { lat: 14.80, lng: 42.95, type: 'city' },
  'aden': { lat: 12.79, lng: 45.02, type: 'city' },
  'marib': { lat: 15.46, lng: 45.33, type: 'city' },
};

// Patterns indicating CONFIRMED actual strikes (past tense, reporting events that happened)
const CONFIRMED_STRIKE_PATTERNS = [
  /(?:struck|hit|bombed|attacked|shelled|destroyed|damaged)\s+(?:in|at|near)\s+/i,
  /explosion\w*\s+(?:reported|heard|in|at|near|rocked|shook)/i,
  /(?:sirens?|red alert)\s+(?:sound|heard|activated|blaring)\s+(?:in|across)/i,
  /(?:iron dome|arrow|thaad)\s+intercept/i,
  /(?:missile|rocket|drone)\w*\s+(?:hit|struck|landed|impacted|slammed)/i,
  /casualties\s+(?:reported|confirmed)|(?:\d+)\s+(?:killed|dead|wounded|injured)\s+(?:in|after|following)/i,
  /(?:launched|fired)\s+(?:\d+\s+)?(?:missiles?|rockets?|drones?|ballistic)\s+(?:at|toward|into|on)\s+/i,
  /(?:barrage|salvo|wave)\s+(?:of\s+)?(?:missiles?|rockets?)\s+(?:hit|struck|targeted|rained)/i,
  /under\s+(?:attack|fire|bombardment)\s+(?:after|as|from)/i,
];

// REJECT patterns - prediction markets, speculation, analysis, future tense, diplomacy
const FALSE_POSITIVE_PATTERNS = [
  /polymarket|prediction\s*market|betting\s*odds|wagering|gambling/i,
  /\?\s*$/,                                    // Headlines ending in question mark
  /\?\s*[-–—|\.]{3}/,                          // Question marks mid-headline
  /by\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/i,  // "by March 31?"
  /will\s+(?:iran|israel|us|america)\s+(?:strike|attack|bomb|hit)/i,
  /(?:could|would|should|might|may)\s+(?:strike|attack|bomb|hit|target|launch)/i,
  /(?:threat|threaten|warn|vow|pledge|promise)\w*\s+(?:to\s+)?(?:strike|attack|bomb|retaliat)/i,
  /(?:prepare|planning|plan|consider|weigh|debate|discuss)\w*\s+(?:to\s+)?(?:strike|attack)/i,
  /(?:scenario|simulation|exercise|drill|wargame|hypothetical|what.if)/i,
  /(?:sanction|diplomacy|diplomatic|negotiat|ceasefire|peace\s*talk|deal|agreement|treaty)/i,
  /(?:opinion|editorial|analysis|commentary|column|op.ed|podcast|interview|book\s*review)/i,
  /(?:stock|market|oil\s*price|crude|futures|economic|trade\s*war|tariff)/i,
  /(?:history|historical|years?\s*ago|anniversary|commemorat|looking\s*back|timeline\s*of)/i,
  /(?:if\s+(?:iran|israel|us)\s+(?:attack|strike|bomb))/i,
  /(?:risk|likelihood|probability|chance|odds)\s+(?:of\s+)?(?:strike|attack|war)/i,
  /^\s*(?:how|why|what|when|where|who|can|does|is|are|should|would|could|will)\s/i,  // Questions
];

const FEEDS = [
  // General Middle East news
  'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://feeds.washingtonpost.com/rss/world',
  'https://rss.app/feeds/v1.1/tFnGReFbiVMuYN3q.xml',
  'https://abcnews.go.com/abcnews/internationalheadlines',
  'https://moxie.foxnews.com/google-publisher/world.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml',
  'https://feeds.nbcnews.com/nbcnews/public/world',
  'https://www.middleeasteye.net/rss',
  'https://www.timesofisrael.com/feed/',
  'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
  // Iran strikes
  'https://news.google.com/rss/search?q=%22strike+on+iran%22+OR+%22attacked+iran%22+OR+%22bombed+iran%22&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=iran+tehran+OR+isfahan+OR+natanz+strike+OR+bomb+OR+attack&hl=en-US&gl=US&ceid=US:en',
  // Israel strikes / missile attacks on Israel
  'https://news.google.com/rss/search?q=israel+missile+OR+rocket+OR+strike+OR+attack+OR+siren+OR+intercept&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22tel+aviv%22+OR+%22jerusalem%22+OR+%22haifa%22+missile+OR+rocket+OR+attack+OR+siren&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=iran+attack+israel+OR+%22ballistic+missile%22+OR+%22iron+dome%22+OR+%22red+alert%22&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=hezbollah+OR+houthi+attack+OR+missile+OR+rocket+israel&hl=en-US&gl=US&ceid=US:en',
  // Lebanon / Syria / Iraq theater
  'https://news.google.com/rss/search?q=beirut+OR+damascus+OR+baghdad+strike+OR+attack+OR+airstrike+OR+explosion&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=middle+east+war+OR+strike+OR+attack+OR+missile+breaking&hl=en-US&gl=US&ceid=US:en',
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
        if (age > 48 * 60 * 60 * 1000) continue;
      }

      const title = item.title || '';
      const snippet = item.contentSnippet || item.content || '';
      const text = `${title} ${snippet}`;
      const lower = text.toLowerCase();

      // REJECT false positives first (prediction markets, speculation, questions, analysis)
      if (FALSE_POSITIVE_PATTERNS.some(p => p.test(text))) continue;

      // Must match a confirmed strike pattern (past tense, actual events)
      const isConfirmed = CONFIRMED_STRIKE_PATTERNS.some(p => p.test(text));
      const hasTheaterRef = /iran|israel|lebanon|syria|iraq|yemen|tehran|isfahan|natanz|fordow|parchin|tabriz|shiraz|bushehr|tel aviv|jerusalem|haifa|beer sheva|ashkelon|ashdod|eilat|sderot|nevatim|beirut|damascus|baghdad|sanaa|gaza|golan|negev/i.test(lower);
      const isBreaking = /(?:breaking|confirmed|just in)\s*:/i.test(text) && hasTheaterRef;
      if (!isConfirmed && !isBreaking) continue;

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
        date: item.isoDate ? item.isoDate.split('T')[0] : getLocalDate(),
        desc: title.slice(0, 300),
        source: item.link || 'RSS',
        title: title,
        fatalities
      });
    }
  }

  // Source 2: GDELT - full Middle East theater
  try {
    const query = encodeURIComponent('iran OR israel strike OR missile OR attack OR bomb OR rocket');
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=1d&maxpoints=25`;
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

            // Must be inside Middle East theater bounding box (Yemen to Turkey, Egypt to Pakistan)
            if (lat < 12 || lat > 42 || lng < 29 || lng > 63.5) continue;

            // Reject false positives
            if (FALSE_POSITIVE_PATTERNS.some(p => p.test(props.name || ''))) continue;

            // Must contain confirmed strike language
            const isConfirmed = CONFIRMED_STRIKE_PATTERNS.some(p => p.test(props.name || ''));
            const hasStrikeWords = /struck|bombed|hit|destroyed|damaged|targeted|shelled|casualties|killed/.test(name);
            if (!isConfirmed && !hasStrikeWords) continue;

            const cityName = findNearestCity(lat, lng);

            strikes.push({
              id: `gdelt-strike-${props.urlpubtimeseq || Date.now()}`,
              name: cityName,
              lat,
              lng,
              date: props.dateadded ? formatGdeltDate(props.dateadded) : getLocalDate(),
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
    'https://news.google.com/rss/search?q=iran+strike+location+city+site&hl=en-US&gl=US&ceid=US:en&num=30',
    'https://news.google.com/rss/search?q=%22iran%22+%22struck%22+OR+%22bombed%22+OR+%22hit%22+OR+%22explosion%22&hl=en-US&gl=US&ceid=US:en&num=30',
    'https://news.google.com/rss/search?q=israel+missile+OR+rocket+OR+attack+tel+aviv+OR+haifa+OR+jerusalem&hl=en-US&gl=US&ceid=US:en&num=30',
    'https://news.google.com/rss/search?q=%22iron+dome%22+OR+%22red+alert%22+OR+%22sirens%22+israel+attack+OR+missile&hl=en-US&gl=US&ceid=US:en&num=30',
    'https://news.google.com/rss/search?q=iran+OR+hezbollah+OR+houthi+attack+israel+missile+OR+rocket+OR+drone&hl=en-US&gl=US&ceid=US:en&num=30',
    'https://news.google.com/rss/search?q=beirut+OR+lebanon+OR+syria+airstrike+OR+strike+OR+attack+OR+explosion&hl=en-US&gl=US&ceid=US:en&num=30',
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
          if (age > 48 * 60 * 60 * 1000) continue;
        }
        const title = item.title || '';
        const snippet = item.contentSnippet || item.content || '';
        const text = `${title} ${snippet}`;
        const lower = text.toLowerCase();

        // Reject false positives
        if (FALSE_POSITIVE_PATTERNS.some(p => p.test(text))) continue;

        // Must have confirmed strike language
        const isConfirmed = CONFIRMED_STRIKE_PATTERNS.some(p => p.test(text));
        if (!isConfirmed) continue;

        // Find all matching locations in this article
        for (const [place, coords] of Object.entries(IRAN_TARGETS)) {
          if (lower.includes(place)) {

            let fatalities = 0;
            const fatMatch = lower.match(/(\d+)\s*(?:killed|dead|died|casualties)/);
            if (fatMatch) fatalities = Math.min(parseInt(fatMatch[1]), 9999);

            strikes.push({
              id: `live-${Buffer.from(item.link || title).toString('base64').slice(0, 16)}-${place}`,
              name: place.charAt(0).toUpperCase() + place.slice(1),
              lat: coords.lat + (Math.random() - 0.5) * 0.02,
              lng: coords.lng + (Math.random() - 0.5) * 0.02,
              date: item.isoDate ? item.isoDate.split('T')[0] : getLocalDate(),
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
  if (!dateStr || dateStr.length < 8) return getLocalDate();
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

// Use local date to avoid UTC being a day ahead
function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
