const RSSParser = require('rss-parser');
const parser = new RSSParser();

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC' },
  { url: 'https://rss.app/feeds/v1.1/tFnGReFbiVMuYN3q.xml', source: 'Reuters' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.washingtonpost.com/rss/world', source: 'Washington Post' },
  { url: 'https://news.google.com/rss/search?q=iran+war+OR+attack+OR+strike+OR+bomb&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://www.middleeasteye.net/rss', source: 'Middle East Eye' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya' },
  { url: 'https://www.timesofisrael.com/feed/', source: 'Times of Israel' },
  { url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', source: 'Jerusalem Post' },
  { url: 'https://moxie.foxnews.com/google-publisher/world.xml', source: 'Fox News' },
  { url: 'https://abcnews.go.com/abcnews/internationalheadlines', source: 'ABC News' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/world', source: 'NBC News' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NY Times' },
  { url: 'https://news.google.com/rss/search?q=iran+strike+OR+bomb+OR+attack+OR+military&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
];

const KEYWORDS = [
  'iran', 'tehran', 'persian gulf', 'strait of hormuz', 'irgc',
  'hezbollah', 'houthi', 'yemen', 'iraq', 'syria', 'israel',
  'nuclear', 'sanctions', 'missile', 'drone', 'military',
  'strike', 'attack', 'war', 'conflict', 'pentagon', 'centcom',
  'naval', 'airbase', 'uranium', 'enrichment', 'proxy',
  'middle east', 'gulf', 'hormuz', 'khamenei', 'revolutionary guard',
  'idf', 'netanyahu', 'gaza', 'west bank', 'hamas', 'iron dome',
  'tel aviv', 'jerusalem', 'negev', 'golan', 'mossad', 'shin bet',
  'dimona', 'eilat', 'haifa', 'rafah', 'jenin', 'nablus',
  'palestinian', 'settler', 'kibbutz', 'knesset', 'zionist'
];

// Simple location mapping for geocoding mentions
const LOCATIONS = {
  'tehran': [35.6892, 51.3890],
  'iran': [32.4279, 53.6880],
  'isfahan': [32.6546, 51.6680],
  'baghdad': [33.3152, 44.3661],
  'damascus': [33.5138, 36.2765],
  'beirut': [33.8938, 35.5018],
  'sanaa': [15.3694, 44.1910],
  'riyadh': [24.7136, 46.6753],
  'jerusalem': [31.7683, 35.2137],
  'tel aviv': [32.0853, 34.7818],
  'strait of hormuz': [26.5667, 56.2500],
  'persian gulf': [26.0000, 52.0000],
  'red sea': [20.0000, 38.0000],
  'aden': [12.7855, 45.0187],
  'basra': [30.5085, 47.7804],
  'tabriz': [38.0800, 46.2919],
  'shiraz': [29.5918, 52.5837],
  'natanz': [33.5114, 51.7267],
  'fordow': [34.8800, 51.5900],
  'bushehr': [28.9684, 50.8385],
  'bandar abbas': [27.1865, 56.2808],
  'gaza': [31.3547, 34.3088],
  'rafah': [31.2969, 34.2455],
  'west bank': [31.9474, 35.2272],
  'jenin': [32.4607, 35.3027],
  'nablus': [32.2211, 35.2544],
  'haifa': [32.7940, 34.9896],
  'eilat': [29.5577, 34.9519],
  'golan': [33.0000, 35.7500],
  'dimona': [31.0700, 35.2100],
  'negev': [30.8500, 34.7500],
  'mosul': [36.3350, 43.1189],
  'aleppo': [36.2021, 37.1343],
  'kabul': [34.5553, 69.2075],
  'doha': [25.2854, 51.5310],
  'dubai': [25.2048, 55.2708],
  'ankara': [39.9334, 32.8597],
  'cairo': [30.0444, 31.2357],
};

function findLocation(text) {
  const lower = text.toLowerCase();
  for (const [place, coords] of Object.entries(LOCATIONS)) {
    if (lower.includes(place)) {
      return { name: place, lat: coords[0], lng: coords[1] };
    }
  }
  return null;
}

function getSeverity(text) {
  const lower = text.toLowerCase();
  if (/strike|attack|bomb|explosion|killed|casualties|war\b|invasion|dead\b|death|died|assassinat|supreme leader|khamenei.*dead|regime.*fall/.test(lower)) return 'critical';
  if (/missile|drone|military|nuclear|weapon|sanction|threat|airstrike|retaliat|offensive|mobiliz/.test(lower)) return 'high';
  if (/tension|deploy|warning|protest|clash|breaking|urgent|confirm/.test(lower)) return 'medium';
  return 'low';
}

module.exports = async function scrapeNews() {
  const articles = [];

  const results = await Promise.allSettled(
    FEEDS.map(feed => {
      // Wrap each feed in a timeout so one slow feed doesn't block all
      return Promise.race([
        parser.parseURL(feed.url).then(parsed => ({ ...feed, items: parsed.items || [] })),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Feed timeout')), 8000))
      ]);
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { source, items } = result.value;

    for (const item of items.slice(0, 20)) {
      // Skip articles older than 48 hours
      if (item.isoDate) {
        const age = Date.now() - new Date(item.isoDate).getTime();
        if (age > 48 * 60 * 60 * 1000) continue;
      }

      const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase();
      const matches = KEYWORDS.some(kw => text.includes(kw));
      if (!matches) continue;

      const location = findLocation(text);
      articles.push({
        id: Buffer.from(item.link || item.title || '').toString('base64').slice(0, 20),
        title: item.title,
        summary: (item.contentSnippet || '').slice(0, 200),
        source,
        url: item.link,
        timestamp: item.isoDate || new Date().toISOString(),
        severity: getSeverity(text),
        location
      });
    }
  }

  // Sort by date, newest first
  articles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return articles.slice(0, 80);
};
